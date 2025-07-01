// js/script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  // ── 0. INIT FIREBASE ────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyDEENPQj618mPtJLvR-QQlVFbbz3KNOpRU",
    authDomain: "blog-website-de482.firebaseapp.com",
    projectId: "blog-website-de482",
    storageBucket: "blog-website-de482.appspot.com",
    messagingSenderId: "1036917472247",
    appId: "1:1036917472247:web:b4ff13edab11d526680cf2",
    measurementId: "G-GHWM78YX25"
  };
  const app      = initializeApp(firebaseConfig);
  const db       = getFirestore(app);
  const auth     = getAuth(app);
  const provider = new GoogleAuthProvider();

  let currentUser = null;
  onAuthStateChanged(auth, user => {
    currentUser = user;
    syncAuthButtons();
  });

  // ── 1. SIGN-IN/OUT BUTTONS ────────────────────────────────────────
  const btnLogin     = document.getElementById("btn-login");
  const btnLogout    = document.getElementById("btn-logout");
  const userGreeting = document.getElementById("user-greeting");

  btnLogin?.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(console.error);
  });
  btnLogout?.addEventListener("click", () => {
    signOut(auth).catch(console.error);
  });

  function syncAuthButtons() {
    if (!btnLogin || !btnLogout || !userGreeting) return;
    if (currentUser) {
      btnLogin.hidden      = true;
      btnLogout.hidden     = false;
      userGreeting.hidden  = false;
      userGreeting.textContent = `Welcome, ${currentUser.displayName}!`;
    } else {
      btnLogin.hidden      = false;
      btnLogout.hidden     = true;
      userGreeting.hidden  = true;
      userGreeting.textContent = "";
    }
  }

  // ── 2. MENU & SEARCH TOGGLE ──────────────────────────────────────
  const menu       = document.querySelector("#menu-bars");
  const navbar     = document.querySelector(".navbar");
  const searchIcon = document.querySelector("#search-icon");
  const searchForm = document.querySelector(".search-form");

  menu?.addEventListener("click", () => {
    menu.classList.toggle("fa-times");
    navbar.classList.toggle("active");
    searchIcon.classList.remove("fa-times");
    searchForm.classList.remove("active");
  });

  searchIcon?.addEventListener("click", () => {
    searchIcon.classList.toggle("fa-times");
    searchForm.classList.toggle("active");
    menu.classList.remove("fa-times");
    navbar.classList.remove("active");
  });

  window.addEventListener("scroll", () => {
    menu.classList.remove("fa-times");
    navbar.classList.remove("active");
    searchIcon.classList.remove("fa-times");
    searchForm.classList.remove("active");
  });

  // ── 3. LIVE SEARCH ────────────────────────────────────────────────
  const searchBox = document.querySelector("#search-box");
  const blogPosts = document.querySelectorAll(".post");

  searchForm?.addEventListener("submit", e => {
    e.preventDefault();
    const q = searchBox.value.trim().toLowerCase();
    blogPosts.forEach(p => {
      const title = p.querySelector(".title")?.textContent.toLowerCase() || "";
      const text  = p.querySelector(".text")?.textContent.toLowerCase() || "";
      p.style.display = (title.includes(q) || text.includes(q)) ? "" : "none";
    });
    document.querySelector("#posts")?.scrollIntoView({ behavior: "smooth" });
  });

  // ── 4. CATEGORY FILTER ───────────────────────────────────────────
  document.querySelectorAll(".category-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const filter = link.dataset.filter;
      document.querySelectorAll(".category-link")
        .forEach(l => l.classList.remove("active-category"));
      link.classList.add("active-category");

      blogPosts.forEach(p => {
        p.style.display = (filter === "All" || p.dataset.category === filter) ? "" : "none";
      });
      document.querySelector("#posts")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ── TOAST ─────────────────────────────────────────────────────────
  function showToast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2000);
  }

  // ── RECURSIVE THREAD RENDERER ────────────────────────────────────
  function renderThread(pathArray, container) {
    const colRef = collection(db, ...pathArray);
    const q      = query(colRef, orderBy("created", "asc"));
    onSnapshot(q, snap => {
      container.innerHTML = "";
      snap.forEach(docSnap => {
        const data    = docSnap.data();
        const created = data.created?.toDate() || new Date();
        const author  = data.author || {};
        const avatar  = author.photoURL || "images/default-avatar.png";
        const name    = author.name     || "Anonymous";
        const id      = docSnap.id;

        // comment wrapper
        const wrap = document.createElement("div");
        wrap.className = "comment-item";
        wrap.innerHTML = `
          <div class="comment-header">
            <img src="${avatar}" class="comment-avatar" />
            <div class="comment-meta">
              <div class="comment-author">${name}</div>
              <div class="comment-time">${created.toLocaleString()}</div>
            </div>
          </div>
          <div class="comment-text">${data.text}</div>
          <div class="comment-actions">
            <button type="button" class="reaction" data-type="like">👍 ${data.reactions?.like||0}</button>
            <button type="button" class="reaction" data-type="love">❤️ ${data.reactions?.love||0}</button>
            <button type="button" class="btn-reply">Reply</button>
          </div>
          <div class="reply-area">
            <div class="reply-form" style="display:none; gap:8px; align-items:center;">
              <input type="text" placeholder="Write a reply…" class="reply-input"/>
              <button type="button" class="btn-submit-reply">Post</button>
            </div>
            <div class="replies-container"></div>
          </div>
        `;
        container.appendChild(wrap);

        // reactions
        wrap.querySelectorAll(".reaction").forEach(btn => {
          btn.addEventListener("click", async e => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentUser) return showToast("Please sign in to react!");
            const type = btn.dataset.type;
            const ref  = doc(db, ...pathArray, id);
            await updateDoc(ref, { [`reactions.${type}`]: increment(1) });
          });
        });

        // reply toggle & post
        const btnReply   = wrap.querySelector(".btn-reply");
        const replyForm  = wrap.querySelector(".reply-form");
        const replyInput = wrap.querySelector(".reply-input");
        const btnSubmit  = wrap.querySelector(".btn-submit-reply");
        const nextPath   = [...pathArray, id, "replies"];
        const repliesCtr = wrap.querySelector(".replies-container");

        btnReply.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          if (!currentUser) return showToast("Please sign in to reply!");
          replyForm.style.display = replyForm.style.display === "flex" ? "none" : "flex";
          replyInput.focus();
        });

        function postReply() {
          const txt = replyInput.value.trim();
          if (!txt) return;
          addDoc(collection(db, ...nextPath), {
            text: txt,
            created: serverTimestamp(),
            author: {
              name:     currentUser.displayName,
              photoURL: currentUser.photoURL,
              uid:      currentUser.uid
            },
            reactions: { like: 0, love: 0 }
          })
          .then(() => replyInput.value = "")
          .catch(() => showToast("Error posting reply"));
        }
        btnSubmit.addEventListener("click", e => {
          e.preventDefault(); e.stopPropagation();
          postReply();
        });
        replyInput.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            e.preventDefault(); e.stopPropagation();
            postReply();
          }
        });

        // recurse into replies
        renderThread(nextPath, repliesCtr);
      });
    });
  }

  // ── 5. SETUP POSTS: COMMENTS + SHARE ─────────────────────────────
  document.querySelectorAll(".post").forEach(post => {
    // inject UI
    const cs = document.createElement("div");
    cs.className = "comments-section";
    cs.innerHTML = `
      <div class="existing-comments"></div>
      <div class="add-comment" style="gap:8px;align-items:center;">
        <input type="text" placeholder="Write a comment…" class="comment-input"/>
        <button type="button" class="btn-submit-comment">Post</button>
      </div>
    `;
    post.appendChild(cs);

    // elements
    const postId      = post.querySelector(".title").textContent.trim().replace(/\s+/g, "-");
    post.id           = postId;
    const cc          = cs.querySelector(".existing-comments");
    const commentInput= cs.querySelector(".comment-input");
    const btnPost     = cs.querySelector(".btn-submit-comment");
    const commentIcon = post.querySelector(".fa-comment").parentElement;
    const shareIcon   = post.querySelector(".fa-share-square").parentElement;
    const ccSpan      = commentIcon.querySelector("span");
    const scSpan      = shareIcon.querySelector("span");

    // share count
    let sc = parseInt(localStorage.getItem(`${postId}-shares`)||"0", 10);
    scSpan.textContent = `(${sc})`;

    // post top-level comment
    function postComment() {
      if (!currentUser) return showToast("Please sign in to comment!");
      const txt = commentInput.value.trim();
      if (!txt) return;
      addDoc(collection(db, "posts", postId, "comments"), {
        text: txt,
        created: serverTimestamp(),
        author: {
          name:     currentUser.displayName,
          photoURL: currentUser.photoURL,
          uid:      currentUser.uid
        },
        reactions: { like: 0, love: 0 }
      })
      .then(() => commentInput.value = "")
      .catch(() => showToast("Error posting comment"));
    }
    btnPost.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      postComment();
    });
    commentInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        postComment();
      }
    });

    // render thread & update badge
    renderThread(["posts", postId, "comments"], cc);
    onSnapshot(
      query(collection(db, "posts", postId, "comments"), orderBy("created","asc")),
      snap => { ccSpan.textContent = `(${snap.size})`; }
    );

    // toggle comments pane
    commentIcon.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      cs.classList.toggle("visible");
      if (currentUser) commentInput.focus();
    });

    // share button
    shareIcon.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      sc++;
      scSpan.textContent = `(${sc})`;
      localStorage.setItem(`${postId}-shares`, sc);
      navigator.clipboard.writeText(`${location.origin}${location.pathname}#${postId}`)
        .then(() => showToast("Link copied!"))
        .catch(() => showToast("Couldn't copy"));
    });
  });

  // ── 6. DEEP-LINK SCROLL ────────────────────────────────────────────
  if (location.hash) {
    setTimeout(() => {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

});

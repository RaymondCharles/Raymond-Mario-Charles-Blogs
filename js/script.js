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
  // ── 0) Init Firebase App, Firestore & Auth ───────────────────────────────
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

  // Expose for debugging
  window.fb = { db, auth, provider };

  // Track signed-in user
  let currentUser = null;
  onAuthStateChanged(auth, user => currentUser = user);

  // ── 1) Auth button wiring (optional if in index.html) ───────────────────
  const btnLogin     = document.getElementById("btn-login");
  const btnLogout    = document.getElementById("btn-logout");
  const userGreeting = document.getElementById("user-greeting");

  if (btnLogin && btnLogout) {
    btnLogin.onclick  = () => signInWithPopup(auth, provider).catch(console.error);
    btnLogout.onclick = () => signOut(auth).catch(console.error);

    onAuthStateChanged(auth, user => {
      if (user) {
        btnLogin.hidden        = true;
        btnLogout.hidden       = false;
        userGreeting.hidden    = false;
        userGreeting.textContent = `Welcome, ${user.displayName}!`;
      } else {
        btnLogin.hidden     = false;
        btnLogout.hidden    = true;
        userGreeting.hidden = true;
      }
    });
  }

  // ── 2) Mobile menu & search toggle ───────────────────────────────────────
  const menu       = document.querySelector("#menu-bars");
  const navbar     = document.querySelector(".navbar");
  const searchIcon = document.querySelector("#search-icon");
  const searchForm = document.querySelector(".search-form");

  menu.onclick = () => {
    menu.classList.toggle("fa-times");
    navbar.classList.toggle("active");
    searchIcon.classList.remove("fa-times");
    searchForm.classList.remove("active");
  };
  searchIcon.onclick = () => {
    searchIcon.classList.toggle("fa-times");
    searchForm.classList.toggle("active");
    menu.classList.remove("fa-times");
    navbar.classList.remove("active");
  };
  window.onscroll = () => {
    menu.classList.remove("fa-times");
    navbar.classList.remove("active");
    searchIcon.classList.remove("fa-times");
    searchForm.classList.remove("active");
  };

  // ── 3) SEARCH: filter posts on submit ───────────────────────────────────
  const searchBox = document.querySelector("#search-box");
  const blogPosts = document.querySelectorAll(".post");

  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const q = searchBox.value.trim().toLowerCase();
    blogPosts.forEach(post => {
      const title   = post.querySelector(".title").textContent.toLowerCase();
      const excerpt = post.querySelector(".text").textContent.toLowerCase();
      post.style.display = title.includes(q) || excerpt.includes(q) ? "" : "none";
    });
    document.querySelector("#posts")
            .scrollIntoView({ behavior: "smooth" });
  });

  // ── 4) Category filtering + smooth scroll ────────────────────────────────
  const categoryLinks = document.querySelectorAll(".category-link");
  categoryLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const filter = link.dataset.filter;
      categoryLinks.forEach(l => l.classList.remove("active-category"));
      link.classList.add("active-category");
      blogPosts.forEach(post => {
        post.style.display =
          (filter === "All" || post.dataset.category === filter) ? "" : "none";
      });
      document.querySelector("#posts")
              .scrollIntoView({ behavior: "smooth" });
    });
  });

  // ── 5) Comments & Share ───────────────────────────────────────────────────
blogPosts.forEach(post => {
  // a) Inject comments UI
  const commentsSection = document.createElement("div");
  commentsSection.className = "comments-section";
  commentsSection.innerHTML = `
    <div class="existing-comments"></div>
    <div class="add-comment">
      <input type="text" placeholder="Write a comment…"/>
      <button class="btn-submit">Post</button>
    </div>
  `;
  post.appendChild(commentsSection);

  // b) Grab elements
  const commentIcon      = post.querySelector(".fa-comment").parentElement;
  const shareIcon        = post.querySelector(".fa-share-square").parentElement;
  const commentCountSpan = commentIcon.querySelector("span");
  const shareCountSpan   = shareIcon.querySelector("span");
  const commentInput     = commentsSection.querySelector("input");
  const commentBtn       = commentsSection.querySelector(".btn-submit");
  const existingComments = commentsSection.querySelector(".existing-comments");

  // Prompt on focus if not signed in
  commentInput.addEventListener("focus", () => {
    if (!currentUser) showToast("Please sign in to leave a comment!");
  });

  // c) Unique post ID
  const keyBase = post.querySelector(".title").innerText
    .trim()
    .replace(/\s+/g, "-");
  post.id = keyBase;

  // d) Load share count
  let shareCount = parseInt(localStorage.getItem(`${keyBase}-shares`) || "0", 10);
  shareCountSpan.textContent = `(${shareCount})`;

  // e) Stream comments from Firestore
  const commentsCol   = collection(db, "posts", keyBase, "comments");
  const commentsQuery = query(commentsCol, orderBy("created", "asc"));
  onSnapshot(commentsQuery, snap => {
    existingComments.innerHTML = "";

    snap.forEach(docSnap => {
      const data      = docSnap.data();
      const when      = data.created?.toDate() || new Date();
      const commentId = docSnap.id;

      // ❶ Main comment
      const div = document.createElement("div");
      div.className = "comment-item";
      div.setAttribute("data-comment-id", commentId);
      div.innerHTML = `
        <div class="comment-header">
          <img src="${data.author.photoURL || 'images/default-avatar.png'}"
               class="comment-avatar"/>
          <div>
            <div class="comment-author">${data.author.name}</div>
            <div class="comment-time">${when.toLocaleString()}</div>
          </div>
        </div>
        <div class="comment-text">${data.text}</div>

        <!-- ❷ Reactions -->
        <div class="comment-reactions">
          <div class="reaction" data-type="like">
            <i class="fas fa-thumbs-up"></i>
            <span>${data.reactions?.like || 0}</span>
          </div>
          <div class="reaction" data-type="love">
            <i class="fas fa-heart"></i>
            <span>${data.reactions?.love || 0}</span>
          </div>
        </div>

        <!-- ❸ Replies -->
        <div class="comment-reply-section">
          <button class="btn-reply">Reply</button>
          <div class="reply-form">
            <input type="text" placeholder="Write a reply…"/>
            <button class="btn-submit-reply">Post</button>
          </div>
          <div class="replies-container"></div>
        </div>
      `;
      existingComments.appendChild(div);

      // ── Reactions handlers ───────────────────────────────────────────────
      div.querySelectorAll(".reaction").forEach(el => {
        el.addEventListener("click", async () => {
          if (!currentUser) {
            showToast("Please sign in to react!");
            return;
          }
          const type = el.dataset.type;
          const ref  = doc(db, "posts", keyBase, "comments", commentId);
          await updateDoc(ref, { [`reactions.${type}`]: increment(1) });
        });
      });

      // ── Replies stream ───────────────────────────────────────────────────
      const repliesContainer = div.querySelector(".replies-container");
      const repliesForm      = div.querySelector(".reply-form");
      const replyInput       = repliesForm.querySelector("input");
      const replyBtn         = repliesForm.querySelector(".btn-submit-reply");

      const repliesCol   = collection(db,
        "posts", keyBase, "comments", commentId, "replies"
      );
      const repliesQuery = query(repliesCol, orderBy("created", "asc"));
      onSnapshot(repliesQuery, rSnap => {
        repliesContainer.innerHTML = "";
        rSnap.forEach(rDoc => {
          const rData = rDoc.data();
          const rWhen = rData.created?.toDate() || new Date();
          const rDiv = document.createElement("div");
          rDiv.className = "comment-reply";
          rDiv.innerHTML = `
            <div class="comment-header">
              <img src="${rData.author.photoURL||'images/default-avatar.png'}"
                   class="comment-avatar"/>
              <div>
                <div class="comment-author">${rData.author.name}</div>
                <div class="comment-time">${rWhen.toLocaleString()}</div>
              </div>
            </div>
            <div class="comment-text">${rData.text}</div>
          `;
          repliesContainer.appendChild(rDiv);
        });
      });

      // ── Toggle reply form ───────────────────────────────────────────────
      div.querySelector(".btn-reply")
         .addEventListener("click", () => {
           repliesForm.style.display =
             repliesForm.style.display === "flex" ? "none" : "flex";
           if (currentUser) replyInput.focus();
         });

      // ── Post a reply ───────────────────────────────────────────────────
      replyBtn.addEventListener("click", async e => {
        e.preventDefault();
        if (!currentUser) {
          showToast("Please sign in to reply!");
          return;
        }
        const txt = replyInput.value.trim();
        if (!txt) return;
        await addDoc(repliesCol, {
          text: txt,
          created: serverTimestamp(),
          author: {
            name:     currentUser.displayName,
            photoURL: currentUser.photoURL,
            uid:      currentUser.uid
          }
        });
        replyInput.value = "";
      });
    });

    // update main comment count
    commentCountSpan.textContent = `(${snap.size})`;
  });

  // ── Toggle comment pane ───────────────────────────────────────────────
  commentIcon.addEventListener("click", e => {
    e.preventDefault();
    commentsSection.classList.toggle("visible");
    if (currentUser) commentInput.focus();
  });

  // ── Inline share (unchanged) ─────────────────────────────────────────
  shareIcon.addEventListener("click", e => {
    e.preventDefault();
    shareCount++;
    shareCountSpan.textContent = `(${shareCount})`;
    localStorage.setItem(`${keyBase}-shares`, shareCount);
    navigator.clipboard.writeText(`${location.origin}${location.pathname}#${keyBase}`)
      .then(() => showToast("Link copied to clipboard!"))
      .catch(() => showToast("Couldn’t copy link"));
  });
});

  // ── 6) Toast helper ───────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
  }

  // ── 7) Deep-link scrolling on load ───────────────────────────────────────
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }
});

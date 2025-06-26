// js/script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ── FIREBASE ────────────────────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyDEENPQj618mPtJLvR-QQlVFbbz3KNOpRU",
    authDomain: "blog-website-de482.firebaseapp.com",
    projectId: "blog-website-de482",
    storageBucket: "blog-website-de482.appspot.com",
    messagingSenderId: "1036917472247",
    appId: "1:1036917472247:web:b4ff13edab11d526680cf2",
    measurementId: "G-GHWM78YX25"
  };
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // ── 1) Mobile menu + search ─────────────────────────────────────────────────
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

  // ── 2) Category filtering + smooth scroll ──────────────────────────────────
  const categoryLinks = document.querySelectorAll(".category-link");
  const blogPosts     = document.querySelectorAll(".post");

  categoryLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const sel = link.dataset.filter;
      categoryLinks.forEach(l => l.classList.remove("active-category"));
      link.classList.add("active-category");
      blogPosts.forEach(post => {
        post.style.display = (sel === "All" || post.dataset.category === sel)
                             ? ""
                             : "none";
      });
      document.querySelector("#posts")
              .scrollIntoView({ behavior: "smooth" });
    });
  });

  // ── 3) Inline Comments (Firestore) & Share (localStorage) ──────────────────
  blogPosts.forEach(post => {
    // a) Inject comments UI
    const commentsSection = document.createElement("div");
    commentsSection.className = "comments-section";
    commentsSection.innerHTML = `
      <div class="existing-comments"></div>
      <div class="add-comment">
        <input type="text" placeholder="Write a comment…" />
        <button class="btn-submit">Post</button>
      </div>
    `;
    post.appendChild(commentsSection);

    const commentIcon      = post.querySelector(".fa-comment").parentElement;
    const shareIcon        = post.querySelector(".fa-share-square").parentElement;
    const commentCountSpan = commentIcon.querySelector("span");
    const shareCountSpan   = shareIcon.querySelector("span");
    const commentInput     = commentsSection.querySelector("input");
    const commentBtn       = commentsSection.querySelector(".btn-submit");
    const existingComments = commentsSection.querySelector(".existing-comments");

    // b) Unique post ID from title
    const titleText = post.querySelector(".title").innerText.trim();
    const keyBase   = titleText.replace(/\s+/g, "-");
    post.id = keyBase;

    // c) Share count from localStorage
    let shareCount = parseInt(localStorage.getItem(`${keyBase}-shares`) || "0", 10);
    shareCountSpan.textContent = `(${shareCount})`;

    // d) Firestore comments collection & live‐update
    const commentsCol   = collection(db, "posts", keyBase, "comments");
    const commentsQuery = query(commentsCol, orderBy("created", "asc"));

    onSnapshot(commentsQuery, snap => {
      existingComments.innerHTML = "";
      snap.forEach(doc => {
        const div = document.createElement("div");
        div.className = "comment-item";
        div.textContent = doc.data().text;
        existingComments.appendChild(div);
      });
      // update count badge
      commentCountSpan.textContent = `(${snap.size})`;
    });

    // e) Toggle comments section
    commentIcon.addEventListener("click", e => {
      e.preventDefault();
      commentsSection.classList.toggle("visible");
      commentInput.focus();
    });

    // f) Post new comment → Firestore (prevent jump)
    commentBtn.addEventListener("click", async e => {
      e.preventDefault();
      const txt = commentInput.value.trim();
      if (!txt) return;
      await addDoc(commentsCol, {
        text: txt,
        created: serverTimestamp()
      });
      commentInput.value = "";
    });

    // g) Inline share (prevent jump)
    shareIcon.addEventListener("click", e => {
      e.preventDefault();
      shareCount++;
      shareCountSpan.textContent = `(${shareCount})`;
      localStorage.setItem(`${keyBase}-shares`, shareCount);

      const url = `${location.origin}${location.pathname}#${keyBase}`;
      navigator.clipboard
        .writeText(url)
        .then(() => showToast("Link copied to clipboard!"))
        .catch(() => showToast("Couldn’t copy link"));
    });
  });

  // ── 4) Toast helper ─────────────────────────────────────────────────────────
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

  // ── 5) Deep-link scrolling on load ─────────────────────────────────────────
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }
});

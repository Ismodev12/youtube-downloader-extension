// Ajoute un bouton « Télécharger » SOUS chaque vidéo YouTube :
//  - page d'une vidéo : à côté de J'aime / Partager, sous le lecteur
//  - accueil, recherche, chaînes, suggestions : sous chaque miniature
//  - Shorts : bouton flottant
// Un clic ouvre un menu pour choisir la qualité.

(() => {
  const ICONE =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"/></svg>';

  const QUALITES = [
    { v: "best", t: "Meilleure qualité", d: "MP4" },
    { v: "2160", t: "4K (2160p)", d: "MP4" },
    { v: "1440", t: "1440p", d: "MP4" },
    { v: "1080", t: "1080p (Full HD)", d: "MP4" },
    { v: "720", t: "720p (HD)", d: "MP4" },
    { v: "480", t: "480p", d: "MP4" },
    { v: "360", t: "360p (léger)", d: "MP4" },
    { v: "mp3", t: "Audio seul", d: "MP3" },
  ];

  // --- Utilitaires -------------------------------------------------------

  function idDepuisUrl(href) {
    try {
      const u = new URL(href, location.origin);
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|live)\/([\w-]{6,})/);
      return m ? m[2] : null;
    } catch {
      return null;
    }
  }

  function envoyer(msg) {
    return new Promise((ok) => {
      const perdu = { ok: false, erreur: "Extension rechargée : actualise la page (F5)." };
      try {
        chrome.runtime.sendMessage(msg, (rep) => {
          if (chrome.runtime.lastError) ok(perdu);
          else ok(rep || { ok: false, erreur: "Pas de réponse" });
        });
      } catch {
        ok(perdu);
      }
    });
  }

  function etat(btn, classe, texte, titre) {
    btn.classList.remove("ytdl-encours", "ytdl-ok", "ytdl-erreur");
    if (classe) btn.classList.add(classe);
    btn.querySelector(".ytdl-label").textContent = texte;
    btn.title = titre || texte;
  }

  function notifier(texte, erreur = false) {
    let zone = document.getElementById("ytdl-toast");
    if (!zone) {
      zone = document.createElement("div");
      zone.id = "ytdl-toast";
      document.body.appendChild(zone);
    }
    const n = document.createElement("div");
    n.className = "ytdl-toast-item" + (erreur ? " ytdl-toast-erreur" : "");
    n.textContent = texte;
    zone.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  // --- Menu de choix de la qualité --------------------------------------

  let menuOuvert = null;

  function fermerMenu() {
    menuOuvert?.remove();
    menuOuvert = null;
  }

  async function ouvrirMenu(btn) {
    if (menuOuvert && menuOuvert.dataset.pour === btn.dataset.uid) return fermerMenu();
    fermerMenu();

    const { qualite: derniere = "best" } = await chrome.storage.sync.get("qualite").catch(() => ({}));

    const menu = document.createElement("div");
    menu.className = "ytdl-menu";
    menu.dataset.pour = btn.dataset.uid;
    menu.innerHTML = '<div class="ytdl-menu-titre">Choisir la qualité</div>';

    QUALITES.forEach((q) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ytdl-menu-item" + (q.v === derniere ? " ytdl-actif" : "");
      item.innerHTML = `<span>${q.t}</span><small>${q.d}</small>`;
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fermerMenu();
        lancer(btn, q.v);
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    menuOuvert = menu;

    // Position : juste sous le bouton (ou au-dessus s'il n'y a pas la place)
    const r = btn.getBoundingClientRect();
    const h = menu.offsetHeight;
    const w = menu.offsetWidth;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    let left = Math.min(r.left, innerWidth - w - 8);
    menu.style.top = top + scrollY + "px";
    menu.style.left = Math.max(8, left) + scrollX + "px";
  }

  document.addEventListener(
    "click",
    (e) => {
      if (menuOuvert && !menuOuvert.contains(e.target) && !e.target.closest(".ytdl-btn")) fermerMenu();
    },
    true
  );
  document.addEventListener("keydown", (e) => e.key === "Escape" && fermerMenu());
  window.addEventListener("scroll", fermerMenu, { passive: true });
  window.addEventListener("yt-navigate-start", fermerMenu);

  // --- Lancement + suivi de la progression ------------------------------

  async function lancer(btn, qualite) {
    if (btn.classList.contains("ytdl-encours")) return;
    const url = "https://www.youtube.com/watch?v=" + btn.dataset.videoId;
    etat(btn, "ytdl-encours", "Démarrage…");

    const rep = await envoyer({ type: "telecharger", url, qualite });
    if (!rep.ok) {
      etat(btn, "ytdl-erreur", "Erreur", rep.erreur);
      notifier(rep.erreur, true);
      setTimeout(() => etat(btn, "", "Télécharger"), 6000);
      return;
    }

    const suivi = setInterval(async () => {
      const s = await envoyer({ type: "statut", id: rep.id });
      if (!s.ok) return;
      if (s.etat === "termine") {
        clearInterval(suivi);
        etat(btn, "ytdl-ok", "Terminé ✓", s.fichier || "Téléchargé");
        notifier("Téléchargé : " + (s.titre || "vidéo"));
      } else if (s.etat === "erreur") {
        clearInterval(suivi);
        etat(btn, "ytdl-erreur", "Erreur", s.erreur);
        notifier(s.erreur || "Échec du téléchargement", true);
        setTimeout(() => etat(btn, "", "Télécharger"), 6000);
      } else {
        const p = s.progression ? Math.floor(s.progression) + " %" : "…";
        etat(btn, "ytdl-encours", s.etat === "fusion" ? "Finalisation…" : p);
      }
    }, 1000);
  }

  let compteur = 0;
  function creerBouton(videoId, variante) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ytdl-btn ytdl-" + variante;
    btn.dataset.videoId = videoId;
    btn.dataset.uid = String(++compteur);
    btn.innerHTML = ICONE + '<span class="ytdl-label">Télécharger</span><span class="ytdl-fleche">▾</span>';
    btn.title = "Télécharger cette vidéo (choisir la qualité)";
    // On bloque le clic pour que YouTube n'ouvre pas la vidéo
    ["mousedown", "pointerdown", "touchstart"].forEach((ev) =>
      btn.addEventListener(ev, (e) => e.stopPropagation(), true)
    );
    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!btn.classList.contains("ytdl-encours")) ouvrirMenu(btn);
      },
      true
    );
    return btn;
  }

  function changerVideo(btn, id) {
    if (btn.dataset.videoId !== id) {
      btn.dataset.videoId = id;
      etat(btn, "", "Télécharger");
    }
  }

  // --- Page de la vidéo (sous le lecteur) -------------------------------

  function boutonPageVideo() {
    const id = location.pathname === "/watch" ? idDepuisUrl(location.href) : null;
    let btn = document.getElementById("ytdl-principal");
    if (!id) return btn?.remove();

    const cible =
      document.querySelector("ytd-watch-metadata #top-level-buttons-computed") ||
      document.querySelector("ytd-watch-metadata #actions-inner") ||
      document.querySelector("ytd-watch-metadata #owner");
    if (!cible) return;

    if (!btn) {
      btn = creerBouton(id, "principal");
      btn.id = "ytdl-principal";
    }
    changerVideo(btn, id);
    if (btn.parentElement !== cible) cible.appendChild(btn);
  }

  // --- Shorts : bouton flottant ------------------------------------------

  function boutonShorts() {
    const id = location.pathname.startsWith("/shorts/") ? idDepuisUrl(location.href) : null;
    let btn = document.getElementById("ytdl-shorts");
    if (!id) return btn?.remove();
    if (!btn) {
      btn = creerBouton(id, "flottant");
      btn.id = "ytdl-shorts";
      document.body.appendChild(btn);
    }
    changerVideo(btn, id);
  }

  // --- Sous chaque miniature --------------------------------------------

  const CARTES = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-reel-item-renderer",
    "ytm-shorts-lockup-view-model",
    "yt-lockup-view-model",
  ].join(",");

  // Zone de texte (titre + chaîne + vues) sous laquelle on place le bouton
  const ZONES_TEXTE = [
    ".yt-lockup-view-model__metadata",
    ".yt-lockup-metadata-view-model",
    "#meta",
    "#details",
    "#dismissible #metadata",
    ".shortsLockupViewModelHostOutsideMetadata",
  ].join(",");

  function boutonsMiniatures() {
    document.querySelectorAll(CARTES).forEach((carte) => {
      // Une carte qui en contient une autre : on traite seulement l'intérieure
      if (carte.querySelector(CARTES)) return;
      if (carte.closest("#ytdl-shorts, ytd-watch-metadata")) return;

      const lien = carte.querySelector('a[href*="/watch?v="], a[href^="/shorts/"]');
      const id = lien && idDepuisUrl(lien.getAttribute("href"));
      if (!id) return;

      let btn = carte.querySelector(".ytdl-carte");
      if (btn) return changerVideo(btn, id); // YouTube réutilise les cartes

      const zone = carte.querySelector(ZONES_TEXTE);
      btn = creerBouton(id, "carte");
      const ligne = document.createElement("div");
      ligne.className = "ytdl-ligne";
      ligne.appendChild(btn);
      (zone || carte).appendChild(ligne);
    });
  }

  // --- YouTube change de page sans recharger : on surveille --------------

  let planifie = false;
  function miseAJour() {
    if (planifie) return;
    planifie = true;
    requestAnimationFrame(() => {
      planifie = false;
      boutonPageVideo();
      boutonShorts();
      boutonsMiniatures();
    });
  }

  new MutationObserver(miseAJour).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("yt-navigate-finish", miseAJour);
  miseAJour();
})();

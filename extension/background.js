// Service worker : fait le lien entre les boutons de la page YouTube
// et le serveur local (serveur.py). Quand la vidéo est prête, c'est le
// navigateur lui-même qui la télécharge (barre de téléchargements).

const SERVEUR = "http://127.0.0.1:8765";

async function appel(chemin, options = {}) {
  const rep = await fetch(SERVEUR + chemin, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(data.erreur || "Erreur serveur " + rep.status);
  return data;
}

// Lance le téléchargement dans le navigateur (une seule fois par vidéo)
async function telechargerDansNavigateur(id, nom) {
  const cle = "dl_" + id;
  const deja = await chrome.storage.session.get(cle);
  if (deja[cle]) return;
  await chrome.storage.session.set({ [cle]: true });
  await chrome.downloads.download({
    url: SERVEUR + "/file/" + id,
    filename: "YouTube/" + nom,
    conflictAction: "uniquify",
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, repondre) => {
  (async () => {
    try {
      if (msg.type === "telecharger") {
        let qualite = msg.qualite;
        if (qualite) chrome.storage.sync.set({ qualite }); // mémorise le dernier choix
        else qualite = (await chrome.storage.sync.get("qualite")).qualite || "best";
        const data = await appel("/download", {
          method: "POST",
          body: JSON.stringify({ url: msg.url, qualite }),
        });
        repondre({ ok: true, id: data.id });
      } else if (msg.type === "statut") {
        const data = await appel("/status/" + encodeURIComponent(msg.id));
        if (data.etat === "termine") await telechargerDansNavigateur(msg.id, data.nom);
        repondre({ ok: true, ...data });
      } else if (msg.type === "ping") {
        const data = await appel("/ping");
        repondre({ ok: true, ...data });
      } else if (msg.type === "ouvrirDossier") {
        chrome.downloads.showDefaultFolder();
        repondre({ ok: true });
      }
    } catch (e) {
      const horsLigne = e instanceof TypeError; // fetch impossible
      repondre({
        ok: false,
        erreur: horsLigne
          ? "Connexion au serveur impossible (" + e.message + ")"
          : e.message,
      });
    }
  })();
  return true; // réponse asynchrone
});

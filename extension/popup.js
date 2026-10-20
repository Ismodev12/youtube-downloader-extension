const sel = document.getElementById("qualite");
const statut = document.getElementById("statut");
const statutTxt = document.getElementById("statut-txt");
const btnDossier = document.getElementById("dossier");

chrome.storage.sync.get("qualite", ({ qualite = "best" }) => (sel.value = qualite));
sel.addEventListener("change", () => chrome.storage.sync.set({ qualite: sel.value }));

chrome.runtime.sendMessage({ type: "ping" }, (rep) => {
  const errExt = chrome.runtime.lastError;
  if (rep && rep.ok) {
    statut.className = "statut on";
    statutTxt.textContent = "Serveur local actif" + (rep.ffmpeg ? "" : " (sans ffmpeg)");
    btnDossier.disabled = false;
  } else {
    statut.className = "statut off";
    statutTxt.textContent = errExt
      ? "Erreur de l'extension : " + errExt.message
      : (rep && rep.erreur) || "Pas de réponse de l'extension";
  }
});

btnDossier.addEventListener("click", () => chrome.runtime.sendMessage({ type: "ouvrirDossier" }));

"""
Serveur local pour l'extension « YT Téléchargeur ».

1. L'extension envoie le lien de la vidéo et la qualité voulue.
2. yt-dlp prépare la vidéo dans un dossier temporaire (image + son assemblés).
3. Le navigateur récupère ensuite le fichier : il apparaît dans la barre
   de téléchargements de Chrome / Edge, comme un téléchargement normal.

Lancement : double-clic sur demarrer.vbs (invisible, aucune fenêtre noire)
"""

import json
import shutil
import sys
import tempfile
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

# Lancé sans fenêtre (pythonw) : on écrit les messages et erreurs dans serveur-log.txt
if sys.stdout is None or sys.stderr is None:
    _log = open(Path(__file__).with_name("serveur-log.txt"), "w", encoding="utf-8", buffering=1)
    sys.stdout = sys.stderr = _log

try:
    import yt_dlp
except ImportError:
    print("ERREUR : yt-dlp n'est pas installé. Lance d'abord installer.bat")
    sys.exit(1)

HOTE, PORT = "127.0.0.1", 8765
TEMP = Path(tempfile.gettempdir()) / "yt-telechargeur"
shutil.rmtree(TEMP, ignore_errors=True)  # nettoie les restes d'une session précédente
TEMP.mkdir(parents=True, exist_ok=True)


def trouver_ffmpeg():
    """ffmpeg sert à assembler l'image et le son en un seul MP4."""
    chemin = shutil.which("ffmpeg")
    if chemin:
        return chemin
    try:
        import imageio_ffmpeg  # installé par installer.bat
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


FFMPEG = trouver_ffmpeg()
TACHES = {}  # id -> état du téléchargement


def options_qualite(qualite):
    """Choisit le format yt-dlp selon la qualité voulue."""
    if not FFMPEG:
        # Sans ffmpeg : seulement les fichiers déjà complets (souvent 360p)
        return {"format": "best[ext=mp4]/best"}
    if qualite == "mp3":
        return {
            "format": "bestaudio/best",
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
            ],
        }
    limite = f"[height<={qualite}]" if qualite in ("2160", "1440", "1080", "720", "480", "360") else ""
    return {
        "format": f"bv*{limite}[ext=mp4]+ba[ext=m4a]/bv*{limite}+ba/b{limite}/b",
        "merge_output_format": "mp4",
    }


def preparer(id_tache, url, qualite):
    tache = TACHES[id_tache]
    dossier = TEMP / id_tache
    dossier.mkdir()

    def progression(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            if total:
                tache["progression"] = d.get("downloaded_bytes", 0) * 100 / total
            tache["etat"] = "telechargement"
        elif d["status"] == "finished":
            tache["etat"] = "fusion"

    opts = {
        "outtmpl": str(dossier / "%(title).150B.%(ext)s"),
        "windowsfilenames": True,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "progress_hooks": [progression],
        **options_qualite(qualite),
    }
    if FFMPEG:
        opts["ffmpeg_location"] = FFMPEG

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            infos = ydl.extract_info(url, download=True)
        # Le fichier final = le plus gros fichier du dossier
        fichiers = [f for f in dossier.iterdir() if f.is_file() and not f.name.endswith(".part")]
        if not fichiers:
            raise RuntimeError("Aucun fichier produit")
        final = max(fichiers, key=lambda f: f.stat().st_size)
        tache.update(
            etat="termine",
            progression=100,
            titre=infos.get("title"),
            chemin=str(final),
            nom=final.name,
        )
    except Exception as e:
        tache["etat"] = "erreur"
        tache["erreur"] = str(e).replace("ERROR: ", "")[:300]
        shutil.rmtree(dossier, ignore_errors=True)


def supprimer_plus_tard(id_tache, delai=120):
    def _suppr():
        time.sleep(delai)
        shutil.rmtree(TEMP / id_tache, ignore_errors=True)
        TACHES.pop(id_tache, None)

    threading.Thread(target=_suppr, daemon=True).start()


class Gestionnaire(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def origine_autorisee(self):
        # Seule l'extension peut lancer des téléchargements (pas un site web).
        # Un site web envoie toujours son Origin (https://...) : il est refusé.
        origine = self.headers.get("Origin", "")
        return origine == "" or origine.startswith(("chrome-extension://", "extension://"))

    def repondre(self, code, data):
        corps = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        # Le fichier final, récupéré par le gestionnaire de téléchargements du navigateur.
        # L'identifiant (32 caractères aléatoires) sert de clé : impossible à deviner.
        if self.path.startswith("/file/"):
            return self.envoyer_fichier(self.path[len("/file/"):].split("?")[0])

        # Lectures seules : le navigateur n'envoie pas d'en-tête Origin pour les
        # requêtes GET de l'extension. L'identifiant aléatoire (32 caractères)
        # suffit à protéger le suivi ; lancer un téléchargement (POST) reste
        # réservé à l'extension.
        if self.path == "/ping":
            return self.repondre(200, {"serveur": "ok", "ffmpeg": bool(FFMPEG)})
        if self.path.startswith("/status/"):
            tache = TACHES.get(self.path[len("/status/"):])
            if not tache:
                return self.repondre(404, {"erreur": "Téléchargement inconnu"})
            return self.repondre(200, {k: v for k, v in tache.items() if k != "chemin"})
        self.repondre(404, {"erreur": "Introuvable"})

    def envoyer_fichier(self, id_tache):
        tache = TACHES.get(id_tache)
        if not tache or tache.get("etat") != "termine" or not Path(tache["chemin"]).exists():
            return self.repondre(404, {"erreur": "Fichier introuvable"})
        chemin = Path(tache["chemin"])
        taille = chemin.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg" if chemin.suffix == ".mp3" else "video/mp4")
        self.send_header("Content-Length", str(taille))
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(chemin.name)}")
        self.end_headers()
        try:
            with open(chemin, "rb") as f:
                shutil.copyfileobj(f, self.wfile, 1024 * 1024)
        except (ConnectionError, OSError):
            return  # téléchargement annulé dans le navigateur
        supprimer_plus_tard(id_tache)  # le navigateur a sa copie : on libère la place

    def do_POST(self):
        if not self.origine_autorisee():
            return self.repondre(403, {"erreur": "Accès refusé"})
        longueur = int(self.headers.get("Content-Length", 0) or 0)
        try:
            data = json.loads(self.rfile.read(longueur) or b"{}")
        except json.JSONDecodeError:
            return self.repondre(400, {"erreur": "Requête invalide"})

        if self.path == "/download":
            url = str(data.get("url", ""))
            if not url.startswith("https://www.youtube.com/"):
                return self.repondre(400, {"erreur": "Lien YouTube invalide"})
            id_tache = uuid.uuid4().hex
            TACHES[id_tache] = {"etat": "attente", "progression": 0}
            threading.Thread(
                target=preparer, args=(id_tache, url, str(data.get("qualite", "best"))), daemon=True
            ).start()
            return self.repondre(200, {"id": id_tache})

        self.repondre(404, {"erreur": "Introuvable"})


if __name__ == "__main__":
    try:
        serveur = ThreadingHTTPServer((HOTE, PORT), Gestionnaire)
    except OSError as e:
        print(f"Port {PORT} déjà utilisé (le serveur tourne sans doute déjà) : {e}")
        sys.exit(0)
    print(f"Serveur YT Téléchargeur actif sur http://{HOTE}:{PORT} (Ctrl+C pour arrêter)")
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass

# YT Téléchargeur — extension Chrome / Edge

Ajoute un bouton **Télécharger** sur YouTube (page vidéo, miniatures, Shorts).
Un clic, on choisit la qualité, et la vidéo arrive dans la barre de téléchargements du navigateur.

- Qualités : Meilleure, 4K, 1440p, 1080p, 720p, 480p, 360p ou **Audio MP3**
- Le dernier choix est mémorisé (modifiable depuis l'icône de l'extension)
- Fichiers rangés dans `Téléchargements\YouTube`

Le projet contient deux parties :

| Dossier | Rôle |
|---|---|
| `extension/` | L'extension à charger dans Chrome ou Edge (ajoute les boutons) |
| `serveur/` | Petit serveur local Python (yt-dlp + ffmpeg) qui prépare réellement les vidéos |

> Fonctionne sous **Windows**. Le serveur tourne uniquement sur ton PC (`127.0.0.1:8765`), rien n'est envoyé ailleurs.

## 1. Installation (une seule fois)

1. Télécharge ce projet : bouton vert **Code → Download ZIP**, puis décompresse-le.
2. Installe Python : https://www.python.org/downloads/
   → coche bien **« Add python.exe to PATH »** pendant l'installation.
3. Double-clic sur `serveur\installer.bat` (installe yt-dlp, ffmpeg et Deno).

## 2. Charger l'extension

- Chrome : ouvre `chrome://extensions` — Edge : ouvre `edge://extensions`
- Active le **Mode développeur**
- Clique sur **Charger l'extension non empaquetée** et choisis le dossier `extension`
- Épingle l'icône verte dans la barre d'outils

## 3. Utilisation

1. Double-clic sur `serveur\demarrer.vbs` — rien ne s'affiche, c'est normal : le serveur tourne en arrière-plan.
   *Astuce : lance une fois `serveur\demarrage-auto.bat` pour qu'il démarre à chaque allumage du PC.*
2. Ouvre YouTube (actualise la page si elle était déjà ouverte) :
   - sur une vidéo : bouton vert **Télécharger** à côté de J'aime / Partager
   - sous chaque miniature : bouton **Télécharger** sous le titre
   - sur les Shorts : bouton flottant en bas à droite
3. Choisis la qualité : le bouton affiche la préparation en %, puis le fichier se télécharge.

## Problèmes fréquents

| Problème | Solution |
|---|---|
| « Serveur local éteint » | Lance `demarrer.vbs`. Si ça persiste, lance `diagnostic.bat` pour voir l'erreur exacte. |
| Le téléchargement échoue d'un coup | YouTube a changé quelque chose : lance `arreter.bat` puis `demarrer.vbs` (yt-dlp se met à jour tout seul). |
| Les boutons n'apparaissent pas | Actualise la page YouTube (F5). |
| Arrêter le serveur | Double-clic sur `serveur\arreter.bat` |

## Avertissement

À utiliser pour tes propres vidéos, celles sous licence libre, ou pour un usage personnel autorisé.
Le téléchargement de vidéos est contraire aux conditions d'utilisation de YouTube ; c'est pourquoi
cette extension n'est pas publiée sur le Chrome Web Store et s'installe en mode développeur.
Chacun reste responsable de l'usage qu'il en fait.

## Crédits

Basé sur [yt-dlp](https://github.com/yt-dlp/yt-dlp) et [ffmpeg](https://ffmpeg.org/).

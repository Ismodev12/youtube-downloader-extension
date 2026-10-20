@echo off
chcp 65001 >nul
title Diagnostic - YT Telechargeur
cd /d "%~dp0"
echo === Diagnostic YT Telechargeur ===
echo.
echo [Python]
where python
where pythonw
python --version
echo.
echo [yt-dlp]
python -c "import yt_dlp; print('yt-dlp', yt_dlp.version.__version__)"
echo.
echo [Port 8765]
netstat -ano | findstr "127.0.0.1:8765"
echo.
if exist serveur-log.txt (
  echo [Dernier journal du serveur invisible]
  type serveur-log.txt
  echo.
)
echo [Lancement du serveur dans cette fenetre - les erreurs s'affichent ici]
echo Si tout va bien, teste l'extension maintenant. Ferme la fenetre pour arreter.
echo.
python serveur.py
echo.
pause

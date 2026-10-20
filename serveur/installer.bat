@echo off
chcp 65001 >nul
title Installation - YT Telechargeur
echo.
echo === Installation des outils (a faire une seule fois) ===
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [!] Python n'est pas installe.
  echo     Installe-le depuis https://www.python.org/downloads/
  echo     IMPORTANT : coche "Add python.exe to PATH" pendant l'installation.
  echo.
  pause
  exit /b 1
)

echo [1/2] Installation de yt-dlp et ffmpeg...
python -m pip install --upgrade "yt-dlp[default]" imageio-ffmpeg
if errorlevel 1 (
  echo [!] L'installation a echoue. Verifie ta connexion internet.
  pause
  exit /b 1
)

echo.
echo [2/2] Installation de Deno (aide yt-dlp a lire YouTube)...
where deno >nul 2>nul
if errorlevel 1 (
  winget install --id DenoLand.Deno -e --accept-source-agreements --accept-package-agreements
) else (
  echo Deno est deja installe.
)

echo.
echo === Termine ! Lance maintenant demarrer.vbs (ou demarrage-auto.bat) ===
pause

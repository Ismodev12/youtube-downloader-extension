@echo off
chcp 65001 >nul
rem Fait demarrer le serveur automatiquement a chaque allumage de Windows
set "CIBLE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YT-Telechargeur.vbs"
> "%CIBLE%" echo CreateObject("WScript.Shell").Run """%~dp0demarrer.vbs""", 0, False
echo.
echo C'est fait : le serveur demarrera tout seul a chaque allumage du PC.
echo (Pour annuler : supprime le fichier
echo  %CIBLE% )
echo.
start "" wscript "%~dp0demarrer.vbs"
pause

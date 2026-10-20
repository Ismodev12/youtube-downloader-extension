' Lance le serveur YT Telechargeur en arriere-plan, sans fenetre noire.
Option Explicit
Dim fso, sh, dossier, script, ok, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dossier = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dossier
script = """" & dossier & "\serveur.py"""

' 1) Demarre le serveur tout de suite (pythonw = Python sans fenetre)
ok = False
For Each cmd In Array("pythonw", "pyw")
  If Not ok Then
    On Error Resume Next
    Err.Clear
    sh.Run cmd & " " & script, 0, False
    If Err.Number = 0 Then ok = True
    On Error GoTo 0
  End If
Next

If Not ok Then
  MsgBox "Impossible de lancer Python (pythonw introuvable)." & vbCrLf & _
         "Lance diagnostic.bat pour voir le probleme.", vbExclamation, "YT Telechargeur"
  WScript.Quit 1
End If

' 2) Met yt-dlp a jour en arriere-plan (pris en compte au prochain demarrage)
On Error Resume Next
sh.Run "python -m pip install --upgrade --quiet ""yt-dlp[default]""", 0, False

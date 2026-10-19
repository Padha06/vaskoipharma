@echo off
title Push Vaskoi Biopharma to GitHub
echo ========================================================
echo   Pushing Vaskoi Biopharma to github.com/Padha06/vaskoi
echo ========================================================
set "PATH=C:\Users\lenovo\AppData\Local\Programs\Git\cmd;%PATH%"
cd /d "c:\Pharma"
git push -u origin main --force
echo.
echo If prompt requested credentials, enter your GitHub PAT or sign in.
echo ========================================================
pause

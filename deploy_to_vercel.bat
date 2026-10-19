@echo off
title Deploy to Vercel - vaskoipharma
echo ========================================================
echo   Deploying Vaskoi Biopharma to Vercel (Project: vaskoipharma)
echo ========================================================
set "PATH=C:\Users\lenovo\AppData\Local\Programs\NodeJS;C:\Users\lenovo\AppData\Local\Programs\Git\cmd;%PATH%"
cd /d "c:\Pharma"
call vercel.cmd --prod --name vaskoipharma --yes
echo ========================================================
echo   Deployment completed!
echo ========================================================
pause

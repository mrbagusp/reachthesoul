@echo off
title RTS Lead Scraper
cd /d "D:\REACH THE SOUL\reachthesoul-ready\reachthesoul"
set GOOGLE_PLACES_API_KEY=AIzaSyBKM1xMcb57AQznRFcLyb1KoPl3gM-edC4

:MENU
cls
echo.
echo  ==========================================
echo    RTS LEAD SCRAPER - ReachTheSoul
echo    Automated Lead Generation for Churches
echo  ==========================================
echo.
echo   GEREJA (Google Places)
echo     1. Gereja di Indonesia (5 kota besar)
echo     2. Gereja di Jakarta (detail per wilayah)
echo     3. Churches in USA (5 cities)
echo     4. Churches in Africa (5 cities)
echo     5. Churches in Asia Pacific (5 cities)
echo.
echo   MINISTRY (Media/Prayer/Counseling)
echo     6. Semua Ministry Global (50+ organisasi)
echo     7. Ministry di Indonesia saja
echo     8. Ministry di Africa saja
echo     9. Ministry di Asia saja
echo.
echo   CUSTOM
echo     10. Custom search (ketik sendiri)
echo.
echo   TOOLS
echo     11. Buka folder hasil CSV
echo     12. Kirim email campaign (buka browser)
echo.
echo     0. Keluar
echo.
set /p choice="  Pilih nomor: "

if "%choice%"=="1" goto INDO_CHURCH
if "%choice%"=="2" goto JAKARTA_DETAIL
if "%choice%"=="3" goto USA_CHURCH
if "%choice%"=="4" goto AFRICA_CHURCH
if "%choice%"=="5" goto APAC_CHURCH
if "%choice%"=="6" goto ALL_MINISTRY
if "%choice%"=="7" goto INDO_MINISTRY
if "%choice%"=="8" goto AFRICA_MINISTRY
if "%choice%"=="9" goto ASIA_MINISTRY
if "%choice%"=="10" goto CUSTOM
if "%choice%"=="11" goto OPEN_FOLDER
if "%choice%"=="12" goto OPEN_CAMPAIGN
if "%choice%"=="0" exit
echo  Pilihan tidak valid.
pause
goto MENU

:INDO_CHURCH
echo.
echo  Scraping gereja di Indonesia...
call node scrape-leads.js "church" "Jakarta,Surabaya,Bandung,Medan,Semarang"
echo.
call node scrape-leads.js "gereja" "Jakarta,Surabaya,Bandung,Medan,Semarang"
echo.
echo  Selesai!
pause
goto MENU

:JAKARTA_DETAIL
echo.
echo  Scraping gereja di Jakarta detail...
call node scrape-leads.js "church" "Jakarta Selatan,Jakarta Utara,Jakarta Barat,Jakarta Timur,Jakarta Pusat"
echo.
call node scrape-leads.js "gereja" "Jakarta Selatan,Jakarta Utara,Jakarta Barat,Jakarta Timur,Jakarta Pusat"
echo.
call node scrape-leads.js "church" "Tangerang,Bekasi,Depok,Bogor"
echo.
echo  Selesai!
pause
goto MENU

:USA_CHURCH
echo.
echo  Scraping churches in USA...
call node scrape-leads.js "church" "Dallas,Nashville,Atlanta,Houston,Charlotte"
echo.
call node scrape-leads.js "church" "Los Angeles,New York,Chicago,Phoenix,San Antonio"
echo.
echo  Done!
pause
goto MENU

:AFRICA_CHURCH
echo.
echo  Scraping churches in Africa...
call node scrape-leads.js "church" "Lagos,Nairobi,Accra,Kampala,Johannesburg"
echo.
call node scrape-leads.js "church" "Addis Ababa,Dar es Salaam,Kinshasa,Lusaka,Harare"
echo.
echo  Done!
pause
goto MENU

:APAC_CHURCH
echo.
echo  Scraping churches in Asia Pacific...
call node scrape-leads.js "church" "Manila,Singapore,Kuala Lumpur,Bangkok,Seoul"
echo.
call node scrape-leads.js "church" "Sydney,Melbourne,Auckland,Hong Kong,Taipei"
echo.
echo  Done!
pause
goto MENU

:ALL_MINISTRY
echo.
echo  Scraping ALL known ministries globally...
echo  Ini akan memakan waktu 15-30 menit.
echo.
set /p confirm="  Lanjutkan? (y/n): "
if /i not "%confirm%"=="y" goto MENU
call node scrape-ministries.js
echo.
echo  Selesai!
pause
goto MENU

:INDO_MINISTRY
echo.
echo  Scraping ministry di Indonesia...
call node scrape-ministries.js --country=Indonesia
echo.
echo  Selesai!
pause
goto MENU

:AFRICA_MINISTRY
echo.
echo  Scraping ministry di Africa...
call node scrape-ministries.js --country=Nigeria
call node scrape-ministries.js --country=Kenya
call node scrape-ministries.js --country=Ghana
echo.
echo  Done!
pause
goto MENU

:ASIA_MINISTRY
echo.
echo  Scraping ministry di Asia...
call node scrape-ministries.js --country=Philippines
call node scrape-ministries.js --country=India
call node scrape-ministries.js --country=Singapore
echo.
echo  Done!
pause
goto MENU

:CUSTOM
echo.
set /p query="  Search query (e.g. church, gereja, prayer ministry): "
set /p cities="  Cities (comma separated): "
echo.
call node scrape-leads.js "%query%" "%cities%"
echo.
echo  Selesai!
pause
goto MENU

:OPEN_FOLDER
explorer "D:\REACH THE SOUL\reachthesoul-ready\reachthesoul"
goto MENU

:OPEN_CAMPAIGN
start https://reachthesoul.org/dashboard/platform/campaigns
goto MENU
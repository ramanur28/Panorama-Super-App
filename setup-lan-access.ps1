# ==============================================================================
# Panorama Super App - Script Penghubung Akses HP (Wi-Fi Lokal) ke WSL2
# Jalankan script ini dengan klik kanan -> "Run with PowerShell" (As Administrator)
# ==============================================================================

# Pastikan berjalan sebagai Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "PERHATIAN: Harap jalankan script ini sebagai Administrator (Run as Administrator)!" -ForegroundColor Red
    Write-Host "Klik kanan file ini -> 'Run with PowerShell' atau buka PowerShell as Admin." -ForegroundColor Yellow
    Pause
    exit
}

Write-Host "Mendeteksi konfigurasi jaringan Windows & WSL2..." -ForegroundColor Cyan

# Dapatkan IP WSL2 secara dinamis
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
Write-Host "IP Internal WSL2 : $wslIp" -ForegroundColor DarkCyan

# Dapatkan IP Wi-Fi Windows
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*WLAN*" -or $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress
Write-Host "IP Wi-Fi Laptop   : $wifiIp" -ForegroundColor DarkCyan

# 1. Reset & Konfigurasi Port Forwarding (Portproxy 5173)
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null | Out-Null
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wslIp

# 2. Izinkan Port 5173 di Windows Defender Firewall
netsh advfirewall firewall delete rule name="WSL2 Panorama Super App 5173" 2>$null | Out-Null
netsh advfirewall firewall add rule name="WSL2 Panorama Super App 5173" dir=in action=allow protocol=TCP localport=5173 | Out-Null

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " BERHASIL DIHUBUNGKAN! PORT PROXY & FIREWALL AKTIF" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Silakan buka browser (Chrome / Safari) di HP Anda yang tersambung ke Wi-Fi yang sama:" -ForegroundColor White
Write-Host ""
Write-Host "   👉  http://${wifiIp}:5173" -ForegroundColor Yellow -NoNewline
Write-Host "  👈" -ForegroundColor Yellow
Write-Host ""
Write-Host "Aplikasi Panorama Super App sekarang dapat langsung diakses dari ponsel Anda!" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Pause

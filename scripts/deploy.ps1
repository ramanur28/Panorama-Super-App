<#
.SYNOPSIS
    Panorama Super App - Automated Local Build & VPS Deployment Script (PowerShell)
.DESCRIPTION
    Membangun Docker image secara lokal, mengunggah ke Docker Registry,
    dan melakukan deploy otomatis ke server VPS via SSH & Docker Compose.
.EXAMPLE
    .\scripts\deploy.ps1 -Host "123.45.67.89" -User "retdev"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Tag = "",

    [Parameter(Mandatory = $false)]
    [string]$RegistryUser = "retdev",

    [Parameter(Mandatory = $false)]
    [string]$Registry = "docker.io",

    [Parameter(Mandatory = $false)]
    [string]$VpsHost = "",

    [Parameter(Mandatory = $false)]
    [string]$VpsUser = "root",

    [Parameter(Mandatory = $false)]
    [int]$VpsPort = 22,

    [Parameter(Mandatory = $false)]
    [string]$VpsPath = "/opt/panorama-app",

    [Parameter(Mandatory = $false)]
    [string]$SshKey = "",

    [Parameter(Mandatory = $false)]
    [switch]$OnlyBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SyncEnv
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "  PANORAMA SUPER APP - AUTO DEPLOY DOCKER REGISTRY -> VPS (PS)  " -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Magenta

# Load .env file if available
$EnvFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $EnvFile) {
    Write-Host "[INFO] Memuat konfigurasi dari .env..." -ForegroundColor Cyan
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $key, $val = $line.Split("=", 2)
            if (-not [string]::IsNullOrEmpty($key)) {
                [Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim(), "Process")
            }
        }
    }
}

if (-not $Tag) {
    $Tag = (Get-Date -Format "yyyyMMdd_HHmmss")
}
if (-not $VpsHost -and $env:VPS_HOST) {
    $VpsHost = $env:VPS_HOST
}
if ($env:REGISTRY_USER) {
    $RegistryUser = $env:REGISTRY_USER
}
if ($env:DOCKER_REGISTRY) {
    $Registry = $env:DOCKER_REGISTRY
}

$FrontendImage = if ($Registry -eq "docker.io") { "$RegistryUser/panorama-frontend" } else { "$Registry/$RegistryUser/panorama-frontend" }
$BackendImage = if ($Registry -eq "docker.io") { "$RegistryUser/panorama-backend" } else { "$Registry/$RegistryUser/panorama-backend" }

Write-Host "[INFO] Target Registry : $Registry/$RegistryUser" -ForegroundColor Cyan
Write-Host "[INFO] Tag Versi       : $Tag dan latest" -ForegroundColor Cyan

# LANGKAH 1: BUILD & PUSH DOCKER IMAGES SECARA LOKAL
if (-not $SkipBuild) {
    Write-Host "`n>>> [LANGKAH 1/4] Membangun Docker Image Backend secara lokal..." -ForegroundColor Yellow
    docker build -f Dockerfile.backend -t "${BackendImage}:${Tag}" -t "${BackendImage}:latest" .
    if ($LASTEXITCODE -ne 0) { throw "Gagal membangun backend image" }
    Write-Host "✓ Build Backend Berhasil!" -ForegroundColor Green

    Write-Host "`n>>> [LANGKAH 2/4] Membangun Docker Image Frontend React/Nginx secara lokal..." -ForegroundColor Yellow
    docker build -f Dockerfile.frontend -t "${FrontendImage}:${Tag}" -t "${FrontendImage}:latest" .
    if ($LASTEXITCODE -ne 0) { throw "Gagal membangun frontend image" }
    Write-Host "✓ Build Frontend Berhasil!" -ForegroundColor Green

    Write-Host "`n>>> [LANGKAH 3/4] Mengirim (Push) Image ke Docker Registry..." -ForegroundColor Yellow
    docker push "${BackendImage}:${Tag}"
    docker push "${BackendImage}:latest"
    docker push "${FrontendImage}:${Tag}"
    docker push "${FrontendImage}:latest"
    Write-Host "✓ Seluruh image berhasil di-push ke Docker Registry!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Melewati tahap build lokal (-SkipBuild aktif)." -ForegroundColor Yellow
}

if ($OnlyBuild) {
    Write-Host "`n=================================================================" -ForegroundColor Green
    Write-Host "  BUILD & PUSH KE REGISTRY SELESAI (-OnlyBuild aktif)           " -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
    exit 0
}

# LANGKAH 2: DEPLOY KE SERVER VPS
if (-not $VpsHost) {
    Write-Host "`n[PERHATIAN] Parameter VpsHost atau variabel VPS_HOST belum diatur." -ForegroundColor Yellow
    Write-Host "Jalankan ulang dengan: .\scripts\deploy.ps1 -VpsHost <IP_VPS_ANDA>" -ForegroundColor Green
    Write-Host "Image sudah tersedia di registry:" -ForegroundColor Cyan
    Write-Host "  - ${FrontendImage}:${Tag}"
    Write-Host "  - ${BackendImage}:${Tag}"
    exit 0
}

Write-Host "`n>>> [LANGKAH 4/4] Menghubungkan ke VPS (${VpsUser}@${VpsHost})..." -ForegroundColor Yellow

$SshOpts = @("-p", "$VpsPort", "-o", "StrictHostKeyChecking=no")
$ScpOpts = @("-P", "$VpsPort", "-o", "StrictHostKeyChecking=no")
if ($SshKey -and (Test-Path $SshKey)) {
    $SshOpts += @("-i", "$SshKey")
    $ScpOpts += @("-i", "$SshKey")
}

# 1. Buat direktori di VPS
ssh @SshOpts "${VpsUser}@${VpsHost}" "mkdir -p ${VpsPath}/database"

# 2. Transfer docker-compose & schema & .env
scp @ScpOpts docker-compose.yml "${VpsUser}@${VpsHost}:${VpsPath}/docker-compose.yml"
scp @ScpOpts database/schema.mysql.sql "${VpsUser}@${VpsHost}:${VpsPath}/database/schema.mysql.sql"

if (Test-Path ".env") {
    scp @ScpOpts .env "${VpsUser}@${VpsHost}:${VpsPath}/.env"
}

# 3. Jalankan Docker Compose Pull & Up
$FrontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "3005" }
$BackendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "4000" }
$RemoteCmd = "cd $VpsPath && export DOCKER_REGISTRY='$Registry' && export REGISTRY_USER='$RegistryUser' && export IMAGE_TAG='$Tag' && export FRONTEND_PORT='$FrontendPort' && export BACKEND_PORT='$BackendPort' && docker compose --env-file .env pull && docker compose --env-file .env up -d --remove-orphans && docker image prune -f && docker compose ps"
ssh @SshOpts "${VpsUser}@${VpsHost}" $RemoteCmd

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "  AUTO DEPLOYMENT KE SERVER VPS SELESAI DENGAN SUKSES!           " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Aplikasi dapat diakses di : http://${VpsHost}" -ForegroundColor Cyan
Write-Host "Versi Image               : $Tag" -ForegroundColor Cyan

#!/usr/bin/env bash
# =============================================================================
# PANORAMA SUPER APP - AUTOMATED LOCAL BUILD & VPS DEPLOYMENT SCRIPT
# Alur: Build Lokal -> Push Docker Registry -> SSH ke VPS -> Docker Compose Pull & Up
# =============================================================================

set -e

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}=================================================================${NC}"
echo -e "${PURPLE}  PANORAMA SUPER APP - AUTO DEPLOY DOCKER REGISTRY -> VPS        ${NC}"
echo -e "${PURPLE}=================================================================${NC}"

# Muat variabel lingkungan dari .env jika ada
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ -f ".env" ]; then
    echo -e "${BLUE}[INFO] Memuat konfigurasi dari .env...${NC}"
    # Export variabel tanpa menimpa yang sudah diset di environment shell
    set -a
    source .env
    set +a
fi

# Konfigurasi default
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
REGISTRY_USER="${REGISTRY_USER:-retdev}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
IMAGE_TAG="${IMAGE_TAG:-$TIMESTAMP}"

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
VPS_DEPLOY_PATH="${VPS_DEPLOY_PATH:-/opt/panorama-app}"
VPS_SSH_KEY="${VPS_SSH_KEY:-}"

ONLY_BUILD=false
SKIP_BUILD=false
SYNC_ENV=false

# Parsing argumen baris perintah
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --user)
            REGISTRY_USER="$2"
            shift 2
            ;;
        --registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        --host)
            VPS_HOST="$2"
            shift 2
            ;;
        --vps-user)
            VPS_USER="$2"
            shift 2
            ;;
        --key)
            VPS_SSH_KEY="$2"
            shift 2
            ;;
        --only-build)
            ONLY_BUILD=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --sync-env)
            SYNC_ENV=true
            shift
            ;;
        --help|-h)
            echo "Penggunaan: ./scripts/deploy.sh [opsi]"
            echo "Opsi:"
            echo "  --tag <version>       Set tag rilis image (default: timestamp)"
            echo "  --user <username>     Set akun/namespace Docker Registry (default: retdev)"
            echo "  --registry <domain>   Set domain registry (default: docker.io)"
            echo "  --host <ip_vps>       Set IP address / hostname VPS"
            echo "  --vps-user <user>     Set user SSH VPS (default: root)"
            echo "  --key <path_key>      Path ke SSH private key"
            echo "  --only-build          Hanya lakukan build dan push lokal (tanpa deploy ke VPS)"
            echo "  --skip-build          Lewati build lokal, langsung jalankan pull & deploy di VPS"
            echo "  --sync-env            Sinkronkan file .env lokal ke VPS"
            exit 0
            ;;
        *)
            echo -e "${RED}[ERROR] Argumen tidak dikenal: $1${NC}"
            exit 1
            ;;
    esac
done

# Penamaan Image
if [ "$DOCKER_REGISTRY" = "docker.io" ]; then
    FRONTEND_IMAGE="${REGISTRY_USER}/panorama-frontend"
    BACKEND_IMAGE="${REGISTRY_USER}/panorama-backend"
else
    FRONTEND_IMAGE="${DOCKER_REGISTRY}/${REGISTRY_USER}/panorama-frontend"
    BACKEND_IMAGE="${DOCKER_REGISTRY}/${REGISTRY_USER}/panorama-backend"
fi

echo -e "${BLUE}[INFO] Target Registry : ${GREEN}${DOCKER_REGISTRY}/${REGISTRY_USER}${NC}"
echo -e "${BLUE}[INFO] Tag Versi       : ${GREEN}${IMAGE_TAG}${NC} dan ${GREEN}latest${NC}"

# =============================================================================
# LANGKAH 1: BUILD DAN PUSH DOCKER IMAGES SECARA LOKAL
# =============================================================================
if [ "$SKIP_BUILD" = false ]; then
    echo -e "\n${YELLOW}>>> [LANGKAH 1/4] Membangun Docker Image Backend secara lokal...${NC}"
    docker build \
        -f Dockerfile.backend \
        -t "${BACKEND_IMAGE}:${IMAGE_TAG}" \
        -t "${BACKEND_IMAGE}:latest" \
        .
    echo -e "${GREEN}✓ Build Backend Berhasil!${NC}"

    echo -e "\n${YELLOW}>>> [LANGKAH 2/4] Membangun Docker Image Frontend React/Nginx secara lokal...${NC}"
    docker build \
        -f Dockerfile.frontend \
        -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
        -t "${FRONTEND_IMAGE}:latest" \
        .
    echo -e "${GREEN}✓ Build Frontend Berhasil!${NC}"

    echo -e "\n${YELLOW}>>> [LANGKAH 3/4] Mengirim (Push) Image ke Docker Registry...${NC}"
    echo -e "${BLUE}Pushing backend: ${BACKEND_IMAGE}:${IMAGE_TAG} & latest...${NC}"
    docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"
    docker push "${BACKEND_IMAGE}:latest"

    echo -e "${BLUE}Pushing frontend: ${FRONTEND_IMAGE}:${IMAGE_TAG} & latest...${NC}"
    docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"
    docker push "${FRONTEND_IMAGE}:latest"
    echo -e "${GREEN}✓ Seluruh image berhasil di-push ke Docker Registry!${NC}"
else
    echo -e "${YELLOW}[INFO] Melewati tahap build dan push lokal (--skip-build).${NC}"
fi

if [ "$ONLY_BUILD" = true ]; then
    echo -e "\n${GREEN}=================================================================${NC}"
    echo -e "${GREEN}  BUILD & PUSH KE REGISTRY SELESAI (--only-build aktif)         ${NC}"
    echo -e "${GREEN}=================================================================${NC}"
    exit 0
fi

# =============================================================================
# LANGKAH 2: DEPLOY KE SERVER VPS MENGGUNAKAN DOCKER COMPOSE
# =============================================================================
if [ -z "$VPS_HOST" ]; then
    echo -e "\n${YELLOW}[PERHATIAN] Variabel VPS_HOST belum diatur.${NC}"
    echo -e "Silakan isi VPS_HOST di file .env atau jalankan ulang dengan:"
    echo -e "${GREEN}./scripts/deploy.sh --host <IP_VPS_ANDA>${NC}\n"
    echo -e "Image Anda sudah siap di Docker Registry:"
    echo -e "  - ${FRONTEND_IMAGE}:${IMAGE_TAG}"
    echo -e "  - ${BACKEND_IMAGE}:${IMAGE_TAG}"
    exit 0
fi

echo -e "\n${YELLOW}>>> [LANGKAH 4/4] Menghubungkan ke VPS (${VPS_USER}@${VPS_HOST})...${NC}"

# Konfigurasi SSH & SCP options (-p untuk ssh, -P untuk scp)
SSH_OPTS="-p ${VPS_SSH_PORT} -o StrictHostKeyChecking=no"
SCP_OPTS="-P ${VPS_SSH_PORT} -o StrictHostKeyChecking=no"

if [ -n "$VPS_SSH_KEY" ]; then
    # Ekspansi tilde jika ada
    EXPANDED_KEY="${VPS_SSH_KEY/#\~/$HOME}"
    if [ -f "$EXPANDED_KEY" ]; then
        SSH_OPTS="$SSH_OPTS -i $EXPANDED_KEY"
        SCP_OPTS="$SCP_OPTS -i $EXPANDED_KEY"
    fi
fi

# 1. Buat direktori kerja di VPS (dengan fallback sudo jika berada di /var/www)
echo -e "${BLUE}Menyiapkan direktori kerja di VPS (${VPS_DEPLOY_PATH})...${NC}"
ssh $SSH_OPTS "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_DEPLOY_PATH}/database 2>/dev/null || (sudo mkdir -p ${VPS_DEPLOY_PATH}/database && sudo chown -R ${VPS_USER} ${VPS_DEPLOY_PATH})"

# 2. Transfer file konfigurasi (docker-compose.yml, skema MySQL, dan .env)
echo -e "${BLUE}Mentransfer file konfigurasi ke VPS...${NC}"
scp $SCP_OPTS docker-compose.yml "${VPS_USER}@${VPS_HOST}:${VPS_DEPLOY_PATH}/docker-compose.yml"
scp $SCP_OPTS database/schema.mysql.sql "${VPS_USER}@${VPS_HOST}:${VPS_DEPLOY_PATH}/database/schema.mysql.sql"

if [ -f ".env" ]; then
    echo -e "${BLUE}Menyinkronkan file .env konfigurasi ke VPS...${NC}"
    scp $SCP_OPTS .env "${VPS_USER}@${VPS_HOST}:${VPS_DEPLOY_PATH}/.env"
fi

# 3. Jalankan Docker Compose Pull & Up di VPS
echo -e "${BLUE}Menjalankan Docker Compose di VPS...${NC}"
ssh $SSH_OPTS "${VPS_USER}@${VPS_HOST}" "bash -s" << REMOTE_SCRIPT
set -e
cd "${VPS_DEPLOY_PATH}"

# Ekspor variabel runtime untuk compose
export DOCKER_REGISTRY="${DOCKER_REGISTRY}"
export REGISTRY_USER="${REGISTRY_USER}"
export IMAGE_TAG="${IMAGE_TAG}"
export FRONTEND_PORT="${FRONTEND_PORT:-3005}"
export BACKEND_PORT="${BACKEND_PORT:-4000}"

echo ">> Mengunduh image terbaru dari registry..."
docker compose --env-file .env pull 2>/dev/null || docker compose pull

echo ">> Menjalankan kontainer layanan (db, backend, frontend)..."
docker compose --env-file .env up -d --remove-orphans

echo ">> Membersihkan image lama yang tidak terpakai..."
docker image prune -f

echo ">> Memeriksa status kontainer..."
docker compose ps
REMOTE_SCRIPT

# 4. Verifikasi Health Endpoint
echo -e "\n${BLUE}Memverifikasi kesehatan kontainer di VPS...${NC}"
sleep 5

# Cek internal endpoint via SSH langsung ke backend port
INTERNAL_HEALTH=$(ssh $SSH_OPTS "${VPS_USER}@${VPS_HOST}" "curl -s http://127.0.0.1:${BACKEND_PORT:-4000}/api/health || true")

if [[ "$INTERNAL_HEALTH" =~ "centralized_mysql_online" ]]; then
    echo -e "${GREEN}✓ Backend & Database MySQL di VPS berjalan normal (status: ok)!${NC}"
else
    echo -e "${YELLOW}! Catatan: Database/backend mungkin masih dalam proses booting inisialisasi.${NC}"
    echo -e "Silakan pantau log kontainer di VPS dengan: ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_DEPLOY_PATH} && docker compose logs -f'${NC}"
fi

echo -e "\n${GREEN}=================================================================${NC}"
echo -e "${GREEN}  AUTO DEPLOYMENT KE SERVER VPS SELESAI DENGAN SUKSES!           ${NC}"
echo -e "${GREEN}=================================================================${NC}"
echo -e "Port Internal Frontend (Web) : ${GREEN}127.0.0.1:${FRONTEND_PORT:-3005}${NC} (di-proxy oleh Caddy)"
echo -e "Port Internal Backend (API)  : ${GREEN}127.0.0.1:${BACKEND_PORT:-4000}${NC} (di-proxy oleh Caddy)"
echo -e "Versi Image Terpasang        : ${GREEN}${IMAGE_TAG}${NC}"
echo -e "================================================================="

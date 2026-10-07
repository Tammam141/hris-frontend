#!/usr/bin/env bash
# Dijalankan di VM oleh GitHub Actions lewat SSH, atau manual:
#   bash scripts/deploy.sh <commit-sha>     memasang versi tertentu (rollback)
#   bash scripts/deploy.sh latest
# Kunci deploy di authorized_keys VM dibatasi hanya boleh menjalankan
# skrip ini. Tag dari Actions sampai lewat SSH_ORIGINAL_COMMAND
set -euo pipefail

# Dibungkus fungsi supaya git checkout yang ikut memperbarui berkas ini
# tidak mengacaukan skrip yang sedang berjalan
main() {
  local tag="${SSH_ORIGINAL_COMMAND:-${1:-latest}}"

  if [[ ! "$tag" =~ ^([0-9a-f]{7,40}|latest)$ ]]; then
    echo "Tag tidak valid: $tag" >&2
    exit 1
  fi

  cd "$(dirname "$(readlink -f "$0")")/.."

  if ! docker network inspect hris-backend_default > /dev/null 2>&1; then
    echo "Jaringan hris-backend_default belum ada. Nyalakan backend dulu." >&2
    exit 1
  fi

  echo "==> Memperbarui berkas deploy dari main"
  git fetch --quiet origin main
  git checkout --quiet --force -B main origin/main

  export IMAGE_TAG="$tag"

  echo "==> Menarik image $IMAGE_TAG"
  docker compose pull frontend

  echo "==> Menyalakan versi baru"
  docker compose up -d --no-build --remove-orphans

  echo "==> Menunggu /healthz"
  for _ in $(seq 1 15); do
    if curl -fsS http://127.0.0.1:3000/healthz > /dev/null 2>&1; then
      echo "==> Berhasil, berjalan dengan image $IMAGE_TAG"
      docker image prune -f > /dev/null
      exit 0
    fi
    sleep 2
  done

  echo "==> /healthz tidak menjawab dalam 30 detik. Log terakhir:" >&2
  docker compose logs --tail 50 frontend >&2
  exit 1
}

main "$@"

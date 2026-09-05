#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  bash scripts/github-publish.sh [opções]

Opções:
  --repo OWNER/REPO     Define o repositório alvo.
  --owner OWNER         Define o dono do repositório.
  --name REPO           Define o nome do repositório.
  --private             Cria como privado.
  --public              Cria como público.
  --create              Cria o repositório no GitHub se ele não existir.
  --no-create           Não cria o repositório automaticamente.
  --message MSG         Mensagem do commit inicial.
  --branch BRANCH       Branch para push (default: branch atual ou main).
  -h, --help            Mostra esta ajuda.

Configuração opcional:
  .github-publish.env no diretório raiz do projeto.
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "${ROOT_DIR:-}" ]; then
  ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
cd "$ROOT_DIR"

CONFIG_FILE="${GITHUB_PUBLISH_CONFIG:-$ROOT_DIR/.github-publish.env}"
if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

OWNER="${GITHUB_OWNER:-${GITHUB_ORG:-}}"
REPO="${GITHUB_REPO:-}"
VISIBILITY="${GITHUB_VISIBILITY:-public}"
CREATE_REPO="${GITHUB_CREATE_REPO:-1}"
REMOTE_NAME="${GITHUB_REMOTE:-origin}"
BRANCH="${GITHUB_BRANCH:-}"
MESSAGE="${GIT_COMMIT_MESSAGE:-chore: initial commit}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      IFS='/' read -r OWNER REPO <<< "$2"
      shift 2
      ;;
    --owner)
      OWNER="$2"
      shift 2
      ;;
    --name)
      REPO="$2"
      shift 2
      ;;
    --private)
      VISIBILITY="private"
      shift
      ;;
    --public)
      VISIBILITY="public"
      shift
      ;;
    --create)
      CREATE_REPO=1
      shift
      ;;
    --no-create)
      CREATE_REPO=0
      shift
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "$REPO" ]; then
  REPO="$(basename "$ROOT_DIR")"
fi

if [ -z "$BRANCH" ]; then
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  BRANCH="${BRANCH:-main}"
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Erro: defina GITHUB_TOKEN no ambiente ou em .github-publish.env" >&2
  exit 1
fi

if [ -z "$OWNER" ]; then
  OWNER="$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python -c 'import sys, json; print(json.load(sys.stdin)["login"])')"
fi

repo_exists() {
  local api_url="https://api.github.com/repos/$OWNER/$REPO"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: token $GITHUB_TOKEN" "$api_url")"
  [ "$code" = "200" ]
}

create_repo() {
  if [ "$CREATE_REPO" != "1" ]; then
    return 0
  fi

  if repo_exists; then
    return 0
  fi

  if [ -n "${GITHUB_ORG:-}" ]; then
    curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/orgs/"$OWNER"/repos \
      -d "$(python - <<'PY'
import json, os
print(json.dumps({
    'name': os.environ['REPO'],
    'private': os.environ.get('VISIBILITY', 'public') == 'private',
    'auto_init': False,
    'description': os.environ.get('GITHUB_DESCRIPTION', '')
}))
PY
)" >/dev/null
  else
    curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/user/repos \
      -d "$(python - <<'PY'
import json, os
print(json.dumps({
    'name': os.environ['REPO'],
    'private': os.environ.get('VISIBILITY', 'public') == 'private',
    'auto_init': False,
    'description': os.environ.get('GITHUB_DESCRIPTION', '')
}))
PY
)" >/dev/null
  fi
}

export REPO VISIBILITY
create_repo

REMOTE_URL="https://github.com/$OWNER/$REPO.git"
if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote set-url "$REMOTE_NAME" "$REMOTE_URL"
else
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  if [ -n "$(git diff --cached --name-only)" ]; then
    git commit -m "$MESSAGE"
  fi
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "Erro: não há commit para enviar. Faça alterações ou adicione arquivos antes de executar." >&2
  exit 1
fi

git push -u "$REMOTE_NAME" "$BRANCH"

echo "OK: projeto enviado para https://github.com/$OWNER/$REPO"
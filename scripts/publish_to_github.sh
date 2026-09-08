#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE_SSH="git@github.com:InfraVul/InfraVul.github.io.git"

echo "[STEP 1] check git"
if ! command -v git >/dev/null 2>&1; then
    echo "[FATAL] git is not installed." >&2
    exit 2
fi

echo "[STEP 2] privacy guard"
python3 scripts/check_public_repo.py .

echo "[STEP 3] initialize git repository"
if [[ ! -d .git ]]; then
    git init
fi

git branch -M main

echo "[STEP 4] configure git identity"
git config user.name "InfraVul"
git config user.email "InfraVul@users.noreply.github.com"

echo "[STEP 5] stage files"
git add .

git status --short

echo "[STEP 6] final privacy guard"
python3 scripts/check_public_repo.py .

echo "[STEP 7] create commit"
if ! git diff --cached --quiet; then
    git commit -m "Publish Agent-CWE benchmark website"
else
    echo "[INFO] no new staged changes to commit"
fi

echo "[STEP 8] configure remote"
if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REMOTE_SSH"
else
    git remote add origin "$REMOTE_SSH"
fi

echo
echo "[REMOTE]"
git remote -v

echo
echo "[STEP 9] test remote access"
git ls-remote "$REMOTE_SSH" >/dev/null

echo
echo "[STEP 10] push main"
git push -u origin main

echo
echo "============================================================"
echo "[OK] pushed successfully"
echo "Repository: https://github.com/InfraVul/InfraVul.github.io"
echo "Website:    https://InfraVul.github.io/"
echo "============================================================"
echo
echo "For the first deployment:"
echo "GitHub -> Repository -> Settings -> Pages"
echo "Build and deployment -> Source -> GitHub Actions"

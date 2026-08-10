#!/bin/bash
# OOP Tutor Web — Update Production
# Pulls latest main branch and restarts containers
# Run from project root: ./scripts/update-prod.sh

set -e

echo "🔄 Updating OOP Tutor Web — Production"

# Pull latest from main
git fetch origin
git checkout main
git pull origin main

echo "✅ Code updated to: $(git log --oneline -1)"

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

echo "✅ Production updated and restarted!"
echo "   Version: $(git describe --tags --abbrev=0)"

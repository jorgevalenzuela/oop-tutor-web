#!/bin/bash
# OOP Tutor Web — Start Development
# Run from project root: ./scripts/start-dev.sh

set -e

echo "🛠  Starting OOP Tutor Web — Development"

# Check Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama is not running. Start it with: ollama serve"
    exit 1
fi
echo "✅ Ollama running"

# Load environment
if [ ! -f .env.development ]; then
    echo "❌ .env.development not found. Copy .env.production.example and fill in values."
    exit 1
fi
export $(cat .env.development | grep -v '^#' | xargs)

# Start dev containers
docker compose -f docker-compose.dev.yml up -d --build

echo ""
echo "✅ OOP Tutor Web — Dev is running!"
echo "   Frontend:   http://localhost:5174"
echo "   RAG API:    http://localhost:8001"
echo "   Assessment: http://localhost:3003"
echo ""
echo "   Logs: docker compose -f docker-compose.dev.yml logs -f"
echo "   Stop: docker compose -f docker-compose.dev.yml down"

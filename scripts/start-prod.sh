#!/bin/bash
# OOP Tutor Web — Start Production
# Run from project root: ./scripts/start-prod.sh

set -e

echo "🚀 Starting OOP Tutor Web — Production"

# Check Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama is not running. Start it with: ollama serve"
    exit 1
fi

# Check models are available
echo "✅ Ollama running"
ollama list | grep -q "gemma2:9b" || { echo "❌ gemma2:9b not found. Run: ollama pull gemma2:9b"; exit 1; }
ollama list | grep -q "mxbai-embed-large" || { echo "❌ mxbai-embed-large not found. Run: ollama pull mxbai-embed-large"; exit 1; }
echo "✅ Models available"

# Load environment
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found. Copy .env.production.example and fill in values."
    exit 1
fi
export $(cat .env.production | grep -v '^#' | xargs)

# Start production containers
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "✅ OOP Tutor Web is running!"
echo "   Production: https://tutor.cs.university.edu"
echo ""
echo "   Logs: docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop: docker compose -f docker-compose.prod.yml down"

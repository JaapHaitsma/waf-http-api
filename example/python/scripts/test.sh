#!/bin/bash

# Test script for WAF HTTP API Python Example

set -e

echo "🧪 Running WAF HTTP API Python Example Tests..."

# Activate virtual environment
source .venv/bin/activate

# Install test dependencies
echo "📦 Installing test dependencies..."
pip install -r requirements-dev.txt

# Run tests with coverage
echo "🔍 Running tests..."
pytest -v --tb=short

echo "✅ All tests passed!"
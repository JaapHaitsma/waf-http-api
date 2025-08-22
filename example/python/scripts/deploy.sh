#!/bin/bash

# Deploy script for WAF HTTP API Python Example

set -e

echo "🚀 Deploying WAF HTTP API Python Example..."

# Activate virtual environment
source .venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run tests
echo "🧪 Running tests..."
pytest

# Synthesize CloudFormation template
echo "🔧 Synthesizing CloudFormation template..."
cdk synth

# Deploy to AWS
echo "☁️  Deploying to AWS..."
cdk deploy --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check the CloudFormation outputs for your API endpoints"
echo "2. Test your API using the CloudFront URL (recommended)"
echo "3. Monitor your resources in the AWS Console"
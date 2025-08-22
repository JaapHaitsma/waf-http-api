# Makefile for WAF HTTP API Python Example

.PHONY: help install test build deploy synth destroy clean

help: ## Show this help message
	@echo "WAF HTTP API Python Example"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@source .venv/bin/activate && pip install -r requirements.txt
	@source .venv/bin/activate && pip install -r requirements-dev.txt

test: ## Run tests
	@echo "🧪 Running tests..."
	@source .venv/bin/activate && pytest -v

build: ## Build (synthesize CloudFormation template)
	@echo "🔧 Synthesizing CloudFormation template..."
	@source .venv/bin/activate && cdk synth

deploy: ## Deploy to AWS
	@echo "🚀 Deploying to AWS..."
	@source .venv/bin/activate && cdk deploy --require-approval never

synth: build ## Alias for build

destroy: ## Destroy AWS resources
	@echo "🗑️  Destroying AWS resources..."
	@source .venv/bin/activate && cdk destroy --force

clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf cdk.out/
	@rm -rf .pytest_cache/
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@find . -type f -name "*.pyc" -delete

setup: ## Initial setup (create venv and install dependencies)
	@echo "🏗️  Setting up Python environment..."
	@python3 -m venv .venv
	@source .venv/bin/activate && pip install --upgrade pip
	@make install
	@echo "✅ Setup complete! Run 'source .venv/bin/activate' to activate the virtual environment."
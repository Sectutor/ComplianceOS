#!/bin/bash

# AI Integration Setup Script
# Run with: bash scripts/setup-ai-integration.sh

set -e

echo "🚀 ComplianceOS AI Integration Setup"
echo "======================================"
echo ""

# Step 1: Install Dependencies
echo "📦 Step 1: Installing AI provider SDKs..."
npm install @anthropic-ai/sdk @google/generative-ai --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""

# Step 2: Check Database Connection
echo "🗄️  Step 2: Checking database connection..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
    echo ""
    echo "⚠️  MANUAL STEP REQUIRED:"
    echo "   Run the following command to apply the migration:"
    echo "   psql -U your_user -d your_database -f migrations/001_add_pgvector.sql"
    echo ""
else
    echo "⚠️  PostgreSQL client not found in PATH"
    echo "   Please install PostgreSQL client or run migration manually"
fi

echo ""

# Step 3: Run Tests
echo "🧪 Step 3: Running test suite..."
npx tsx scripts/test-ai-features.ts

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed - this is expected if LLM provider is not configured yet"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Run database migration (see command above)"
echo "2. Configure LLM provider in Admin → LLM Settings"
echo "3. Test with: npx tsx scripts/test-ai-features.ts"
echo ""
echo "See quick-start.md for detailed instructions"

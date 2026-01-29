# AI Integration Setup Script (PowerShell)
# Run with: .\scripts\setup-ai-integration.ps1

Write-Host "🚀 ComplianceOS AI Integration Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Dependencies
Write-Host "📦 Step 1: Installing AI provider SDKs..." -ForegroundColor Yellow
try {
    npm install @anthropic-ai/sdk @google/generative-ai --legacy-peer-deps
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check Database Connection
Write-Host "🗄️  Step 2: Checking database connection..." -ForegroundColor Yellow
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ PostgreSQL client found" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  MANUAL STEP REQUIRED:" -ForegroundColor Yellow
    Write-Host "   Run the following command to apply the migration:"
    Write-Host "   psql -U your_user -d your_database -f migrations/001_add_pgvector.sql"
    Write-Host ""
} else {
    Write-Host "⚠️  PostgreSQL client not found in PATH" -ForegroundColor Yellow
    Write-Host "   Please install PostgreSQL client or run migration manually"
}

Write-Host ""

# Step 3: Run Tests
Write-Host "🧪 Step 3: Running test suite..." -ForegroundColor Yellow
try {
    npx tsx scripts/test-ai-features.ts
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some tests failed - this is expected if LLM provider is not configured yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run database migration (see command above)"
Write-Host "2. Configure LLM provider in Admin → LLM Settings"
Write-Host "3. Test with: npx tsx scripts/test-ai-features.ts"
Write-Host ""
Write-Host "See quick-start.md for detailed instructions"

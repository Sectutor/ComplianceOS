# Simple CI Setup for ComplianceOS

This document explains the simple CI/CD setup that protects your development environment.

## What It Does

When you create a Pull Request (PR), the CI will automatically:

1. **Run tests** - Checks if your code works
2. **Type check** - Ensures no TypeScript errors
3. **Build** - Verifies the app compiles

This prevents bad code from breaking your `main` branch!

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Production code (protected) |
| `dev` | Development branch |
| `staging` | Testing before production |

## How to Use

### 1. Make Changes

```bash
# Create a new branch for your changes
git checkout -b fix/some-bug

# Make your changes, then commit
git add .
git commit -m "Fixed the bug"
```

### 2. Push and Create PR

```bash
# Push your branch
git push origin fix/some-bug

# Go to GitHub and create a Pull Request
# Link: https://github.com/Sectutor/ComplianceOS/compare/main...fix/some-bug
```

### 3. Wait for CI

The CI will run automatically. You'll see:
- ✅ Green checkmark = tests passed
- ❌ Red X = something failed

### 4. Merge

Once CI passes and you get approval, merge your PR!

## Setting Up Branch Protection

To protect your `main` branch from direct pushes:

1. Go to: https://github.com/Sectutor/ComplianceOS/settings/branches
2. Click "Add rule"
3. Enter `main` as branch name
4. Check these options:
   - ✅ "Require pull request reviews before merging" (1 review)
   - ✅ "Require status checks to pass before merging"
   - ✅ "Require branches to be up to date"
5. Click "Save changes"

That's it! Now you can't push directly to main - you must use PRs.

## Common Issues

### CI Failed
Check the error in the "Actions" tab on GitHub. Common fixes:
- Run `npm run test` locally to see errors
- Run `npm run check` to see TypeScript errors

### Need to Test Locally First
```bash
# Run tests
npm run test

# Run type check
npm run check

# Build locally
npm run build
```

## What to Do Next

After you're comfortable with this setup, you can add:

1. **Staging deployment** - Auto-deploy to a test server
2. **Production deployment** - Deploy when you create a version tag
3. **Secret management** - Store API keys securely

But for now, this basic setup will protect your code!

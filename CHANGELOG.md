# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Continuous Control Monitoring (P0)
- Wired the control auto-test engine into tRPC via a new controlMonitoring router (runControlAutoTest, runAllForClient, history) mounted on the app router.
- Added an offline guard to the control auto-test scheduler so an unreachable/non-local database logs once and skips instead of spamming TLS errors.
- Added dbUrl helper (resolveDatabaseUrl, createSafePgOptions) used by the addon init path and schedulers for safe local/remote connection handling.

### Automated Evidence Collection (P0)
- Added an evidence collection scheduler (evidenceScheduler.ts) that runs due evidence rows through the collector registry and persists collected artifacts.
- Added a generic HTTP/API evidence collector (manifest-driven, injectable fetcher, JSON payload normalization) alongside the existing GitHub collector.

### User Experience
- Added reusable PageHeader and StatCard UI components; migrated Controls, Evidence, Login, Security, Vendor List, and Client Policies pages to token-based styling with dark-mode support.
- Added primary-cta / primary-cta-hover color tokens (brand navy) for the default button variant.

### Testing
- Added unit tests: control auto-test engine (16), evidence scheduler (6), HTTP/API collector (13), plus edge cases for the cache manager and evidence collector. Suite: 192 tests across 12 files, 100% coverage on the 5 configured targets.

### Reliability
- Standardized tRPC server error logging with a correlation `errorId`, and sanitized internal error messages in production builds.
- Removed unsafe database URL logging from DB initialization while preserving useful connection lifecycle logging.
- Improved environment health-check logging to use structured server logging.

### Performance
- Fixed cache key generation for API response caching and corrected cache error-rate calculations.
- Optimized in-memory cache maintenance by adding LRU behavior and throttling expiration scans to reduce per-write overhead.
- Added runnable benchmark and load-test scripts under `scripts/performance/` to measure critical-path improvements.

### User Experience
- Improved Clients page reliability by removing noisy debug logs, adding a retryable error empty state, and validating required input before create.

### Testing
- Repaired root test imports by adding thin re-export entrypoints for `db`, `routers`, and `TrpcContext`.
- Added unit tests for business-logic utilities with edge-case coverage.
- Added coverage tooling and a `test:coverage` script, enforcing >=90% coverage for the targeted business-logic modules.


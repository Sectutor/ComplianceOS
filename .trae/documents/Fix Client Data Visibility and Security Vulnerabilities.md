I have identified the likely cause of the "client data not visible" issue, as well as a critical security vulnerability found during the investigation.

### 1. **Primary Issue: Case-Sensitive Framework Matching (Data Not Visible)**
*   **Problem:** The function `getControlsByFramework` in `db.ts` uses the case-sensitive SQL operator `LIKE`.
*   **Impact:** When the frontend requests a framework using lowercase (e.g., `"pci"`), it fails to match the database entries which are uppercase (e.g., `"PCI DSS v4.0"`). This results in **0 controls being assigned** to the client, making the client's compliance data appear empty or "not visible."
*   **Fix:** Switch from `like` to `ilike` (case-insensitive match) in `db.ts`.

### 2. **Secondary Issue: Unprotected API Endpoint (Security Risk)**
*   **Problem:** The `clientControls.get` procedure in `server/routers/clientControls.ts` is currently public (`publicProcedure`) and relies solely on the `id` parameter without verifying if the requesting user belongs to the client organization.
*   **Impact:** Any authenticated user could potentially view control details of another client by guessing the `id`.
*   **Fix:** Restrict this endpoint using `clientProcedure` or add an explicit ownership check, similar to the `update` procedure.

### Implementation Plan
1.  **Modify `db.ts`**:
    *   Import `ilike` from `drizzle-orm`.
    *   Update `getControlsByFramework` to use `ilike(controls.framework, ...)` instead of `like`.
2.  **Modify `server/routers/clientControls.ts`**:
    *   Change `get` procedure to use `clientProcedure` (requires `clientId` in input) OR add a manual membership check if `clientId` is unavailable in the context.
    *   *Note:* Since `get` currently only takes `id`, adding a manual check is safer to avoid breaking frontend calls that might not pass `clientId`.

I will proceed with these fixes to resolve the visibility issue and harden security.

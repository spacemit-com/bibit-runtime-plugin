# Runtime Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Bibit Runtime plugin console that exposes every non-chat Bianbu Agent Runtime management, configuration, monitoring, and diagnostic surface.

**Architecture:** Keep the Bibit plugin as a React settings contribution. Centralize operation IDs and DTOs in `src/runtime-contracts.ts`; route production calls through `deploy/real_runtime_proxy.py`; use `dev/main.tsx` for faithful in-memory mocks. The UI is a scoped Runtime Console with internal tabs, not a copy of the Runtime web console shell.

**Tech Stack:** React 19, Bibit Feature SDK, Vite, Python unittest adapter tests, current Bianbu Agent Runtime `/api/v1`.

**Spec:** `docs/superpowers/specs/2026-09-02-runtime-console-scope-design.md`

## Global Constraints

- Read `process.md` before development and append completed phase details afterward.
- Do not modify `bianbu-agent-runtime` source code.
- Define operation IDs and DTOs in `src/runtime-contracts.ts`.
- Keep settings contribution CSS scoped under `.runtime-*`.
- Do not fake production success when Runtime is unavailable.
- Target only current Runtime `/api/v1`; no historical compatibility.

---

### Task 1: Runtime Operation Contract Expansion

**Files:**
- Modify: `src/runtime-contracts.ts`
- Modify: `tests/test_runtime_adapter.py`

**Interfaces:**
- Produces: `RUNTIME_OPS` keys for capabilities, packages, plugins, plugin consoles, executions, Agent Top, logs, and Provider Capture.
- Produces: view DTOs consumed by `RuntimeSettingsPage.tsx` and `dev/main.tsx`.

- [x] **Step 1: Write failing adapter test**

Add `test_gateway_maps_console_inventory_operations` covering every new non-chat operation path.

- [x] **Step 2: Run failing test**

Run: `npm run test:adapter`
Expected: FAIL because new operation IDs are unsupported.

- [x] **Step 3: Add contract constants and DTOs**

Add operation IDs and lightweight DTOs for each included view.

- [x] **Step 4: Run TypeScript check**

Run: `npm run typecheck`
Expected: PASS after consumers compile.

### Task 2: Production Adapter Mapping

**Files:**
- Modify: `deploy/real_runtime_proxy.py`
- Modify: `tests/test_runtime_adapter.py`

**Interfaces:**
- Consumes: operation IDs from Task 1.
- Produces: Runtime `/api/v1` request mappings used by Bibit `service:runtime`.

- [x] **Step 1: Implement path mappings**

Map capabilities, packages, plugins, plugin consoles, executions, Agent Top, logs, and Provider Capture operations to `/api/v1`.

- [x] **Step 2: Run adapter tests**

Run: `npm run test:adapter`
Expected: PASS.

### Task 3: Dev Host Mock Expansion

**Files:**
- Modify: `dev/main.tsx`

**Interfaces:**
- Consumes: `RUNTIME_OPS` and DTOs.
- Produces: mock responses for every operation surfaced in the UI.

- [x] **Step 1: Add mock inventories**

Add representative providers, models, capabilities, packages, plugins, executions, Agent Top, logs, and capture records.

- [x] **Step 2: Add mock operations**

Handle each operation explicitly and throw `Unknown operation` in the default branch.

### Task 4: Runtime Console UI

**Files:**
- Modify: `src/RuntimeSettingsPage.tsx`
- Modify: `src/runtime.css`

**Interfaces:**
- Consumes: Runtime service operation constants and DTOs.
- Produces: tabs for all included views with loading, empty, error, and action states.

- [x] **Step 1: Replace narrow settings console with Runtime Console**

Keep the settings contribution but provide tabs for Overview, Settings, Agents, Providers, Capabilities, MCP, Packages, Plugins, Executions, Monitoring, Logs, and API Capture.

- [x] **Step 2: Add actions**

Wire create/delete/refresh/verify/rollback/stop/revoke/capture actions to service operations and refresh affected data.

- [x] **Step 3: Keep CSS scoped**

All selectors remain under `.runtime-*`.

### Task 5: Verification, Process Record, Merge, Push

**Files:**
- Modify: `process.md`

- [x] **Step 1: Run required checks**

Run: `npm test`, `npm run typecheck`, `npm run build:dev`, `npm run test:adapter`, `git diff --check`.

- [x] **Step 2: Run browser smoke**

Open `http://127.0.0.1:5173/?mock=1` and verify non-chat tabs render with no console errors.

- [x] **Step 3: Append process record**

Record files changed, commands, results, and remaining issues in `process.md`.

- [ ] **Step 4: Commit, merge to main, and push**

Commit with a conventional message and `Signed-off-by`, merge into `main`, run checks on merged state, and push.

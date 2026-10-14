# Runtime Console Scope Design

## Goal

Rebuild the non-chat Bianbu Agent Runtime console inside the Bibit Runtime plugin. The plugin remains responsible only for Feature UI, the Runtime external-service adapter, deployment descriptors, and repository documentation.

## Included Views

- Overview: runtime status, worker state, generation, sandbox, deployment summary, and resource counts.
- Settings: deployment settings and runtime settings.
- Agents: agent list, create, delete, model assignment, and capability selectors.
- Providers and models: provider list/create/delete and remote model discovery.
- Capabilities: tools, skills, and hooks.
- MCP: server list, installation, deletion, health refresh, and tool expansion.
- Packages and plugins: package inventory/actions, plugin inventory/actions, effective plugin view, rollback, and Plugin Console action surface.
- Executions: execution list/detail, stop, and agent revoke.
- Monitoring: Agent Top, logs, and Provider API Capture.

## Excluded Views

- Chat conversation main window.
- Session history, trajectory, and approvals.
- Message input, attachments, voice, slash commands, and chat send/cancel controls.
- The original Runtime console shell, sidebar, and header. Bibit owns the outer shell; this plugin renders only scoped content.

## Contracts

All operation IDs and DTOs live in `src/runtime-contracts.ts`. The same operation set must be implemented in `dev/main.tsx` and `deploy/real_runtime_proxy.py`, with adapter coverage in `tests/test_runtime_adapter.py`.

The adapter targets the current Runtime `/api/v1` contract only. No historical compatibility layer is maintained.

## Error Handling

Real Runtime failures must be visible. Development mocks may return representative data, but unknown operations must throw instead of pretending success.

## Verification

Required before delivery:

- `npm test`
- `npm run typecheck`
- `npm run build:dev`
- `npm run test:adapter`
- `git diff --check`
- Browser smoke test for the Vite mock page.

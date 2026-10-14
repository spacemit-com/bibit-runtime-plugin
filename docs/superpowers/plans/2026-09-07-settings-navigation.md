# Runtime Settings Navigation Implementation Plan

> Execute using superpowers:subagent-driven-development. User approved scope and screenshot on 2026-09-07.

**Goal:** Place all 14 screenshot entries under Management and Monitoring, as sibling sections of Features after the built-in settings list.
**Spec:** ../specs/2026-09-07-settings-navigation-design.md
**Architecture:** Generic host core navigation and per-contribution labels; plugin independent settings components; real external services.

## Tasks
- [ ] Host: add core group and navigation titleKey/fallbackTitle/iconKey to contracts/schema/Rust; project labels in static/dynamic menus; render named sections after built-in settings and before Features. Test schema validation and menu placement. Own ~/bibit only.
- [ ] Runtime plugin: register 14 ordered contributions; remove inner tabs; split capability pages; Bibit models descriptor and typed actions; independent requests and stale result protection. Update vendored SDK contracts from host and verify builds.
- [ ] Security: implement standalone runtime-prefixed security content via service:security with centralized operations/DTOs; dev mock and deployed grants/proxy tests. Do not alter Runtime source.
- [ ] Review: independent review of host/plugin integration; fix findings, run all required checks, record process.md.

## Rulings
- Work in linked worktrees /home/liudecheng/worktrees/bibit-runtime-settings and /home/liudecheng/worktrees/bibit-settings-host as explicitly requested.
- User screenshot approves revised design and host scope; no additional design confirmation required.
- Host and security implementation are independent of root's page split; delegate with explicit file ownership.

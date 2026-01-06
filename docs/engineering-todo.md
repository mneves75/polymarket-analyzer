# Engineering Todo: Guidelines Compliance

This todo breaks the work into phases. Each task lists acceptance criteria and verification commands to prove compliance.

## Phase 1: Guidelines Matrix and Baseline Evidence

Task 1.1: Produce applicability matrix for all GUIDELINES-REF documents.
Acceptance criteria: Every document in GUIDELINES_INDEX.json is listed with applicability, enforceable rules (or N/A), and verification method.
Verification: Manual review of the matrix in the final review packet.

Task 1.2: Capture baseline verification results.
Acceptance criteria: bun test and bun run typecheck outputs recorded in engineering-exec-spec and final review packet.
Verification:
- bun test
- bun run typecheck

## Phase 2: TypeScript and Config Compliance

Task 2.1: Align tsconfig.json with TYPESCRIPT-GUIDELINES baseline options.
Acceptance criteria: tsconfig includes strict family options (noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noPropertyAccessFromIndexSignature, noImplicitReturns, noUnusedLocals, noUnusedParameters, moduleDetection force, verbatimModuleSyntax) and typecheck passes.
Verification:
- bun run typecheck

Task 2.2: Remove unsafe casts and implicit any usage introduced by stricter config.
Acceptance criteria: No as any casts, no @ts-ignore, no implicit any errors after enabling stricter compiler options.
Verification:
- rg -n "\bany\b|@ts-ignore|as any" -S src
- bun run typecheck

## Phase 3: Logging and Audit Coverage

Task 3.1: Update logger to emit required fields and event naming.
Acceptance criteria: Log entries include event, timestamp, level, requestId, and redaction helper for sensitive fields. API boundaries log start and end events.
Verification:
- bun test
- bun run typecheck

Task 3.2: Add audit logging for state-changing operations (snapshot export, CSV export).
Acceptance criteria: Audit events emitted with category and sanitized metadata. Tests cover audit event payloads.
Verification:
- bun test

## Phase 4: Security Inventories

Task 4.1: Add docs/data-inventory.md and docs/model-registry.md.
Acceptance criteria: Data inventory classifies datasets and retention, model registry lists AI/model usage (or explicit none) with risk tier.
Verification: Manual review of docs for required fields.

## Phase 5: Module Size and Structure

Task 5.1: Refactor oversized modules to keep files under 300 lines where feasible.
Acceptance criteria: src/tui.ts, src/api.ts, src/logger.ts, src/http.ts refactored into smaller modules; no single module over 300 lines; functionality preserved.
Verification:
- wc -l src/*.ts | sort -n
- bun test
- bun run typecheck

## Phase 6: Quality Gate Enhancements

Task 6.1: Add a lightweight verification command for file-size compliance.
Acceptance criteria: Script or bun task exists to check module size; documented in README or engineering-exec-spec.
Verification:
- bun run check:filesize (or documented equivalent)

Task 6.2: Ensure lint/format guidance is documented if no tooling is added.
Acceptance criteria: docs note lint/format status and any future recommendations.
Verification: Manual review of docs/engineering-exec-spec.md and README.md.

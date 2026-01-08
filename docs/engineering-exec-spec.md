# Guidelines Compliance Hardening Exec Spec

This ExecPlan is a living document. The sections Progress, Surprises and Discoveries, Decision Log, and Outcomes and Retrospective must be kept up to date as work proceeds.

No PLANS.md file exists in this repo. This document follows EXECPLANS-GUIDELINES.md from the shared GUIDELINES-REF knowledge base located at ../GUIDELINES-REF.

## Purpose and Big Picture

Bring the Polymarket Analyzer repo into compliance with the GUIDELINES-REF knowledge base and current best practices, with hard verification evidence for every rule that applies. The end state is a codebase with stricter TypeScript configuration, structured logging and audit coverage, documented security inventories, and module sizes that follow the published standards. Success is visible via clean test and typecheck runs, new documentation files, and a final evidence checklist that maps each guideline to concrete proof.

## Goals

Deliver a verified compliance pass for all applicable GUIDELINES-REF documents, including TypeScript strictness, Bun workflow, security documentation, structured logging, audit events, and engineering process artifacts. Ensure every change is tested, recorded in the todo plan, and committed in small, auditable steps.

## Non-Goals

Do not add new product features, UI changes, or external integrations beyond what is required to meet guideline compliance. Avoid speculative refactors not tied to a guideline requirement or necessary to keep verification green.

## Constraints

All work must use Bun tooling, avoid unsafe type casts, avoid new abstractions unless reused in at least two places, and keep commits atomic with conventional prefixes. No emojis in code, comments, or documentation. Do not bypass security restrictions or skip verification steps.

## Assumptions

The GUIDELINES-REF knowledge base is available at ../GUIDELINES-REF but is not vendored into this repository. This plan treats those documents as authoritative and will not copy them into this repo unless explicitly required for compliance.

## Progress

- [x] (2026-01-06 16:55Z) Locate GUIDELINES-REF knowledge base outside repo and list all documents from GUIDELINES_INDEX.json.
- [x] (2026-01-06 17:10Z) Run baseline tests and typecheck to capture current verification status.
- [ ] Draft compliance summary and applicability matrix for all GUIDELINES-REF documents.
- [ ] Create engineering-todo and implement compliance tasks in small verified commits.
- [ ] Run full verification suite and produce final evidence checklist.

## Surprises and Discoveries

- Observation: GUIDELINES-REF is not vendored into this repo; it exists at ../GUIDELINES-REF.
  Evidence: find .. -maxdepth 3 -type d -name GUIDELINES-REF

- Observation: Several source files exceed the 300-line guideline (tui.ts, api.ts, logger.ts, http.ts).
  Evidence: wc -l src/*.ts

## Decision Log

- Decision: Treat ../GUIDELINES-REF as the authoritative knowledge base without copying it into the repo.
  Rationale: The request is to comply with the guidelines, not to vendor them; copying would be a large diff and is not required unless later evidence shows otherwise.
  Date/Author: 2026-01-06 / Agent

## Outcomes and Retrospective

Pending. Will be completed after implementation and verification.

## Context and Orientation

This repository is a Bun + TypeScript CLI/TUI for Polymarket market data. Entry point is src/index.ts, which dispatches to src/demo.ts for snapshots and src/tui.ts for the interactive dashboard. API calls are implemented in src/api.ts and src/http.ts. Structured logging lives in src/logger.ts but currently does not emit event names or mandatory fields required by LOG-GUIDELINES.md. Several large files exceed the <300-line guideline and require refactoring into smaller modules.

## Plan of Work

First, compile a full applicability matrix for every GUIDELINES-REF document, listing enforceable rules and verification methods. Then run baseline verification commands and record results. Next, create docs/engineering-todo.md with multi-phase tasks and acceptance criteria. After that, implement compliance changes in small steps: tighten TypeScript config, add tests to cover new behavior, enhance logging and audit events, document security inventories, and refactor oversized modules. Each task will be verified locally and committed separately.

## Concrete Steps

1. Summarize enforceable rules for every GUIDELINES-REF document and note applicability.
2. Run baseline verification commands from repo root:
   bun test
   bun --bun run typecheck
3. Create docs/engineering-todo.md with phases, acceptance criteria, and verification commands.
4. Implement tasks one by one, updating tests and docs, running verification per task, and committing with conventional prefixes.
5. Run full verification suite and assemble evidence checklist.

## Verification

Baseline and per-task verification will use:
- bun test
- bun --bun run typecheck
- Additional commands introduced by new tasks (for example lint or file-size checks).

## Risks

Large refactors to reduce module size can introduce regressions or hidden coupling. Tightening TypeScript compiler options may surface latent type issues and require careful fixes. Logging and audit changes must avoid leaking sensitive data and must not break TUI output formatting.

## Validation and Acceptance

Acceptance requires that all applicable guideline rules are satisfied or explicitly marked as not applicable with justification, all tests and typecheck commands pass, and the final checklist maps each rule to evidence such as passing tests, file diffs, or command outputs.

## Idempotence and Recovery

Refactors will be incremental and verified after each step to ensure changes are safe to re-run. If a step fails, revert only the last commit and retry with smaller changes.

## Artifacts and Notes

Baseline verification output will be captured in the final review packet. Additional artifacts include wc -l outputs demonstrating module size compliance and test outputs confirming new coverage.

## Interfaces and Dependencies

No new runtime dependencies should be added unless required for guideline compliance (for example, a lint tool). Any added dependency must be justified in the todo plan, and its configuration must be documented.

---

**Version:** 1.0.0
**Last Updated:** January 2026


# 0008: Build loop with one builder and one reviewer

Status: Accepted in outline (Lars, 2026-11-14). Scope and git rules are Claude's defaults; Lars had no preference.

## Context

Lars wants agents to build, play and verify the app on their own, started with "go". In the braa project three reviewers and a judge produced more deliberation than progress.

## Decision

One orchestrator, one builder, one reviewer. Tasks run in sequence. State lives in markdown in the repo. The procedure is in `docs/WORKFLOW.md`.

- The builder implements one task with tests.
- A gate (type check, unit tests, end-to-end play) must pass.
- The reviewer reads the diff and plays the app in a headless browser at phone size, then returns findings.
- The orchestrator fixes the findings that make sense. No second review, no judge.
- Defects in the current task are fixed. New features and matters of taste go to `docs/IDEAS.md` for Lars.
- After each task: commit, push to main, update `docs/STATE.md`.
- The loop stops when the backlog is done, when a task fails the gate twice, or when a decision is Lars's to make.

## Consequences

- One review pass means some defects slip through. The gate and the next task's playthrough are the backstop.
- The loop does not invent work. Improvement beyond the backlog happens when Lars approves ideas.
- Any fresh session can resume from `STATE.md`.

# Build loop

How agents build this project. Decided in ADR 0008. Start it by saying "go" in a session in this repo.

## Roles

- **Orchestrator:** the main session. Picks tasks, spawns the other two, fixes review findings, commits, keeps `STATE.md` current.
- **Builder:** one subagent per task. Implements the task and its tests.
- **Reviewer:** one subagent per task. Reads the diff and plays the app.

## One task, start to finish

1. **Read** `docs/STATE.md`. Take the first task that is not done and not blocked.
2. **Build.** Give the builder the task, its acceptance points, and the relevant parts of `SPEC.md` and the ADRs. The builder writes code and tests and runs the gate.
3. **Gate.** `npm run check` must pass: type check, lint, unit tests, end-to-end tests.
4. **Review.** The reviewer:
   - reads the diff against the task and the spec,
   - runs `npm run play`, which plays a full seeded game in a headless browser at phone size and saves a screenshot of every step,
   - looks at the screenshots,
   - returns a list of findings, each marked **defect** or **idea**.
5. **Fix.** The orchestrator fixes the defects that make sense and notes in one line any it chose to leave. Ideas go to `docs/IDEAS.md`. Run the gate again. There is no second review.
6. **Record.** Commit, push to main, and update `STATE.md`: mark the task done, describe the current state in a few lines, name the next task.

## When to stop

- The backlog is done. Write a short summary in `STATE.md`.
- A task fails the gate twice after fixes. Write the blocker in `STATE.md` and stop.
- A task needs a decision that is Lars's. Mark it blocked, say what is needed, and go on with tasks that do not depend on it.

## Rules

- One task at a time, in order.
- Stay inside the task. Do not build what the backlog does not ask for.
- A defect is something that breaks the spec, a user story, or basic usability on a phone. Everything else is an idea.
- Personal cards never go in the repo, in fixtures or in screenshots. Test data is fictional or public history.
- Creating the public GitHub repo and the first backend deploy each need Lars's explicit yes.
- The reviewer must look at the app, not only the code. A review without screenshots is not a review.

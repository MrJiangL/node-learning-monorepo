# Project Agent Instructions

## Teaching-first learning workflow

This repository is a learning project.

When working on docs/tasks, keep task cards consistent with earlier teaching cards such as docs/tasks/2026-06-17-activity-log-query-api.md.

Do not turn task cards into terse Jira-style tickets.

Preferred task-card style:

- Give the learner enough code skeletons to start.
- Explain why each layer exists.
- Include common pitfalls and path mistakes.
- Include RED/GREEN verification commands.
- Include test examples, not only test names.
- Include scope boundaries such as what not to do yet.
- Keep the learner as the implementer by default.

When the learner says a task is complete:

1. Inspect their implementation.
2. Explain what is correct and what is not yet connected.
3. Prefer teaching the fix before directly editing.
4. Only directly patch code when the learner asks for help, is clearly blocked, or the task requires final verification cleanup.

When creating the next task card, match the teaching density of the older cards:

- background
- task goal
- involved files
- concrete code hints
- learning notes
- test examples
- verification commands
- completion checklist

Read `TODO.md` and implement exactly one TODO task in this repository.

Execution rules:

1. Pick exactly one unchecked leaf task (`- [ ]`) from `TODO.md`.
2. If there are no unchecked tasks left, print `NO_TODO_TASKS_REMAINING` and exit.
3. Scope is strictly limited to the one chosen task. Do not work on any later tasks.
4. Keep changes minimal, production-safe, and directly related to the chosen task.
5. Do not modify unrelated files. Version bumps from hooks are acceptable.
6. If code changes are needed, implement them fully for this one task only.
7. For OCR/image-related tasks, use Codex to read the source card images directly and verify extracted text is clean and accurate (no random OCR artifacts, hallucinated tokens, or garbled characters) before applying updates.
8. Run the smallest relevant verification (tests/typecheck/build) needed to ensure CI safety.
9. Update `TODO.md` by marking only the chosen task as done (`[x]`).
10. Do not mark any other TODO items as done.
11. Update `TBD` in the TODO item appropriately. If the before version and after version do not agree, update `GAME_RULES.md`.
12. Commit only if this task produced local changes that are not already committed; do not push in this workflow.

Commit requirements:

- Use a Conventional Commit message.
- Commit only files related to this one task (plus unavoidable hook-generated version bumps).
- Do not create empty/no-op commits.

Output requirements:

- State which TODO line you selected (quote it exactly).
- Summarize the changes made.
- List verification commands run and their results.
- Provide commit hash and local branch.

# Codex Mission Tester

Spawn multiple non-interactive Codex agents to test Bomb Busters mission-by-mission through the running UI and save structured QA notes.

## Prerequisites

- Backend and frontend already running (default client URL: `http://localhost:3000`).
- `codex` CLI installed and authenticated (`codex login`).
- Repo dependencies installed (`pnpm install`).

## Run Training Missions (1-8)

```bash
pnpm mission:test
```

Default run config:

- missions: `1` to `8`
- agents per mission: `2`
- sandbox: `danger-full-access` (recommended for browser automation)
- max turns per run: `24`

## Scenario Presets

The runner supports smoke presets that set mission range + runtime defaults:

- `training`: missions `1-8` (default shape)
- `hooks`: missions `9-12` (resolved hook missions)
- `m1`: missions `1-12` (milestone-1 smoke sweep)
- `full`: missions `1-66` (full campaign smoke sweep)

Preset defaults apply only if you do not explicitly pass `--start`, `--end`, `--max-turns`, or `--timeout-sec`.

```bash
pnpm mission:test:hooks
pnpm mission:test:m1
pnpm mission:test:full
```

## Useful Overrides

```bash
pnpm mission:test -- --start 1 --end 3 --agents 3
pnpm mission:test -- --scenario hooks
pnpm mission:test -- --client-url http://localhost:3001
pnpm mission:test -- --sandbox workspace-write
pnpm mission:test -- --model gpt-5.3-codex
pnpm mission:test -- --timeout-sec 600
pnpm mission:test -- --output output/codex-mission-tests/manual-run
```

## Outputs

The runner writes artifacts under:

`output/codex-mission-tests/<timestamp>/`

Per mission and agent:

- `<agent>.prompt.md` (exact prompt sent)
- `<agent>.log.txt` (`codex exec` stdout/stderr)
- `<agent>.result.json` (schema-validated notes)
- `summary.md` (mission aggregate)

Campaign-level:

- `campaign-summary.md`
- `campaign-summary.json`

## Notes

- If UI/browser automation is blocked, agents must mark `verdict = inconclusive` and record blocker details in `issues`.
- The runner sets `NPM_CONFIG_CACHE=/tmp/npm-cache` for spawned agents to avoid local npm cache permission problems.

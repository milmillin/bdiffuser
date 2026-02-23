#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const schemaPath = path.join(__dirname, "result.schema.json");

const defaults = {
  start: 1,
  end: 8,
  agents: 2,
  clientUrl: "http://localhost:3000",
  sandbox: "danger-full-access",
  model: "",
  maxTurns: 24,
  timeoutSec: 900,
  scenario: "",
};

const SCENARIO_PRESETS = {
  training: {
    description: "Training smoke missions (1-8).",
    start: 1,
    end: 8,
    maxTurns: 24,
    timeoutSec: 900,
  },
  hooks: {
    description: "Resolved hook missions (9-12).",
    start: 9,
    end: 12,
    maxTurns: 30,
    timeoutSec: 900,
  },
  m1: {
    description: "Milestone 1 smoke (missions 1-12).",
    start: 1,
    end: 12,
    maxTurns: 30,
    timeoutSec: 1200,
  },
  full: {
    description: "Full campaign smoke (missions 1-66).",
    start: 1,
    end: 66,
    maxTurns: 30,
    timeoutSec: 1200,
  },
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  applyScenarioDefaults(args);
  validateArgs(args);
  await ensureFile(schemaPath, "Result schema");
  await ensureCodexExists();

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputRoot =
    args.output && args.output.trim()
      ? path.resolve(args.output)
      : path.join(repoRoot, "output", "codex-mission-tests", runStamp);
  await mkdir(outputRoot, { recursive: true });

  const campaignResults = [];
  const startedAt = new Date();

  if (args.scenario) {
    console.log(`[runner] scenario=${args.scenario} (${SCENARIO_PRESETS[args.scenario].description})`);
  }

  for (let mission = args.start; mission <= args.end; mission++) {
    const missionDir = path.join(outputRoot, `mission-${String(mission).padStart(2, "0")}`);
    await mkdir(missionDir, { recursive: true });
    console.log(`[mission ${mission}] spawning ${args.agents} codex agent(s)`);

    const agentRuns = [];
    for (let i = 1; i <= args.agents; i++) {
      const agentName = `mission-${mission}-agent-${String(i).padStart(2, "0")}`;
      agentRuns.push(
        runAgent({
          args,
          mission,
          agentName,
          missionDir,
          outputRoot,
        }),
      );
    }

    const missionReports = await Promise.all(agentRuns);
    const missionSummary = summarizeMission(mission, missionReports);
    campaignResults.push(missionSummary);

    await writeFile(
      path.join(missionDir, "summary.md"),
      renderMissionSummary(missionSummary),
      "utf8",
    );
    console.log(
      `[mission ${mission}] verdict=${missionSummary.verdict} pass=${missionSummary.counts.pass} fail=${missionSummary.counts.fail} inconclusive=${missionSummary.counts.inconclusive}`,
    );
  }

  const finishedAt = new Date();
  await writeFile(
    path.join(outputRoot, "campaign-summary.md"),
    renderCampaignSummary({
      startedAt,
      finishedAt,
      args,
      results: campaignResults,
      outputRoot,
    }),
    "utf8",
  );
  await writeFile(
    path.join(outputRoot, "campaign-summary.json"),
    JSON.stringify(
      {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        config: {
          scenario: args.scenario || null,
          start: args.start,
          end: args.end,
          agents: args.agents,
          clientUrl: args.clientUrl,
          sandbox: args.sandbox,
          model: args.model || null,
          maxTurns: args.maxTurns,
          timeoutSec: args.timeoutSec,
        },
        results: campaignResults,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`campaign output: ${outputRoot}`);
}

function parseArgs(argv) {
  const parsed = {
    ...defaults,
    output: "",
    help: false,
  };
  const explicit = new Set();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--":
        break;
      case "--start":
        parsed.start = Number(argv[++i]);
        explicit.add("start");
        break;
      case "--end":
        parsed.end = Number(argv[++i]);
        explicit.add("end");
        break;
      case "--agents":
        parsed.agents = Number(argv[++i]);
        explicit.add("agents");
        break;
      case "--client-url":
        parsed.clientUrl = String(argv[++i]);
        explicit.add("clientUrl");
        break;
      case "--sandbox":
        parsed.sandbox = String(argv[++i]);
        explicit.add("sandbox");
        break;
      case "--model":
        parsed.model = String(argv[++i]);
        explicit.add("model");
        break;
      case "--max-turns":
        parsed.maxTurns = Number(argv[++i]);
        explicit.add("maxTurns");
        break;
      case "--output":
        parsed.output = String(argv[++i]);
        explicit.add("output");
        break;
      case "--timeout-sec":
        parsed.timeoutSec = Number(argv[++i]);
        explicit.add("timeoutSec");
        break;
      case "--scenario":
        parsed.scenario = String(argv[++i]);
        explicit.add("scenario");
        break;
      case "-h":
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }

  parsed._explicit = explicit;
  return parsed;
}

function applyScenarioDefaults(args) {
  if (!args.scenario) return;

  const preset = SCENARIO_PRESETS[args.scenario];
  if (!preset) {
    throw new Error(
      `--scenario must be one of: ${Object.keys(SCENARIO_PRESETS).join(", ")}`,
    );
  }

  if (!args._explicit.has("start")) args.start = preset.start;
  if (!args._explicit.has("end")) args.end = preset.end;
  if (!args._explicit.has("maxTurns")) args.maxTurns = preset.maxTurns;
  if (!args._explicit.has("timeoutSec")) args.timeoutSec = preset.timeoutSec;
}

function validateArgs(args) {
  if (args.scenario && !SCENARIO_PRESETS[args.scenario]) {
    throw new Error(
      `--scenario must be one of: ${Object.keys(SCENARIO_PRESETS).join(", ")}`,
    );
  }
  if (!Number.isInteger(args.start) || args.start < 1 || args.start > 66) {
    throw new Error("--start must be an integer between 1 and 66");
  }
  if (!Number.isInteger(args.end) || args.end < 1 || args.end > 66) {
    throw new Error("--end must be an integer between 1 and 66");
  }
  if (args.end < args.start) {
    throw new Error("--end must be >= --start");
  }
  if (!Number.isInteger(args.agents) || args.agents < 1 || args.agents > 10) {
    throw new Error("--agents must be an integer between 1 and 10");
  }
  if (!Number.isInteger(args.maxTurns) || args.maxTurns < 1 || args.maxTurns > 200) {
    throw new Error("--max-turns must be an integer between 1 and 200");
  }
  if (!Number.isInteger(args.timeoutSec) || args.timeoutSec < 30 || args.timeoutSec > 21600) {
    throw new Error("--timeout-sec must be an integer between 30 and 21600");
  }
  if (!["read-only", "workspace-write", "danger-full-access"].includes(args.sandbox)) {
    throw new Error("--sandbox must be one of read-only | workspace-write | danger-full-access");
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/mission-tester/run-campaign.mjs [options]

Options:
  --start <n>        First mission to test (default: 1)
  --end <n>          Last mission to test (default: 8)
  --scenario <name>  Scenario preset: training | hooks | m1 | full
                     Applies default start/end/max-turns/timeout unless explicitly overridden.
  --agents <n>       Codex agents per mission (default: 2)
  --client-url <u>   Frontend URL (default: http://localhost:3000)
  --sandbox <mode>   Codex sandbox mode: read-only | workspace-write | danger-full-access
                     (default: danger-full-access)
  --model <name>     Optional Codex model override
  --max-turns <n>    Turn cap for each agent run (default: 24)
  --timeout-sec <n>  Timeout per agent run in seconds (default: 900)
  --output <dir>     Output directory (default: output/codex-mission-tests/<timestamp>)
  -h, --help         Show help
`);
}

async function ensureFile(filePath, label) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function ensureCodexExists() {
  await new Promise((resolve, reject) => {
    const child = spawn("codex", ["--version"], { cwd: repoRoot });
    child.on("error", () => {
      reject(
        new Error(
          "codex CLI not found in PATH. Install @openai/codex and run `codex login` before using this runner.",
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error("codex --version failed"));
    });
  });
}

function getMissionSpecificChecks(mission) {
  if (mission === 9) {
    return [
      {
        id: "mission_9_sequence_priority",
        text:
          "verify sequence-priority gating: middle/right value cuts are blocked until left value is unlocked, then later values become legal.",
      },
    ];
  }

  if (mission === 10) {
    return [
      {
        id: "mission_10_timer_enforced",
        text:
          "verify mission timer behavior is visible/active (countdown pressure present; if timeout occurs it must end as timer loss).",
      },
      {
        id: "mission_10_dynamic_turn_order",
        text:
          "verify captain choose-next-player flow appears and same-player consecutive turn is blocked when alternatives exist (3+ players).",
      },
    ];
  }

  if (mission === 11) {
    return [
      {
        id: "mission_11_hidden_blue_as_red",
        text:
          "verify hidden blue-as-red behavior appears (hidden value acts like red risk) and capture concrete evidence.",
      },
      {
        id: "mission_11_reveal_restriction",
        text:
          "verify Reveal Reds is only legal when remaining hand satisfies mission-11 hidden-value reveal condition.",
      },
    ];
  }

  if (mission === 12) {
    return [
      {
        id: "mission_12_equipment_double_lock",
        text:
          "verify equipment remains blocked until both primary unlock value and mission secondary lock condition are satisfied.",
      },
    ];
  }

  return [];
}

function renderRequiredChecks(mission) {
  const baseChecks = [
    {
      id: "start_requires_two_players",
      text: "verify game cannot start with <2 players.",
    },
    {
      id: "host_mission_control",
      text: `verify host can select mission ${mission} and non-host cannot change mission.`,
    },
    {
      id: "info_token_once_per_player",
      text:
        "verify setup token flow is enforced (required setup placements only, duplicate placement rejected).",
    },
    {
      id: "turn_order_progression",
      text: "verify turn number/current player advance after valid actions.",
    },
    {
      id: "mission_resolution_or_blocker",
      text: "continue gameplay until mission resolves OR a blocker is reached; include outcome.",
    },
  ];

  const checks = [...baseChecks, ...getMissionSpecificChecks(mission)];
  return checks
    .map((check, idx) => `${idx + 1}) id="${check.id}": ${check.text}`)
    .join("\n");
}

function buildPrompt({ mission, agentName, args, outputRoot }) {
  const requiredChecks = renderRequiredChecks(mission);
  const scenarioText = args.scenario
    ? `- Scenario preset: ${args.scenario} (${SCENARIO_PRESETS[args.scenario].description})`
    : "";

  return `You are an independent QA agent named "${agentName}" for Bomb Busters.

Primary objective:
- Play mission ${mission} through the existing UI at ${args.clientUrl}.
- Validate correctness against GAME_RULES.md and runtime behavior.

Hard constraints:
- Do not edit repository files.
- Prefer real UI interactions end-to-end.
- Use at least 2 players in one run (e.g. two contexts/tabs in Playwright).
- Do not directly mock or inject server state.
- Use concise evidence commands only.

Important environment note:
- npm cache may be permission-restricted.
- Prefix npm/npx commands with: NPM_CONFIG_CACHE=/tmp/npm-cache
${scenarioText}

Useful selectors in UI:
- Join/Lobby: data-testid="name-input", "create-room", "room-code-input", "join-room", "start-game", "mission-select-<id>"
- Game: data-testid="game-board", "info-token-phase", "info-token-setup", "place-info-token", "action-panel", "dual-cut-submit", "solo-cut-<value>", "reveal-reds", "turn-number", "current-player", "end-screen"
- Tiles: data-testid="wire-tile-<playerId>-<index>"

Required checks (include each in checks[] with id below):
${requiredChecks}

Execution guidance:
- If browser dependencies are missing, install in /tmp only.
- Cap gameplay at ${args.maxTurns} turns.
- If UI/browser automation is blocked by sandbox/system constraints, mark verdict "inconclusive" and include exact blocker in issues[].
- Keep evidence focused. Put command snippets or key observations in evidence[].
- Keep the run bounded so it can finish before timeout (${args.timeoutSec}s).

Output contract:
- Return ONLY JSON matching the provided schema.
- Set "mission" to ${mission}.
- Set "agent" to "${agentName}".
- Use verdict enum: pass | fail | inconclusive.
- Use confidence between 0 and 1.

Campaign output folder (for your awareness): ${outputRoot}
`;
}

async function runAgent({ args, mission, agentName, missionDir, outputRoot }) {
  const baseName = agentName;
  const promptPath = path.join(missionDir, `${baseName}.prompt.md`);
  const resultPath = path.join(missionDir, `${baseName}.result.json`);
  const logPath = path.join(missionDir, `${baseName}.log.txt`);
  const prompt = buildPrompt({ mission, agentName, args, outputRoot });
  await writeFile(promptPath, prompt, "utf8");

  const cmdArgs = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--cd",
    repoRoot,
    "--sandbox",
    args.sandbox,
    "--output-schema",
    schemaPath,
    "--output-last-message",
    resultPath,
    "-",
  ];
  if (args.model) {
    cmdArgs.splice(1, 0, "--model", args.model);
  }

  const { exitCode, timedOut } = await new Promise((resolve) => {
    const child = spawn("codex", cmdArgs, {
      cwd: repoRoot,
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || "/tmp/npm-cache",
      },
    });
    const logStream = createWriteStream(logPath, { flags: "w" });
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, args.timeoutSec * 1000);

    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    child.stdin.write(prompt);
    child.stdin.end();
    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      logStream.end();
      resolve({ exitCode: code ?? 1, timedOut });
    });
    child.on("error", () => {
      clearTimeout(timeoutHandle);
      logStream.end();
      resolve({ exitCode: 1, timedOut });
    });
  });

  let report = null;
  let parseError = "";
  try {
    const raw = await readFile(resultPath, "utf8");
    report = JSON.parse(raw);
  } catch (err) {
    parseError = String(err);
  }

  if (!report) {
    report = {
      mission,
      agent: agentName,
      verdict: "inconclusive",
      confidence: 0,
      checks: [
        {
          id: "runner_output_missing",
          status: "inconclusive",
          note: "No valid JSON report was produced by codex.",
        },
      ],
      issues: [
        {
          severity: "medium",
          title: timedOut ? "Codex run timed out" : "Codex report parse failure",
          details: timedOut
            ? `Agent exceeded timeout of ${args.timeoutSec}s`
            : parseError || "Unknown parse failure",
          repro: `Inspect ${path.relative(repoRoot, logPath)}`,
        },
      ],
      summary: "Agent run did not produce schema-compliant output.",
      evidence: [`exit_code=${exitCode}`, `log=${path.relative(repoRoot, logPath)}`],
    };
    await writeFile(resultPath, JSON.stringify(report, null, 2), "utf8");
  } else if (timedOut) {
    report.verdict = "inconclusive";
    report.confidence = Math.min(report.confidence ?? 0, 0.2);
    report.issues = Array.isArray(report.issues) ? report.issues : [];
    report.issues.unshift({
      severity: "medium",
      title: "Codex run timed out",
      details: `Agent exceeded timeout of ${args.timeoutSec}s`,
      repro: `Inspect ${path.relative(repoRoot, logPath)}`,
    });
    report.evidence = Array.isArray(report.evidence) ? report.evidence : [];
    report.evidence.unshift(`timeout_sec=${args.timeoutSec}`);
    await writeFile(resultPath, JSON.stringify(report, null, 2), "utf8");
  }

  return {
    mission,
    agentName,
    exitCode,
    logPath,
    resultPath,
    report,
  };
}

function summarizeMission(mission, agentRuns) {
  const counts = {
    pass: 0,
    fail: 0,
    inconclusive: 0,
  };

  for (const run of agentRuns) {
    const verdict = run.report?.verdict;
    if (verdict === "pass") counts.pass++;
    else if (verdict === "fail") counts.fail++;
    else counts.inconclusive++;
  }

  let verdict = "inconclusive";
  if (counts.fail > 0) verdict = "fail";
  else if (counts.pass === agentRuns.length) verdict = "pass";

  return {
    mission,
    verdict,
    counts,
    agents: agentRuns.map((run) => ({
      agent: run.agentName,
      exitCode: run.exitCode,
      verdict: run.report.verdict,
      confidence: run.report.confidence,
      summary: run.report.summary,
      issues: run.report.issues,
      checks: run.report.checks,
      resultPath: run.resultPath,
      logPath: run.logPath,
    })),
  };
}

function renderMissionSummary(summary) {
  const lines = [];
  lines.push(`# Mission ${summary.mission} Summary`);
  lines.push("");
  lines.push(`- Verdict: ${summary.verdict}`);
  lines.push(`- Pass: ${summary.counts.pass}`);
  lines.push(`- Fail: ${summary.counts.fail}`);
  lines.push(`- Inconclusive: ${summary.counts.inconclusive}`);
  lines.push("");

  for (const agent of summary.agents) {
    lines.push(`## ${agent.agent}`);
    lines.push(`- Exit code: ${agent.exitCode}`);
    lines.push(`- Verdict: ${agent.verdict}`);
    lines.push(`- Confidence: ${agent.confidence}`);
    lines.push(`- Summary: ${agent.summary}`);
    lines.push(`- Report: ${agent.resultPath}`);
    lines.push(`- Log: ${agent.logPath}`);
    if (agent.issues.length === 0) {
      lines.push(`- Issues: none`);
    } else {
      for (const issue of agent.issues) {
        lines.push(`- Issue (${issue.severity}): ${issue.title} | ${issue.details}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderCampaignSummary({ startedAt, finishedAt, args, results, outputRoot }) {
  const total = {
    pass: 0,
    fail: 0,
    inconclusive: 0,
  };
  for (const mission of results) {
    if (mission.verdict === "pass") total.pass++;
    else if (mission.verdict === "fail") total.fail++;
    else total.inconclusive++;
  }

  const lines = [];
  lines.push("# Codex Mission Campaign Summary");
  lines.push("");
  lines.push(`- Started: ${startedAt.toISOString()}`);
  lines.push(`- Finished: ${finishedAt.toISOString()}`);
  lines.push(`- Missions: ${args.start}-${args.end}`);
  if (args.scenario) {
    lines.push(`- Scenario: ${args.scenario} (${SCENARIO_PRESETS[args.scenario].description})`);
  }
  lines.push(`- Agents per mission: ${args.agents}`);
  lines.push(`- Client URL: ${args.clientUrl}`);
  lines.push(`- Sandbox: ${args.sandbox}`);
  lines.push(`- Model override: ${args.model || "default"}`);
  lines.push(`- Max turns per run: ${args.maxTurns}`);
  lines.push(`- Timeout per agent run (sec): ${args.timeoutSec}`);
  lines.push(`- Output root: ${outputRoot}`);
  lines.push("");
  lines.push(`- Mission verdict totals: pass=${total.pass}, fail=${total.fail}, inconclusive=${total.inconclusive}`);
  lines.push("");

  for (const mission of results) {
    lines.push(`## Mission ${mission.mission}`);
    lines.push(`- Verdict: ${mission.verdict}`);
    lines.push(`- Pass: ${mission.counts.pass}`);
    lines.push(`- Fail: ${mission.counts.fail}`);
    lines.push(`- Inconclusive: ${mission.counts.inconclusive}`);
    lines.push("");
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

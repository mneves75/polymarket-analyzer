#!/usr/bin/env bun
import { CONFIG } from "./config";
import { listMarkets, runSnapshot } from "./demo";
import { runDashboard } from "./tui";

type Options = {
  market?: string;
  slug?: string;
  intervalMs: number;
  limit: number;
  once: boolean;
  listMarkets: boolean;
  ws: boolean;
  json: boolean;
};

const opts = parseArgs(process.argv.slice(2));

if (opts.listMarkets) {
  await listMarkets(opts.limit, opts.json);
  process.exit(0);
}

if (opts.once) {
  await runSnapshot({
    market: opts.market,
    slug: opts.slug,
    intervalMs: opts.intervalMs,
    limit: opts.limit
  });
  process.exit(0);
}

await runDashboard({
  market: opts.market,
  slug: opts.slug,
  intervalMs: opts.intervalMs,
  limit: opts.limit,
  ws: opts.ws
});

function parseArgs(args: string[]): Options {
  const options: Options = {
    intervalMs: CONFIG.refreshMs,
    limit: CONFIG.radarLimit,
    once: false,
    listMarkets: false,
    ws: true,
    json: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--once") options.once = true;
    if (arg === "--list-markets") options.listMarkets = true;
    if (arg === "--no-ws") options.ws = false;
    if (arg === "--ws") options.ws = true;
    if (arg === "--json") options.json = true;
    if (arg === "--tui") {
      // default mode
    }

    if (arg === "--market" || arg === "-m") options.market = requireValue(args, i, arg);
    if (arg.startsWith("--market=")) options.market = arg.split("=")[1];

    if (arg === "--slug" || arg === "-s") options.slug = requireValue(args, i, arg);
    if (arg.startsWith("--slug=")) options.slug = arg.split("=")[1];

    if (arg === "--interval") options.intervalMs = Number(requireValue(args, i, arg));
    if (arg.startsWith("--interval=")) options.intervalMs = Number(arg.split("=")[1]);

    if (arg === "--limit") options.limit = Number(requireValue(args, i, arg));
    if (arg.startsWith("--limit=")) options.limit = Number(arg.split("=")[1]);
  }

  if (!Number.isFinite(options.intervalMs) || options.intervalMs <= 0) {
    options.intervalMs = CONFIG.refreshMs;
  }
  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    options.limit = CONFIG.radarLimit;
  }

  return options;
}

function printHelp() {
  console.log(`\nPolymarket TUI Demo\n\nUsage:\n  bun run src/index.ts [options]\n\nOptions:\n  --tui                Start TUI dashboard (default)\n  --once               Print single JSON snapshot\n  --list-markets        List recent markets (radar)\n  --market, -m <id>     Focus by conditionId\n  --slug, -s <slug>     Focus by market/event slug\n  --interval <ms>       Refresh interval (default: ${CONFIG.refreshMs})\n  --limit <n>           Radar limit (default: ${CONFIG.radarLimit})\n  --json               Output JSON for list/snapshot modes\n  --no-ws               Disable CLOB WebSocket\n  -h, --help            Show help\n`);
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    console.error(`Missing value for ${flag}`);
    printHelp();
    process.exit(1);
  }
  return value;
}

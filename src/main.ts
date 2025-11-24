#!/usr/bin/env -S deno task agent
/**
 * Hacker News Agent - AI-powered newsletter generation
 */

import { runHackerNewsAgent } from "./agent.ts";

async function main() {
  try {
    await runHackerNewsAgent();
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

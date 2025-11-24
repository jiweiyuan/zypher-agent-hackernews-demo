/**
 * Hacker News Agent with Zypher
 *
 * This agent uses AI tools to fetch, analyze, and summarize Hacker News stories
 * and generates a professional newsletter.
 */

import { AnthropicModelProvider, createZypherContext, ZypherAgent } from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import { createAgentPrompt } from "./prompt.ts";
import { tools } from "./tools.ts";

// Load environment variables
const getRequiredEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Create and initialize the Hacker News agent with tools
 */
export async function createAgent() {
  console.log("Initializing Hacker News Agent...\n");

  const zypherContext = await createZypherContext(Deno.cwd());

  const agent = new ZypherAgent(
    zypherContext,
    new AnthropicModelProvider({
      apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
    }),
  );

  // Register tools with the agent's MCP server manager
  console.log("Registering tools...");
  for (const tool of tools) {
    agent.mcp.registerTool(tool);
    console.log(`  ✓ ${tool.name}`);
  }

  return agent;
}

/**
 * Run the newsletter generation workflow with tools
 */
export async function runHackerNewsAgent() {
  try {
    const taskPrompt = createAgentPrompt();
    // Create the agent with registered tools
    const agent = await createAgent();

    // Run the task
    console.log("🚀 Starting newsletter generation...\n");
    console.log("=".repeat(60));
    console.log("\n");

    const event$ = agent.runTask(
      taskPrompt,
      "claude-sonnet-4-20250514",
    );

    // Process events
    for await (const event of eachValueFrom(event$)) {
      console.log(JSON.stringify(event, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Error running agent:", error);
  }
}

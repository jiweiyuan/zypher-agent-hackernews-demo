/**
 * Tool definitions for the Hacker News Agent
 */

import { createTool } from "@corespeed/zypher/tools";
import { z } from "zod";
import {
  algoliaToHNItem,
  type FirecrawlScrapeResult,
  getBestStories,
  getItems,
  getNewStories,
  getTodaysTopStories,
  getTopStories,
  type HNItem,
  scrapeUrl,
} from "./hackernews-api.ts";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

// Tool 1: Get Hacker News stories
export const listNewsTool = createTool({
  name: "list_hacker_news",
  description:
    "Fetch stories from Hacker News. Can get top stories, new stories, best stories, or search by keywords. Returns a list of story titles, URLs, authors, scores, and comment counts.",
  schema: z.object({
    category: z.enum(["top", "new", "best", "today"]).describe(
      "The category of stories to fetch. 'today' gets stories from the last 24 hours, 'search' searches by keywords.",
    ),
    limit: z.number().optional().default(30).describe(
      "Maximum number of stories to fetch (default: 30, max: 50)",
    ),
  }),
  execute: async (input): Promise<string> => {
    try {
      const { category, limit = 30 } = input;
      let stories: HNItem[] = [];

      // Fetch stories based on category
      switch (category) {
        case "top": {
          const ids = await getTopStories(Math.min(limit, 50));
          stories = await getItems(ids);
          break;
        }
        case "new": {
          const ids = await getNewStories(Math.min(limit, 50));
          stories = await getItems(ids);
          break;
        }
        case "best": {
          const ids = await getBestStories(Math.min(limit, 50));
          stories = await getItems(ids);
          break;
        }
        case "today": {
          stories = await getTodaysTopStories(Math.min(limit, 50));
          break;
        }
        default:
          return JSON.stringify({ error: `Unknown category: ${category}` });
      }

      // Format the response
      const formattedStories = stories.map((story, index) => ({
        rank: index + 1,
        id: story.id,
        title: story.title || "No title",
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        author: story.by || "unknown",
        score: story.score || 0,
        comments: story.descendants || 0,
        time: new Date(story.time * 1000).toISOString(),
      }));

      return JSON.stringify(
        {
          category,
          count: formattedStories.length,
          stories: formattedStories,
        },
        null,
        2,
      );
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  },
});

// Tool 2: Summarize a news article
export const fetchArticleTool = createTool({
  name: "fetch_article",
  description:
    "Fetch and summarize the full content of a news article from its URL using Firecrawl. Returns the article's markdown content, title, description, and metadata. Use this to get detailed information about a specific story.",
  schema: z.object({
    url: z.string().describe("The URL of the article to fetch and summarize"),
    story_title: z.string().optional().describe("The title of the story (for context)"),
  }),
  execute: async (input): Promise<string> => {
    try {
      const { url, story_title } = input;

      if (!FIRECRAWL_API_KEY) {
        return JSON.stringify({
          error:
            "FIRECRAWL_API_KEY environment variable is not set. Please set it to use article summarization.",
        });
      }

      // Check if URL is a HN discussion link (not an external article)
      if (url.includes("news.ycombinator.com/item")) {
        return JSON.stringify({
          url,
          story_title,
          note:
            "This is a Hacker News discussion page, not an external article. It contains comments and discussion but no article content to scrape.",
        });
      }

      console.log(`\n🔍 Fetching article content from: ${url}`);

      // Scrape the article using Firecrawl
      const result: FirecrawlScrapeResult = await scrapeUrl(url, FIRECRAWL_API_KEY, {
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 30000,
      });

      if (!result.success || !result.data) {
        return JSON.stringify({
          url,
          story_title,
          error: result.error || "Failed to fetch article content",
        });
      }

      // Return the scraped content
      return JSON.stringify(
        {
          url,
          story_title,
          content: result.data.markdown || "No content available",
          metadata: {
            title: result.data.metadata?.title,
            description: result.data.metadata?.description,
            author: result.data.metadata?.ogSiteName,
          },
        },
        null,
        2,
      );
    } catch (error) {
      return JSON.stringify({
        url: input.url,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  },
});

// Export all tools
export const tools = [
  listNewsTool,
  fetchArticleTool,
];

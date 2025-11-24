/**
 * Hacker News API Client
 * https://github.com/HackerNews/API
 */

export interface HNItem {
  id: number;
  type: "story" | "comment" | "job" | "poll" | "pollopt";
  by: string;
  time: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

export async function getItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching item ${id}:`, error);
    return null;
  }
}

export async function getTopStories(limit = 30): Promise<number[]> {
  try {
    const response = await fetch(`${HN_API_BASE}/topstories.json`);
    if (!response.ok) return [];
    const ids: number[] = await response.json();
    return ids.slice(0, limit);
  } catch (error) {
    console.error("Error fetching top stories:", error);
    return [];
  }
}

export async function getNewStories(limit = 30): Promise<number[]> {
  try {
    const response = await fetch(`${HN_API_BASE}/newstories.json`);
    if (!response.ok) return [];
    const ids: number[] = await response.json();
    return ids.slice(0, limit);
  } catch (error) {
    console.error("Error fetching new stories:", error);
    return [];
  }
}

export async function getBestStories(limit = 30): Promise<number[]> {
  try {
    const response = await fetch(`${HN_API_BASE}/beststories.json`);
    if (!response.ok) return [];
    const ids: number[] = await response.json();
    return ids.slice(0, limit);
  } catch (error) {
    console.error("Error fetching best stories:", error);
    return [];
  }
}

export async function getItems(ids: number[]): Promise<HNItem[]> {
  const promises = ids.map(id => getItem(id));
  const items = await Promise.all(promises);
  return items.filter((item): item is HNItem => item !== null);
}

export function formatStory(story: HNItem): string {
  const title = story.title || "No title";
  const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
  const points = story.score || 0;
  const comments = story.descendants || 0;
  const author = story.by || "unknown";

  return `
📰 ${title}
   👤 ${author} | ⬆️ ${points} points | 💬 ${comments} comments
   🔗 ${url}
  `.trim();
}

export async function getTodaysTopStories(count = 30): Promise<HNItem[]> {
  const topStoryIds = await getTopStories(count);
  const stories = await getItems(topStoryIds);

  // Filter stories from the last 24 hours
  const oneDayAgo = Date.now() / 1000 - (24 * 60 * 60);
  const todaysStories = stories.filter(story =>
    story.time >= oneDayAgo && story.type === "story"
  );

  return todaysStories;
}

export interface AlgoliaSearchResult {
  hits: Array<{
    objectID: string;
    title: string;
    url?: string;
    author: string;
    points: number;
    num_comments: number;
    created_at_i: number;
  }>;
  nbHits: number;
}

export async function searchStories(
  query: string,
  tags: string = "story",
  numericFilters?: string
): Promise<AlgoliaSearchResult> {
  try {
    const params = new URLSearchParams({
      query,
      tags,
      hitsPerPage: "30",
    });

    if (numericFilters) {
      params.append("numericFilters", numericFilters);
    }

    const response = await fetch(
      `https://hn.algolia.com/api/v1/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error searching stories for "${query}":`, error);
    return { hits: [], nbHits: 0 };
  }
}

export function algoliaToHNItem(hit: AlgoliaSearchResult["hits"][0]): HNItem {
  return {
    id: parseInt(hit.objectID),
    type: "story",
    by: hit.author,
    time: hit.created_at_i,
    title: hit.title,
    url: hit.url,
    score: hit.points,
    descendants: hit.num_comments,
  };
}

// Firecrawl API Client
// https://docs.firecrawl.dev/api-reference/endpoint/scrape

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v2";

export interface FirecrawlMetadata {
  title?: string;
  description?: string;
  language?: string;
  keywords?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogLocaleAlternate?: string[];
  ogSiteName?: string;
  sourceURL: string;
  statusCode?: number;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    screenshot?: string;
    links?: string[];
    metadata?: FirecrawlMetadata;
  };
  error?: string;
}

export interface FirecrawlScrapeOptions {
  formats?: Array<"markdown" | "html" | "rawHtml" | "screenshot" | "links">;
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  headers?: Record<string, string>;
  waitFor?: number;
  timeout?: number;
}

export async function scrapeUrl(
  url: string,
  apiKey: string,
  options: FirecrawlScrapeOptions = {}
): Promise<FirecrawlScrapeResult> {
  try {
    const {
      formats = ["markdown"],
      onlyMainContent = true,
      timeout = 30000,
      ...otherOptions
    } = options;

    const response = await fetch(`${FIRECRAWL_API_BASE}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent,
        timeout,
        ...otherOptions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Firecrawl API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

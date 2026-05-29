import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prismadb from "@/app/libs/prismadb";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { query, engine = "tavily" } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Record search history
    if (currentUser) {
      await prismadb.searchHistory.create({
        data: {
          query,
          engine,
          userId: currentUser.id,
        },
      });
    }

    // Call the appropriate search engine
    let results = [];
    const startTime = Date.now();

    switch (engine) {
      case "tavily":
        results = await searchTavily(query);
        break;
      case "google":
        results = await searchGoogle(query);
        break;
      case "ddg":
        results = await searchDDG(query);
        break;
      default:
        results = await searchTavily(query);
    }

    const duration = Date.now() - startTime;

    // Save search to database
    const search = await prismadb.search.create({
      data: {
        query,
        engine,
        resultCount: results.length,
        duration,
        userId: currentUser?.id,
        results: {
          create: results.map((result: any, index: number) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            position: index + 1,
            score: result.score,
          })),
        },
      },
      include: {
        results: true,
      },
    });

    return NextResponse.json(search);
  } catch (error) {
    console.error("[SEARCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searches = await prismadb.search.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        results: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prismadb.search.count({
      where: {
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      searches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[SEARCHES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Search engine implementations
async function searchTavily(query: string) {
  const apiKey = process.env.TAVILY_API_KEY_1;
  if (!apiKey) {
    throw new Error("Tavily API key not configured");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      include_images: false,
      max_results: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
    score: result.score,
  }));
}

async function searchGoogle(query: string) {
  const apiKey = process.env.GO_API_KEY_1;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error("Google API key not configured");
  }

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    score: 1.0,
  }));
}

async function searchDDG(query: string) {
  // DuckDuckGo search implementation
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo API error: ${response.status}`);
  }

  const data = await response.json();
  const results = [];

  if (data.AbstractText) {
    results.push({
      title: data.Heading,
      url: data.AbstractURL,
      snippet: data.AbstractText,
      score: 1.0,
    });
  }

  for (const result of data.RelatedTopics || []) {
    if (result.FirstURL) {
      results.push({
        title: result.Text?.split(" - ")[0] || result.Text,
        url: result.FirstURL,
        snippet: result.Text,
        score: 0.8,
      });
    }
  }

  return results;
}

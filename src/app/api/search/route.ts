import { NextRequest, NextResponse } from "next/server";
import { searchMetadata } from "@/lib/storage/mongodb-metadata";
import type { SearchResult } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");

    // Validate query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Search metadata
    const results = await searchMetadata(query);

    // Format results with extracted text (no PDF URLs since files are deleted)
    const formattedResults: SearchResult[] = results.map((result) => {
      // Find match preview (±50 characters around first match)
      const lowerText = result.extractedText.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchIndex = lowerText.indexOf(lowerQuery);

      let matchPreview = "";
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(
          result.extractedText.length,
          matchIndex + query.length + 50
        );
        matchPreview = result.extractedText.substring(start, end);
      }

      return {
        id: result.id,
        filename: result.filename,
        uploadedAt: result.uploadedAt,
        matchPreview,
        extractedText: result.extractedText, // Include full text for viewing
      };
    });

    // Sort by relevance (exact matches first) then by uploadedAt descending
    formattedResults.sort((a, b) => {
      const aExact = a.matchPreview.toLowerCase().includes(query.toLowerCase());
      const bExact = b.matchPreview.toLowerCase().includes(query.toLowerCase());

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return (
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    });

    return NextResponse.json({
      query,
      results: formattedResults,
      totalResults: formattedResults.length,
    });
  } catch (error) {
    console.error("Error searching metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search documents",
      },
      { status: 500 }
    );
  }
}


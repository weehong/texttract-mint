"use client";

import { useState } from "react";
import {
  DocumentTextIcon,
  DocumentMagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import type { SearchResult } from "@/types";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SearchResults({ results, query }: SearchResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DocumentMagnifyingGlassIcon className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900">No results found</p>
        <p className="text-sm text-gray-500">
          Try searching with different keywords
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">
        Found {results.length} result{results.length !== 1 ? "s" : ""} for "
        {query}"
      </h2>

      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {results.map((result) => {
          const isExpanded = expandedId === result.id;

          return (
            <div key={result.id} className="bg-white">
              <div
                onClick={() => toggleExpand(result.id)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <DocumentTextIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {result.filename}
                      </p>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      ...{highlightText(result.matchPreview, query)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Uploaded: {new Date(result.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded full text view */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Extracted Text:
                    </h3>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {highlightText(result.extractedText, query)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Note: Original PDF was deleted after text extraction
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


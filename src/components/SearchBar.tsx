"use client";

import { useState, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { SearchResult } from "@/types";

interface SearchBarProps {
  onSearch: (query: string, results: SearchResult[]) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search across all PDFs...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  const debounceSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        onSearch("", []);
        return;
      }

      const timer = setTimeout(async () => {
        try {
          setIsSearching(true);
          setError(null);

          const response = await fetch(
            `/api/search?q=${encodeURIComponent(searchQuery)}`
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Search failed");
          }

          const data = await response.json();
          onSearch(searchQuery, data.results || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
          onSearch(searchQuery, []);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    },
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debounceSearch(newQuery);
  };

  const handleClear = () => {
    setQuery("");
    setError(null);
    onSearch("", []);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="animate-spin">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
          <span>Searching...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {query && !isSearching && !error && (
        <div className="text-xs text-gray-500">
          Press Enter or wait for results
        </div>
      )}
    </div>
  );
}


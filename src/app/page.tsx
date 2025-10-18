"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import type { SearchResult } from "@/types";

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(true);

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  const handleSearch = (query: string, results: SearchResult[]) => {
    setSearchQuery(query);
    setSearchResults(results);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">PDF Text Extractor</h1>
          <p className="text-indigo-100 mt-2">
            Upload PDFs, extract text with AWS Textract, and search across all
            documents
          </p>
          <p className="text-indigo-200 text-sm mt-1">
            Note: PDFs are processed once and deleted. Only extracted text is
            retained.
          </p>

          {/* Toggle Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setShowUpload(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${showUpload
                ? "bg-white text-indigo-600"
                : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
            >
              Upload PDFs
            </button>
            <button
              onClick={() => setShowUpload(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${!showUpload
                ? "bg-white text-indigo-600"
                : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
            >
              Search PDFs
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showUpload ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload PDFs</h2>
              <p className="text-gray-600 mt-2">
                Select one or more PDF files to upload. They will be processed with AWS Textract
                to extract text for searching.
              </p>
            </div>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Search PDFs</h2>
              <p className="text-gray-600 mt-2">
                Search across all extracted text from your uploaded PDFs
              </p>
            </div>
            <SearchBar onSearch={handleSearch} />
            <SearchResults results={searchResults} query={searchQuery} />
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export PDFMetadata interface from MongoDB storage
export type { PDFMetadata } from "@/lib/storage/mongodb-metadata";

/**
 * Search result interface
 * Note: No PDF URL since files are not retained after extraction
 */
export interface SearchResult {
  id: string;
  filename: string;
  uploadedAt: string;
  matchPreview: string;
  extractedText: string; // Full text for display
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  filename: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


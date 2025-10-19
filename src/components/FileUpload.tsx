"use client";

import { useState, useRef } from "react";
import { CloudArrowUpIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface UploadFile {
  id: string;
  filename: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
}

interface FileUploadProps {
  onUploadComplete?: (uploadedFiles: Array<{ id: string; filename: string }>) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadFile>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => file.type === "application/pdf");
    if (newFiles.length === 0) {
      alert("Please select PDF files only");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const uploadedFiles: Array<{ id: string; filename: string }> = [];

    // Process files sequentially with max 3 concurrent
    const maxConcurrent = 3;
    for (let i = 0; i < selectedFiles.length; i += maxConcurrent) {
      const batch = selectedFiles.slice(i, i + maxConcurrent);
      await Promise.all(batch.map((file) => uploadFile(file, uploadedFiles)));
    }

    setIsUploading(false);
    setSelectedFiles([]);

    if (onUploadComplete) {
      onUploadComplete(uploadedFiles);
    }
  };

  const uploadFile = async (
    file: File,
    uploadedFiles: Array<{ id: string; filename: string }>
  ) => {
    const fileKey = file.name;

    try {
      // Get presigned URL
      setUploadProgress((prev) => {
        const map = new Map(prev);
        map.set(fileKey, {
          id: "",
          filename: file.name,
          status: "uploading",
          progress: 0,
        });
        return map;
      });

      const presignedResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: "application/pdf",
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { id, uploadUrl, s3Key } = await presignedResponse.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // Update progress to processing
      setUploadProgress((prev) => {
        const map = new Map(prev);
        map.set(fileKey, {
          id,
          filename: file.name,
          status: "processing",
          progress: 50,
        });
        return map;
      });

      // Trigger Textract processing
      const processResponse = await fetch("/api/upload/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, s3Key }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to process document");
      }

      // Mark as completed
      setUploadProgress((prev) => {
        const map = new Map(prev);
        map.set(fileKey, {
          id,
          filename: file.name,
          status: "completed",
          progress: 100,
        });
        return map;
      });

      uploadedFiles.push({ id, filename: file.name });
    } catch (error) {
      setUploadProgress((prev) => {
        const map = new Map(prev);
        map.set(fileKey, {
          id: "",
          filename: file.name,
          status: "failed",
          progress: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return map;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-indigo-500 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              Drag and drop your PDFs here
            </p>
            <p className="text-sm text-gray-500">or click to select files</p>
          </div>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            Selected Files ({selectedFiles.length})
          </h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.size > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
          <div className="space-y-2">
            {Array.from(uploadProgress.values()).map((file) => (
              <div key={file.filename} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">{file.filename}</p>
                  <span className="text-xs text-gray-500">
                    {file.status === "completed" && "✓ Completed"}
                    {file.status === "uploading" && "Uploading..."}
                    {file.status === "processing" && "Processing..."}
                    {file.status === "failed" && "Failed"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      file.status === "completed"
                        ? "bg-green-500"
                        : file.status === "failed"
                          ? "bg-red-500"
                          : "bg-indigo-500"
                    }`}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
                {file.error && (
                  <div className="flex items-center space-x-1 text-red-600 text-xs">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <span>{file.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || isUploading}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? "Uploading..." : "Upload PDFs"}
      </button>
    </div>
  );
}


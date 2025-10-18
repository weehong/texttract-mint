import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generatePresignedUploadUrl } from "@/lib/aws/s3";
import { addPDFMetadata } from "@/lib/storage/mongodb-metadata";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, contentType } = body;

    // Validate request body
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Validate content type
    if (contentType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Generate unique S3 key for temporary storage
    // Note: PDF will be deleted after text extraction
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .toLowerCase();
    const s3Key = `temp-pdfs/${Date.now()}-${sanitizedFilename}`;

    // Generate presigned upload URL
    const { url: uploadUrl, bucket } = await generatePresignedUploadUrl(
      s3Key,
      contentType
    );

    // Generate unique ID for tracking
    const id = randomUUID();

    // Create initial metadata entry (without s3Key since it's temporary)
    await addPDFMetadata({
      id,
      filename,
      extractedText: "",
      uploadedAt: new Date().toISOString(),
      status: "processing",
    });

    return NextResponse.json({
      id,
      uploadUrl,
      s3Key,
      bucket,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate upload URL",
      },
      { status: 500 }
    );
  }
}


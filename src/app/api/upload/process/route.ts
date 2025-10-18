import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/aws/textract";
import { updatePDFMetadata } from "@/lib/storage/mongodb-metadata";
import { deleteFromS3 } from "@/lib/aws/s3";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, s3Key } = body;

    // Validate request body
    if (!id || !s3Key) {
      return NextResponse.json(
        { error: "Missing id or s3Key" },
        { status: 400 }
      );
    }

    // Process document with Textract
    const extractedText = await processDocument(s3Key);

    // Delete PDF from S3 immediately after extraction
    // We only keep the extracted text, not the original PDF
    try {
      await deleteFromS3(s3Key);
      console.log(`Deleted temporary PDF from S3: ${s3Key}`);
    } catch (deleteError) {
      // Log but don't fail the request if deletion fails
      console.error("Failed to delete PDF from S3:", deleteError);
    }

    // Update metadata with extracted text and completed status
    await updatePDFMetadata(id, {
      extractedText,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      id,
      extractedTextLength: extractedText.length,
    });
  } catch (error) {
    console.error("Error processing document:", error);

    // Update metadata with failed status
    const body = await request.json();
    const { id, s3Key } = body;
    if (id) {
      await updatePDFMetadata(id, {
        status: "failed",
      }).catch((err) => console.error("Failed to update metadata:", err));
    }

    // Try to clean up the S3 file even on failure
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
      } catch (deleteError) {
        console.error("Failed to delete PDF from S3 after error:", deleteError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process document",
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { getAllMetadata } from "@/lib/storage/mongodb-metadata";

export async function GET() {
  try {
    const allMetadata = await getAllMetadata();

    // Filter to only include completed PDFs
    const completedPdfs = allMetadata
      .filter((pdf) => pdf.status === "completed")
      .map((pdf) => ({
        id: pdf.id,
        filename: pdf.filename,
        uploadedAt: pdf.uploadedAt,
        status: pdf.status,
      }));

    return NextResponse.json({
      pdfs: completedPdfs,
      total: completedPdfs.length,
    });
  } catch (error) {
    console.error("Error fetching PDFs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch PDFs",
      },
      { status: 500 }
    );
  }
}


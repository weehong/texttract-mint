import { Collection, ObjectId } from "mongodb";
import { getCollection } from "@/lib/database/mongodb";

export interface PDFMetadata {
  id: string;
  filename: string;
  extractedText: string;
  uploadedAt: string;
  textractJobId?: string;
  status: "processing" | "completed" | "failed";
  // Note: PDFs are deleted from S3 after text extraction
  // Only extracted text is retained for searching
}

// MongoDB document interface (includes _id)
interface PDFMetadataDocument extends Omit<PDFMetadata, 'id'> {
  _id?: ObjectId;
  id: string;
}

const COLLECTION_NAME = "pdf_metadata";

/**
 * Get the PDF metadata collection
 */
async function getMetadataCollection(): Promise<Collection<PDFMetadataDocument>> {
  return getCollection<PDFMetadataDocument>(COLLECTION_NAME);
}

/**
 * Create indexes for better performance
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getMetadataCollection();
    
    // Create indexes for better query performance
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ uploadedAt: -1 });
    await collection.createIndex({ filename: 1 });
    
    // Text index for full-text search on extractedText
    await collection.createIndex({ extractedText: "text" });
    
    console.log("MongoDB indexes created successfully");
  } catch (error) {
    // Indexes might already exist, log but don't throw
    console.log("MongoDB indexes already exist or failed to create:", error);
  }
}

/**
 * Load all metadata from MongoDB
 */
export async function loadMetadata(): Promise<PDFMetadata[]> {
  try {
    const collection = await getMetadataCollection();
    await ensureIndexes(); // Ensure indexes exist
    
    const documents = await collection.find({}).toArray();
    
    return documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      extractedText: doc.extractedText,
      uploadedAt: doc.uploadedAt,
      textractJobId: doc.textractJobId,
      status: doc.status,
    }));
  } catch (error) {
    throw new Error(
      `Failed to load metadata from MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save metadata array to MongoDB (for compatibility, but not recommended for large datasets)
 */
export async function saveMetadata(metadata: PDFMetadata[]): Promise<void> {
  try {
    const collection = await getMetadataCollection();
    await ensureIndexes(); // Ensure indexes exist
    
    // Clear existing data and insert new data
    await collection.deleteMany({});
    
    if (metadata.length > 0) {
      const documents: PDFMetadataDocument[] = metadata.map(item => ({
        id: item.id,
        filename: item.filename,
        extractedText: item.extractedText,
        uploadedAt: item.uploadedAt,
        textractJobId: item.textractJobId,
        status: item.status,
      }));
      
      await collection.insertMany(documents);
    }
  } catch (error) {
    throw new Error(
      `Failed to save metadata to MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Add new PDF metadata
 */
export async function addPDFMetadata(metadata: PDFMetadata): Promise<PDFMetadata> {
  try {
    const collection = await getMetadataCollection();
    await ensureIndexes(); // Ensure indexes exist
    
    const document: PDFMetadataDocument = {
      id: metadata.id,
      filename: metadata.filename,
      extractedText: metadata.extractedText,
      uploadedAt: metadata.uploadedAt,
      textractJobId: metadata.textractJobId,
      status: metadata.status,
    };
    
    await collection.insertOne(document);
    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to add PDF metadata to MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update existing PDF metadata
 */
export async function updatePDFMetadata(
  id: string,
  updates: Partial<PDFMetadata>
): Promise<PDFMetadata | null> {
  try {
    const collection = await getMetadataCollection();

    // Remove id from updates to prevent conflicts
    const { id: _, ...updateFields } = updates;

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      filename: result.filename,
      extractedText: result.extractedText,
      uploadedAt: result.uploadedAt,
      textractJobId: result.textractJobId,
      status: result.status,
    };
  } catch (error) {
    throw new Error(
      `Failed to update PDF metadata in MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Search metadata by query (case-insensitive)
 */
export async function searchMetadata(query: string): Promise<PDFMetadata[]> {
  try {
    const collection = await getMetadataCollection();

    let documents: PDFMetadataDocument[] = [];

    // First try text search for better performance
    try {
      documents = await collection.find({
        $and: [
          { status: "completed" },
          { $text: { $search: query } }
        ]
      }).toArray();
    } catch (textSearchError) {
      // If text search fails, fall back to regex search
      console.log("Text search failed, falling back to regex:", textSearchError);
      documents = [];
    }

    // If text search returned no results, try regex search as fallback
    if (documents.length === 0) {
      documents = await collection.find({
        $and: [
          { status: "completed" },
          { extractedText: { $regex: query, $options: "i" } }
        ]
      }).toArray();
    }

    return documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      extractedText: doc.extractedText,
      uploadedAt: doc.uploadedAt,
      textractJobId: doc.textractJobId,
      status: doc.status,
    }));
  } catch (error) {
    throw new Error(
      `Failed to search metadata in MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all metadata sorted by uploadedAt descending
 */
export async function getAllMetadata(): Promise<PDFMetadata[]> {
  try {
    const collection = await getMetadataCollection();

    const documents = await collection.find({})
      .sort({ uploadedAt: -1 })
      .toArray();

    return documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      extractedText: doc.extractedText,
      uploadedAt: doc.uploadedAt,
      textractJobId: doc.textractJobId,
      status: doc.status,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get all metadata from MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

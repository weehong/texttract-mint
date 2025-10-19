import { MongoClient, Db, Collection, Document } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get MongoDB connection string from environment variables
 */
function getConnectionString(): string {
  const connectionString = process.env.MONGODB_URI;
  
  if (!connectionString) {
    throw new Error(
      "Missing MongoDB connection string. Please set MONGODB_URI environment variable."
    );
  }
  
  return connectionString;
}

/**
 * Get database name from environment variables or use default
 */
function getDatabaseName(): string {
  return process.env.MONGODB_DATABASE || "pdf_extractor";
}

/**
 * Initialize and return MongoDB client instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    try {
      const connectionString = getConnectionString();
      client = new MongoClient(connectionString);
      await client.connect();
      console.log("Connected to MongoDB successfully");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw new Error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  return client;
}

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  if (!db) {
    const mongoClient = await getMongoClient();
    const databaseName = getDatabaseName();
    db = mongoClient.db(databaseName);
  }
  
  return db;
}

/**
 * Get a specific collection from the database
 */
export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const database = await getDatabase();
  return database.collection<T>(collectionName);
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

/**
 * Health check for MongoDB connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const database = await getDatabase();
    await database.admin().ping();
    return true;
  } catch (error) {
    console.error("MongoDB health check failed:", error);
    return false;
  }
}

// Graceful shutdown handling
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    await closeConnection();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await closeConnection();
    process.exit(0);
  });
}

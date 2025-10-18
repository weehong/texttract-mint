import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  Block,
} from "@aws-sdk/client-textract";

let textractClient: TextractClient | null = null;

/**
 * Initialize and return TextractClient instance
 */
export function getTextractClient(): TextractClient {
  if (!textractClient) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing AWS credentials. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables."
      );
    }

    textractClient = new TextractClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return textractClient;
}

/**
 * Start asynchronous text extraction job
 * @param s3Key - S3 object key where PDF is stored
 * @returns JobId from the response
 */
export async function startTextExtraction(s3Key: string): Promise<string> {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
    }

    const client = getTextractClient();
    const command = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key,
        },
      },
    });

    const response = await client.send(command);

    if (!response.JobId) {
      throw new Error("No JobId returned from StartDocumentTextDetection");
    }

    return response.JobId;
  } catch (error) {
    if (error instanceof Error && error.name === "ThrottlingException") {
      throw new Error(
        "AWS Textract is throttled. Please try again later."
      );
    }
    if (error instanceof Error && error.name === "DocumentTooLargeException") {
      throw new Error("PDF document is too large for Textract processing.");
    }
    if (error instanceof Error && error.name === "InvalidS3ObjectException") {
      throw new Error("Invalid S3 object. Please check the bucket and key.");
    }
    throw new Error(
      `Failed to start text extraction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Poll extraction job status
 * @param jobId - Textract job ID
 * @returns Object with status, blocks, and nextToken
 */
export async function getTextExtractionStatus(jobId: string): Promise<{
  status: string;
  blocks?: Block[];
  nextToken?: string;
}> {
  try {
    const client = getTextractClient();
    const command = new GetDocumentTextDetectionCommand({
      JobId: jobId,
    });

    const response = await client.send(command);

    return {
      status: response.JobStatus || "UNKNOWN",
      blocks: response.Blocks,
      nextToken: response.NextToken,
    };
  } catch (error) {
    throw new Error(
      `Failed to get text extraction status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract text from Textract blocks
 * @param blocks - Array of Textract blocks
 * @returns Concatenated string of all detected text
 */
export function extractTextFromBlocks(blocks: Block[]): string {
  if (!blocks) return "";

  return blocks
    .filter((block) => block.BlockType === "LINE")
    .map((block) => block.Text || "")
    .join("\n");
}

/**
 * High-level function that orchestrates full extraction
 * Starts job, polls until complete with exponential backoff, extracts text
 * @param s3Key - S3 object key
 * @returns Final extracted text string
 */
export async function processDocument(s3Key: string): Promise<string> {
  try {
    // Start the extraction job
    const jobId = await startTextExtraction(s3Key);

    // Poll for completion with exponential backoff
    let status = "IN_PROGRESS";
    let allBlocks: Block[] = [];
    let nextToken: string | undefined;
    let pollCount = 0;
    let backoffMs = 2000; // Start at 2 seconds
    const maxBackoffMs = 30000; // Max 30 seconds
    const timeoutMs = 5 * 60 * 1000; // 5 minutes timeout
    const startTime = Date.now();

    while (status === "IN_PROGRESS") {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          "Text extraction timed out after 5 minutes. Document may be too large."
        );
      }

      // Wait before polling
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      // Poll status
      const result = await getTextExtractionStatus(jobId);
      status = result.status;

      if (result.blocks) {
        allBlocks = allBlocks.concat(result.blocks);
      }

      nextToken = result.nextToken;

      // Increase backoff exponentially
      backoffMs = Math.min(backoffMs * 1.5, maxBackoffMs);
      pollCount++;

      // Fetch next page if available
      while (nextToken) {
        const client = getTextractClient();
        const command = new GetDocumentTextDetectionCommand({
          JobId: jobId,
          NextToken: nextToken,
        });

        const response = await client.send(command);
        if (response.Blocks) {
          allBlocks = allBlocks.concat(response.Blocks);
        }
        nextToken = response.NextToken;
      }
    }

    if (status === "FAILED") {
      throw new Error("Textract job failed. Please check the PDF and try again.");
    }

    // Extract text from all blocks
    const extractedText = extractTextFromBlocks(allBlocks);

    return extractedText;
  } catch (error) {
    throw new Error(
      `Failed to process document: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


# PDF Text Extractor

A full-stack web application for uploading multiple PDF files, extracting text using AWS Textract, and searching across all documents. Built with Next.js 15, TypeScript, TailwindCSS v4, and AWS SDK v3.

**Important**: This application uses a "process once and discard" approach. PDFs are temporarily uploaded to S3 for Textract processing, then immediately deleted after text extraction. Only the extracted text is retained for searching.

## Project Overview

**PDF Text Extractor** enables users to:
- Upload multiple PDF files simultaneously
- Extract text from PDFs using AWS Textract
- Automatically delete PDFs from S3 after text extraction
- Search across all extracted text in real-time
- View extracted text with search highlighting

## Key Features

- **Multi-file Upload**: Drag-and-drop or click to select multiple PDFs
- **AWS Textract Integration**: Asynchronous text extraction with job polling
- **Temporary S3 Storage**: PDFs are automatically deleted after text extraction
- **Full-Text Search**: Search across all extracted text with match previews
- **Expandable Results**: Click to view full extracted text with highlighting
- **Modern UI**: TailwindUI-inspired components with responsive design
- **Real-time Progress**: Upload and processing status indicators
- **Privacy-Focused**: Original PDFs are not retained after processing

## Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **AWS Account**: With S3 and Textract access
- **AWS Credentials**: Access key and secret key with appropriate IAM permissions

### Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText",
        "textract:StartDocumentTextDetection",
        "textract:GetDocumentTextDetection"
      ],
      "Resource": "*"
    }
  ]
}
```

## Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd pdf-extractor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your AWS credentials and MongoDB connection:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your-pdf-bucket-name
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/pdf_extractor
MONGODB_DATABASE=pdf_extractor
```

### 4. Setup MongoDB

For local development, install and start MongoDB:

```bash
# Install MongoDB (macOS with Homebrew)
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or for other systems, follow MongoDB installation guide:
# https://docs.mongodb.com/manual/installation/
```

For production, consider using MongoDB Atlas (cloud) or your preferred MongoDB hosting solution.

### 5. Create S3 Bucket

```bash
aws s3 mb s3://your-pdf-bucket-name --region us-east-1
```

### 6. Configure S3 CORS (for presigned URLs)

```bash
aws s3api put-bucket-cors --bucket your-pdf-bucket-name --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

## Running the Application

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Usage Guide

### Uploading PDFs

1. Click the **"Upload PDFs"** tab
2. Drag and drop PDF files or click to select
3. Click **"Upload PDFs"** button
4. Monitor progress as files are uploaded and processed
5. PDFs are automatically deleted from S3 after text extraction
6. Once complete, you'll be automatically switched to the search view

### Searching Documents

1. Click the **"Search PDFs"** tab
2. Enter your search query (minimum 2 characters)
3. Results appear with match previews
4. Click a result to expand and view the full extracted text

### Viewing Extracted Text

- **Expand/Collapse**: Click on any search result to toggle full text view
- **Highlighting**: Search terms are highlighted in yellow
- **Scrollable**: Long text is scrollable within the expanded view
- **Note**: Original PDFs are not available for download (deleted after processing)

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS v4
- **Backend**: Next.js API Routes
- **AWS Services**: S3 (temporary storage), Textract
- **Icons**: Heroicons
- **Database**: MongoDB (for metadata storage)

### Data Flow

```
User Upload
    ↓
Generate Presigned URL (API)
    ↓
Upload to S3 (Client) - Temporary Storage
    ↓
Trigger Textract Processing (API)
    ↓
Poll Textract Job Status (API)
    ↓
Extract Text & Store Metadata (API)
    ↓
Delete PDF from S3 (API) - Cleanup
    ↓
Search & Display Results (API)
    ↓
View Extracted Text (Client)
```

### Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   ├── presigned-url/route.ts
│   │   │   └── process/route.ts
│   │   ├── search/route.ts
│   │   └── pdfs/route.ts
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── FileUpload.tsx
│   ├── SearchBar.tsx
│   └── SearchResults.tsx
├── lib/
│   ├── aws/
│   │   ├── s3.ts
│   │   └── textract.ts
│   ├── database/
│   │   └── mongodb.ts
│   └── storage/
│       └── mongodb-metadata.ts
└── types/
    └── index.ts
```

## API Endpoints

### POST `/api/upload/presigned-url`

Generate a presigned URL for direct S3 upload.

**Request:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "id": "uuid",
  "uploadUrl": "https://...",
  "s3Key": "pdfs/...",
  "bucket": "bucket-name"
}
```

### POST `/api/upload/process`

Trigger Textract processing for an uploaded PDF.

**Request:**
```json
{
  "id": "uuid",
  "s3Key": "pdfs/..."
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid",
  "extractedTextLength": 5000
}
```

### GET `/api/search?q=query`

Search across all extracted text.

**Response:**
```json
{
  "query": "search term",
  "results": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "matchPreview": "...search term...",
      "extractedText": "Full extracted text content..."
    }
  ],
  "totalResults": 1
}
```

### GET `/api/pdfs`

List all completed PDFs.

**Response:**
```json
{
  "pdfs": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "status": "completed"
    }
  ],
  "total": 1
}
```

## Limitations & Considerations

### Current Implementation

- **File-based Storage**: Uses JSON files for metadata (suitable for development only)
- **No PDF Retention**: Original PDFs are deleted after text extraction
- **Text-Only Search**: Cannot search within PDF structure (tables, images, etc.)
- **Textract Processing Time**: 30-60 seconds for large PDFs
- **Concurrent Uploads**: Limited to 3 concurrent uploads
- **AWS Costs**: Textract charges per page (~$0.015 per page)
- **S3 Storage Costs**: Minimal (temporary storage only during processing)

### Production Recommendations

1. **Database Integration**: Migrate to PostgreSQL or MongoDB
2. **Background Job Queue**: Use AWS SQS or BullMQ for async processing
3. **User Authentication**: Add NextAuth.js or similar
4. **Caching**: Implement Redis for search results
5. **Error Handling**: Add comprehensive logging and monitoring
6. **Rate Limiting**: Implement API rate limiting

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Advanced search (fuzzy matching, filters, date ranges)
- [ ] Batch operations (delete, export)
- [ ] OCR for scanned PDFs (Textract already supports this)
- [ ] Export search results to CSV/JSON
- [ ] Optional PDF retention with user preference
- [ ] Text analytics (word frequency, sentiment analysis)
- [ ] Multi-language support
- [ ] Collaborative features

## Troubleshooting

### AWS Credential Errors

**Error**: `Missing AWS credentials`

**Solution**: Verify `.env.local` contains all required AWS variables and they are correct.



### S3 CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**: Configure S3 bucket CORS settings as shown in Setup Instructions.

### Textract Throttling

**Error**: `ThrottlingException`

**Solution**: Implement exponential backoff (already included) or reduce concurrent uploads.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on GitHub.

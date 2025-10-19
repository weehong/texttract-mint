// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the pdf_extractor database
db = db.getSiblingDB('pdf_extractor');

// Create the pdf_metadata collection with validation
db.createCollection('pdf_metadata', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'filename', 'extractedText', 'uploadedAt', 'status'],
      properties: {
        id: {
          bsonType: 'string',
          description: 'Unique identifier for the PDF document'
        },
        filename: {
          bsonType: 'string',
          description: 'Original filename of the PDF'
        },
        extractedText: {
          bsonType: 'string',
          description: 'Text extracted from the PDF using AWS Textract'
        },
        uploadedAt: {
          bsonType: 'string',
          description: 'ISO timestamp when the PDF was uploaded'
        },
        textractJobId: {
          bsonType: 'string',
          description: 'AWS Textract job ID (optional)'
        },
        status: {
          bsonType: 'string',
          enum: ['processing', 'completed', 'failed'],
          description: 'Processing status of the PDF'
        }
      }
    }
  }
});

// Create indexes for better performance
db.pdf_metadata.createIndex({ id: 1 }, { unique: true });
db.pdf_metadata.createIndex({ status: 1 });
db.pdf_metadata.createIndex({ uploadedAt: -1 });
db.pdf_metadata.createIndex({ filename: 1 });
db.pdf_metadata.createIndex({ extractedText: 'text' });

print('✅ PDF Extractor database initialized successfully');
print('📊 Collection: pdf_metadata created with validation schema');
print('🔍 Indexes created for optimal query performance');

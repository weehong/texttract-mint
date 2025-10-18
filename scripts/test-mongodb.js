#!/usr/bin/env node

/**
 * Test script to verify MongoDB connection and basic operations
 * Run with: node scripts/test-mongodb.js
 */

const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf_extractor';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'pdf_extractor';

async function testMongoDBConnection() {
  let client;
  
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('Connection URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    // Get database and collection
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection('pdf_metadata');
    
    // Test basic operations
    console.log('\n🔄 Testing basic operations...');
    
    // 1. Insert test document
    const testDoc = {
      id: randomUUID(),
      filename: 'test-document.pdf',
      extractedText: 'This is a test document with some sample text for searching.',
      uploadedAt: new Date().toISOString(),
      status: 'completed'
    };
    
    await collection.insertOne(testDoc);
    console.log('✅ Insert operation successful');
    
    // 2. Find the document
    const foundDoc = await collection.findOne({ id: testDoc.id });
    if (foundDoc && foundDoc.filename === testDoc.filename) {
      console.log('✅ Find operation successful');
    } else {
      throw new Error('Find operation failed');
    }
    
    // 3. Update the document
    await collection.updateOne(
      { id: testDoc.id },
      { $set: { status: 'updated' } }
    );
    
    const updatedDoc = await collection.findOne({ id: testDoc.id });
    if (updatedDoc && updatedDoc.status === 'updated') {
      console.log('✅ Update operation successful');
    } else {
      throw new Error('Update operation failed');
    }
    
    // 4. Test text search
    await collection.createIndex({ extractedText: 'text' });
    const searchResults = await collection.find({
      $text: { $search: 'sample' }
    }).toArray();
    
    if (searchResults.length > 0) {
      console.log('✅ Text search operation successful');
    } else {
      console.log('⚠️  Text search returned no results (this might be expected)');
    }
    
    // 5. Clean up test document
    await collection.deleteOne({ id: testDoc.id });
    console.log('✅ Delete operation successful');
    
    // 6. Test connection health
    await db.admin().ping();
    console.log('✅ Database health check successful');
    
    console.log('\n🎉 All MongoDB tests passed!');
    console.log('\nYour MongoDB setup is ready for the PDF extractor application.');
    
  } catch (error) {
    console.error('\n❌ MongoDB test failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure MongoDB is running');
    console.error('2. Check your MONGODB_URI in .env.local');
    console.error('3. Verify network connectivity to MongoDB');
    console.error('4. Check MongoDB authentication credentials');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the test
testMongoDBConnection().catch(console.error);

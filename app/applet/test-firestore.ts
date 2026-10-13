import { adminDb } from './src/lib/firebase-admin.ts';

async function testFirestoreConnection() {
  console.log('=== MBT Library Live Firebase Connection Test ===');
  console.log('Target Project ID: mbtlibrary26');
  
  try {
    const testDocRef = adminDb.collection('connection_tests').doc('mbtlibrary26_live_test');
    
    console.log('1. Writing test document to connection_tests/mbtlibrary26_live_test...');
    const testData = {
      timestamp: new Date().toISOString(),
      status: 'verified',
      projectId: 'mbtlibrary26',
      message: 'Live connection test successful'
    };
    await testDocRef.set(testData);
    console.log('✓ Write successful!');

    console.log('2. Reading test document back from Firestore...');
    const docSnap = await testDocRef.get();
    if (!docSnap.exists) {
      throw new Error('Test document does not exist after write!');
    }
    const retrievedData = docSnap.data();
    console.log('✓ Read successful! Data:', JSON.stringify(retrievedData, null, 2));

    if (retrievedData?.projectId !== 'mbtlibrary26' || retrievedData?.status !== 'verified') {
      throw new Error('Retrieved data payload mismatch!');
    }

    console.log('3. Cleaning up test document...');
    await testDocRef.delete();
    console.log('✓ Delete cleanup successful!');

    console.log('=== ALL FIRESTORE LIVE TESTS PASSED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('✗ Firestore live test failed:', error.message || error);
    process.exit(1);
  }
}

testFirestoreConnection();

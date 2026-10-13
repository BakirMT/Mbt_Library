import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp as initAdmin, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function runTest() {
  console.log('=== MBT LIBRARY LIVE FIREBASE CONNECTION TEST ===');
  
  // Read config
  const configRaw = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
  const config = JSON.parse(configRaw);
  console.log(`Detected Project ID in config: ${config.projectId}`);

  if (config.projectId !== 'mbtlibrary26') {
    console.error(`ERROR: Expected projectId 'mbtlibrary26', got '${config.projectId}'`);
    process.exit(1);
  }

  // 1. Test Admin SDK / Firestore
  if (!getAdminApps().length) {
    initAdmin({ projectId: config.projectId });
  }
  const adminDb = getAdminFirestore();
  const testId = 'test_doc_' + Date.now();
  const testRef = adminDb.collection('_connection_tests').doc(testId);

  console.log(`[Admin SDK] Writing test doc ${testId} to _connection_tests...`);
  await testRef.set({
    project: config.projectId,
    timestamp: new Date().toISOString(),
    status: 'created',
    verifiedBy: 'MBT Super Admin'
  });
  console.log('[Admin SDK] Write successful.');

  console.log('[Admin SDK] Reading test doc back...');
  const snap = await testRef.get();
  if (!snap.exists) {
    throw new Error('Test document not found after write!');
  }
  console.log('[Admin SDK] Read successful. Data:', snap.data());

  console.log('[Admin SDK] Updating test doc...');
  await testRef.update({ status: 'updated' });
  const updatedSnap = await testRef.get();
  console.log('[Admin SDK] Update successful. Status:', updatedSnap.data()?.status);

  console.log('[Admin SDK] Cleaning up test doc...');
  await testRef.delete();
  console.log('[Admin SDK] Cleanup successful.');

  console.log('=== ALL LIVE FIREBASE TESTS PASSED SUCCESSFULLY AGAINST PROJECT: mbtlibrary26 ===');
}

runTest().catch((err) => {
  console.error('LIVE CONNECTION TEST FAILED:', err);
  process.exit(1);
});

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'M1Autoposter Firebase Functions'
  });
});

// Platforms endpoint
app.get('/platforms', (req, res) => {
  const platforms = [
    { id: 'instagram', name: 'Instagram', enabled: true },
    { id: 'twitter', name: 'Twitter/X', enabled: true },
    { id: 'linkedin', name: 'LinkedIn', enabled: true },
    { id: 'youtube', name: 'YouTube Shorts', enabled: true },
    { id: 'tiktok', name: 'TikTok', enabled: true },
    { id: 'facebook', name: 'Facebook', enabled: true }
  ];
  res.json({ platforms });
});

// M1A dashboard endpoint
app.get('/dashboard/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Get client platforms from Firestore
    const platformsSnapshot = await admin.firestore()
      .collection('clients')
      .doc(tenantId)
      .collection('platforms')
      .get();
    
    const platforms = platformsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get posting statistics
    const statsSnapshot = await admin.firestore()
      .collection('clients')
      .doc(tenantId)
      .collection('posts')
      .get();
    
    const stats = {
      total: statsSnapshot.size,
      successful: 0,
      failed: 0
    };
    
    statsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'successful') stats.successful++;
      if (data.status === 'failed') stats.failed++;
    });
    
    res.json({
      tenantId,
      platforms,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Firebase Function
exports.api = functions.https.onRequest(app);

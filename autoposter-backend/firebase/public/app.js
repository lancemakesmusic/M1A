// Firebase configuration (replace with your config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class M1AutoposterDashboard {
  constructor(tenantId = 'demo-tenant') {
    this.tenantId = tenantId;
    this.init();
  }
  
  async init() {
    await this.loadPlatforms();
    await this.loadStats();
    this.render();
  }
  
  async loadPlatforms() {
    try {
      // Load platforms from Firestore
      const platformsRef = db.collection('clients').doc(this.tenantId).collection('platforms');
      const snapshot = await platformsRef.get();
      this.platforms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If no platforms found, show default platforms
      if (this.platforms.length === 0) {
        this.platforms = [
          { id: 'instagram', name: 'Instagram', enabled: false },
          { id: 'twitter', name: 'Twitter/X', enabled: false },
          { id: 'linkedin', name: 'LinkedIn', enabled: false },
          { id: 'youtube', name: 'YouTube Shorts', enabled: false },
          { id: 'tiktok', name: 'TikTok', enabled: false },
          { id: 'facebook', name: 'Facebook', enabled: false }
        ];
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
      this.platforms = [];
    }
  }
  
  async loadStats() {
    try {
      const postsRef = db.collection('clients').doc(this.tenantId).collection('posts');
      const snapshot = await postsRef.get();
      this.stats = {
        total: snapshot.size,
        successful: 0,
        failed: 0
      };
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'successful') this.stats.successful++;
        if (data.status === 'failed') this.stats.failed++;
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      this.stats = { total: 0, successful: 0, failed: 0 };
    }
  }
  
  render() {
    const dashboardHTML = `
      <div class="platforms-section">
        <h2>Connected Platforms</h2>
        <div class="platforms">
          ${this.platforms.map(platform => `
            <div class="platform-card">
              <span class="platform-name">${platform.name || platform.id}</span>
              <span class="status ${platform.enabled ? 'active' : 'inactive'}">
                ${platform.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="stats-section">
        <h2>Posting Statistics</h2>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${this.stats.total}</div>
            <div class="stat-label">Total Posts</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.stats.successful}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.stats.failed}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('app').innerHTML = dashboardHTML;
  }
}

// Initialize dashboard
const dashboard = new M1AutoposterDashboard();

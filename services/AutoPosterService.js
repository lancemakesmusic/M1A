import { Platform } from 'react-native';

// Auto Poster API Service
class AutoPosterService {
  constructor() {
    // Use localhost for development, replace with your backend URL for production
    this.baseURL = Platform.OS === 'ios' 
      ? 'http://localhost:8001' 
      : 'http://10.0.2.2:8001'; // Android emulator localhost
  }

  // Generic API call method
  async apiCall(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      console.log(`AutoPoster API Call: ${method} ${url}`, data);
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`AutoPoster API Response:`, result);
      return result;
    } catch (error) {
      console.error('AutoPoster API Error:', error);
      throw error;
    }
  }

  // Content Generation
  async generateContent(prompt, contentType, platform, brandVoice, targetAudience) {
    return this.apiCall('/api/generate-content', 'POST', {
      prompt,
      content_type: contentType,
      platform,
      brand_voice: brandVoice,
      target_audience: targetAudience
    });
  }

  // Schedule Post
  async schedulePost(postData) {
    return this.apiCall('/api/schedule-post', 'POST', postData);
  }

  // Get Scheduled Posts
  async getScheduledPosts() {
    return this.apiCall('/api/scheduled-posts', 'GET');
  }

  // Update Scheduled Post
  async updateScheduledPost(postId, updates) {
    return this.apiCall(`/api/scheduled-posts/${postId}`, 'PUT', updates);
  }

  // Delete Scheduled Post
  async deleteScheduledPost(postId) {
    return this.apiCall(`/api/scheduled-posts/${postId}`, 'DELETE');
  }

  // Get Media Library
  async getMediaLibrary() {
    return this.apiCall('/api/media-library', 'GET');
  }

  // Upload Media
  async uploadMedia(mediaData) {
    return this.apiCall('/api/upload-media', 'POST', mediaData);
  }

  // Get Auto Poster Status
  async getAutoPosterStatus() {
    return this.apiCall('/api/auto-poster-status', 'GET');
  }

  // Toggle Auto Poster
  async toggleAutoPoster(enabled) {
    return this.apiCall('/api/toggle-auto-poster', 'POST', { enabled });
  }

  // Get Analytics
  async getAnalytics() {
    return this.apiCall('/api/analytics', 'GET');
  }

  // Get Platform Settings
  async getPlatformSettings() {
    return this.apiCall('/api/platform-settings', 'GET');
  }

  // Update Platform Settings
  async updatePlatformSettings(platform, settings) {
    return this.apiCall(`/api/platform-settings/${platform}`, 'PUT', settings);
  }

  // Test Platform Connection
  async testPlatformConnection(platform) {
    return this.apiCall(`/api/test-connection/${platform}`, 'POST');
  }

  // Get Content Templates
  async getContentTemplates() {
    return this.apiCall('/api/content-templates', 'GET');
  }

  // Save Content Template
  async saveContentTemplate(template) {
    return this.apiCall('/api/content-templates', 'POST', template);
  }

  // Get Optimal Posting Times
  async getOptimalPostingTimes(platform) {
    return this.apiCall(`/api/optimal-times/${platform}`, 'GET');
  }

  // Bulk Schedule Posts
  async bulkSchedulePosts(posts) {
    return this.apiCall('/api/bulk-schedule', 'POST', { posts });
  }

  // Get Post Performance
  async getPostPerformance(postId) {
    return this.apiCall(`/api/post-performance/${postId}`, 'GET');
  }

  // Get Hashtag Suggestions
  async getHashtagSuggestions(content, platform) {
    return this.apiCall('/api/hashtag-suggestions', 'POST', { content, platform });
  }

  // Get Trending Topics
  async getTrendingTopics(platform) {
    return this.apiCall(`/api/trending-topics/${platform}`, 'GET');
  }

  // Health Check
  async healthCheck() {
    return this.apiCall('/api/health', 'GET');
  }
}

export default new AutoPosterService();

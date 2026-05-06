/**
 * Google Drive Service
 * Handles Google Drive integration for client content library
 * Provides pass-through access to files without storing them locally
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { getApiBaseUrl } from '../utils/apiConfig';
import { logError } from '../utils/logger';

const ACCESS_TOKEN_KEY = 'm1a_google_drive_access_token';

const API_BASE_URL = getApiBaseUrl();

class GoogleDriveService {
  /**
   * Get Google Drive OAuth URL
   */
  getOAuthUrl() {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      throw new Error('Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    }
    const redirectUri = Linking.createURL('/auth/google-drive');
    const scope = 'https://www.googleapis.com/auth/drive.readonly';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
  }

  /**
   * Check if Google Drive is connected
   */
  async isConnected() {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      return !!token;
    } catch (error) {
      logError('Error checking Google Drive connection:', error);
      return false;
    }
  }

  /**
   * Get access token (refresh if needed)
   */
  async getAccessToken() {
    try {
      let token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        throw new Error('Google Drive not connected');
      }
      
      // In a real implementation, you'd check token expiration and refresh if needed
      // For now, we'll use the backend to handle token refresh
      return token;
    } catch (error) {
      logError('Error getting access token:', error);
      throw error;
    }
  }

  async getAuthHeaders() {
    try {
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      const idToken = await currentUser.getIdToken();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      };
    } catch (error) {
      logError('Error getting auth headers:', error);
      throw error;
    }
  }

  /**
   * Get client's Google Drive folder ID from Firestore
   */
  async getClientFolderId(userId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.googleDriveFolderId || null;
      }
      
      return null;
    } catch (error) {
      logError('Error getting client folder ID:', error);
      return null;
    }
  }

  /**
   * Set client's Google Drive folder ID in Firestore
   */
  async setClientFolderId(userId, folderId) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        googleDriveFolderId: folderId,
        googleDriveFolderUpdatedAt: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      logError('Error setting client folder ID:', error);
      throw error;
    }
  }

  /**
   * List files from Google Drive folder (via backend)
   */
  async listFiles(userId, folderId = null) {
    try {
      // Get folder ID if not provided
      if (!folderId) {
        folderId = await this.getClientFolderId(userId);
      }
      
      if (!folderId) {
        return [];
      }

      // Call backend API to list files
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/google-drive/files?folderId=${folderId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list files: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      logError('Error listing Google Drive files:', error);
      return [];
    }
  }

  /**
   * Get file download URL (pass-through, doesn't download locally)
   */
  async getFileDownloadUrl(fileId) {
    try {
      // Get download URL from backend (which will proxy the request)
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/google-drive/files/${fileId}/download-url`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get download URL: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.downloadUrl;
    } catch (error) {
      logError('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Download file (pass-through to device)
   */
  async downloadFile(fileId, fileName) {
    try {
      const headers = await this.getAuthHeaders();
      const safeFileName = (fileName || 'download')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim();
      const downloadUrl = `${API_BASE_URL}/api/google-drive/files/${fileId}/download`;
      const fileUri = `${FileSystem.documentDirectory}${safeFileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers,
      });
      
      // Share the file (opens native share dialog)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        // Fallback: open the file
        await Linking.openURL(downloadResult.uri);
      }
      
      return downloadResult.uri;
    } catch (error) {
      logError('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get file thumbnail URL
   */
  getThumbnailUrl(fileId) {
    // Google Drive provides thumbnails via API
    return `${API_BASE_URL}/api/google-drive/files/${fileId}/thumbnail`;
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(mimeType) {
    if (mimeType?.startsWith('video/')) return 'videocam';
    if (mimeType?.startsWith('audio/')) return 'musical-notes';
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.includes('pdf')) return 'document-text';
    if (mimeType?.includes('word')) return 'document';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'grid';
    return 'document';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

export default new GoogleDriveService();


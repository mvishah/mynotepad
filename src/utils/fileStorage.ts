import type { SavedFile } from '../components/FileHistory';

const MAX_RECENT_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for localStorage

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Add file to recent files list
export const addToRecentFiles = async (file: File): Promise<void> => {
  try {
    const recentFiles = getRecentFiles();
    
    // Create file metadata
    const fileMetadata: SavedFile = {
      id: `recent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      type: file.type
    };

    // Check if file already exists in recent files
    const existingIndex = recentFiles.findIndex(f => 
      f.name === file.name && f.size === file.size
    );

    if (existingIndex > -1) {
      // Update last modified time and move to front
      recentFiles.splice(existingIndex, 1);
    }

    // Add to front of list
    recentFiles.unshift(fileMetadata);

    // Keep only MAX_RECENT_FILES
    const trimmedFiles = recentFiles.slice(0, MAX_RECENT_FILES);

    // Save to localStorage
    localStorage.setItem('recentFiles', JSON.stringify(trimmedFiles));

    // Store file data if size is reasonable
    if (file.size <= MAX_FILE_SIZE) {
      const base64Data = await fileToBase64(file);
      localStorage.setItem(`file_${fileMetadata.id}`, JSON.stringify({
        data: base64Data,
        metadata: fileMetadata
      }));
    }
  } catch (error) {
    console.error('Error adding to recent files:', error);
    // Don't throw error, just log it
  }
};

// Get recent files
export const getRecentFiles = (): SavedFile[] => {
  try {
    const stored = localStorage.getItem('recentFiles');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting recent files:', error);
    return [];
  }
};

// Save annotated PDF to saved files
export const saveAnnotatedFile = async (
  blob: Blob, 
  originalFileName: string,
  annotationCount: number = 0
): Promise<void> => {
  try {
    // Check file size
    if (blob.size > MAX_FILE_SIZE) {
      console.warn('File too large to save in browser storage');
      return;
    }

    const savedFiles = getSavedFiles();
    
    // Convert blob to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Create file metadata
    const fileMetadata: SavedFile = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: originalFileName,
      size: blob.size,
      lastModified: Date.now(),
      type: blob.type,
      annotations: annotationCount
    };

    // Add to saved files list
    savedFiles.unshift(fileMetadata);

    // Save metadata
    localStorage.setItem('savedFiles', JSON.stringify(savedFiles));

    // Save file data
    localStorage.setItem(`file_${fileMetadata.id}`, JSON.stringify({
      data: base64Data,
      metadata: fileMetadata
    }));
  } catch (error) {
    console.error('Error saving annotated file:', error);
    throw new Error('Failed to save file to storage');
  }
};

// Get saved files
export const getSavedFiles = (): SavedFile[] => {
  try {
    const stored = localStorage.getItem('savedFiles');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting saved files:', error);
    return [];
  }
};

// Clear old files if storage is getting full
export const cleanupOldFiles = (): void => {
  try {
    const recentFiles = getRecentFiles();
    const savedFiles = getSavedFiles();
    
    // Keep only the most recent files if storage is getting full
    const allFileIds = [
      ...recentFiles.map(f => f.id),
      ...savedFiles.map(f => f.id)
    ];

    // Remove old file data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('file_')) {
        const fileId = key.replace('file_', '');
        if (!allFileIds.includes(fileId)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

// Get storage usage info
export const getStorageInfo = (): { used: number; available: number; percentage: number } => {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += (localStorage.getItem(key) || '').length;
      }
    }
    
    const available = 5 * 1024 * 1024; // Approximate 5MB localStorage limit
    const percentage = (used / available) * 100;
    
    return { used, available, percentage };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};


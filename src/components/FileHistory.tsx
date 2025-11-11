import { useState, useEffect } from 'react';
import './FileHistory.css';

export interface SavedFile {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  type: string;
  thumbnail?: string;
  annotations?: number; // Number of annotations
}

interface FileHistoryProps {
  onFileSelect: (file: File) => void;
  onClose: () => void;
}

const FileHistory = ({ onFileSelect, onClose }: FileHistoryProps) => {
  const [recentFiles, setRecentFiles] = useState<SavedFile[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecentFiles();
    loadSavedFiles();
  }, []);

  const loadRecentFiles = () => {
    try {
      const stored = localStorage.getItem('recentFiles');
      if (stored) {
        const files = JSON.parse(stored);
        setRecentFiles(files);
      }
    } catch (error) {
      console.error('Error loading recent files:', error);
    }
  };

  const loadSavedFiles = () => {
    try {
      const stored = localStorage.getItem('savedFiles');
      if (stored) {
        const files = JSON.parse(stored);
        setSavedFiles(files);
      }
    } catch (error) {
      console.error('Error loading saved files:', error);
    }
  };

  const handleFileClick = async (savedFile: SavedFile) => {
    try {
      // Try to load the file from the saved data
      const stored = localStorage.getItem(`file_${savedFile.id}`);
      if (stored) {
        const fileData = JSON.parse(stored);
        const blob = base64ToBlob(fileData.data, savedFile.type);
        const file = new File([blob], savedFile.name, {
          type: savedFile.type,
          lastModified: savedFile.lastModified
        });
        onFileSelect(file);
      } else {
        alert('File not found. It may have been removed from storage.');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file. Please try uploading it again.');
    }
  };

  const handleDeleteFile = (fileId: string, type: 'recent' | 'saved', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to remove this file from the list?')) {
      return;
    }

    try {
      if (type === 'recent') {
        const updated = recentFiles.filter(f => f.id !== fileId);
        setRecentFiles(updated);
        localStorage.setItem('recentFiles', JSON.stringify(updated));
      } else {
        const updated = savedFiles.filter(f => f.id !== fileId);
        setSavedFiles(updated);
        localStorage.setItem('savedFiles', JSON.stringify(updated));
        // Also remove the file data
        localStorage.removeItem(`file_${fileId}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filterFiles = (files: SavedFile[]) => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(query)
    );
  };

  const displayFiles = activeTab === 'recent' ? filterFiles(recentFiles) : filterFiles(savedFiles);

  return (
    <div className="file-history-overlay" onClick={onClose}>
      <div className="file-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-history-header">
          <h2>📁 File Manager</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="file-history-tabs">
          <button
            className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            🕐 Recent Files ({recentFiles.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            💾 Saved Files ({savedFiles.length})
          </button>
        </div>

        <div className="file-history-search">
          <input
            type="text"
            placeholder="🔍 Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="file-history-content">
          {displayFiles.length === 0 ? (
            <div className="empty-state">
              <p>📭 No files found</p>
              <p className="empty-hint">
                {activeTab === 'recent' 
                  ? 'Recently opened files will appear here'
                  : 'Save annotated PDFs to see them here'}
              </p>
            </div>
          ) : (
            <div className="file-grid">
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  className="file-card"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <h3 className="file-name" title={file.name}>
                      {file.name.length > 30 
                        ? file.name.substring(0, 27) + '...' 
                        : file.name}
                    </h3>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-date">{formatDate(file.lastModified)}</span>
                    </div>
                    {file.annotations !== undefined && file.annotations > 0 && (
                      <div className="file-annotations">
                        ✏️ {file.annotations} annotation{file.annotations > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <button
                    className="delete-file-btn"
                    onClick={(e) => handleDeleteFile(file.id, activeTab, e)}
                    title="Remove from list"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="file-history-footer">
          <button className="upload-new-btn" onClick={onClose}>
            📤 Upload New File
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileHistory;


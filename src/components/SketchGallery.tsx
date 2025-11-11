import { useState, useEffect } from 'react';
import './SketchGallery.css';
import type { Sketch } from '../utils/sketchStorage';
import { getAllSketches, deleteSketch, duplicateSketch, exportSketchAsJSON, importSketchFromJSON } from '../utils/sketchStorage';

interface SketchGalleryProps {
  onNewSketch: () => void;
  onEditSketch: (sketch: Sketch) => void;
  onBack: () => void;
}

const SketchGallery = ({ onNewSketch, onEditSketch, onBack }: SketchGalleryProps) => {
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  useEffect(() => {
    loadSketches();
  }, []);

  const loadSketches = async () => {
    const allSketches = await getAllSketches();
    setSketches(allSketches);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this sketch?')) {
      return;
    }

    try {
      await deleteSketch(id);
      await loadSketches();
    } catch (error) {
      console.error('Error deleting sketch:', error);
      alert('Failed to delete sketch');
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await duplicateSketch(id);
      await loadSketches();
    } catch (error) {
      console.error('Error duplicating sketch:', error);
      alert('Failed to duplicate sketch');
    }
  };

  const handleExport = (sketch: Sketch, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      exportSketchAsJSON(sketch);
    } catch (error) {
      console.error('Error exporting sketch:', error);
      alert('Failed to export sketch');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importSketchFromJSON(file);
      await loadSketches();
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error importing sketch:', error);
      alert('Failed to import sketch. Please check the file format.');
    }
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

  const filterAndSortSketches = (): Sketch[] => {
    let filtered = sketches;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sketch => 
        sketch.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  };

  const displaySketches = filterAndSortSketches();

  return (
    <div className="sketch-gallery">
      <div className="sketch-gallery-header">
        <div className="header-top">
          <button onClick={onBack} className="back-btn-gallery">
            ← Back
          </button>
          <h1>🎨 My Sketches</h1>
          <div className="header-actions">
            <label className="import-btn" title="Import Sketch">
              📥 Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div className="header-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search sketches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}>
              <option value="recent">Recent</option>
              <option value="name">Name</option>
            </select>
          </div>

          <button onClick={onNewSketch} className="new-sketch-btn">
            + New Sketch
          </button>
        </div>
      </div>

      <div className="sketch-gallery-content">
        {displaySketches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <h2>No sketches yet</h2>
            <p>Create your first sketch to get started!</p>
            <button onClick={onNewSketch} className="create-first-btn">
              + Create Your First Sketch
            </button>
          </div>
        ) : (
          <div className="sketch-grid">
            {displaySketches.map((sketch) => (
              <div
                key={sketch.id}
                className="sketch-card"
                onClick={() => onEditSketch(sketch)}
              >
                <div className="sketch-thumbnail">
                  {sketch.thumbnail ? (
                    <img src={sketch.thumbnail} alt={sketch.name} />
                  ) : (
                    <div className="no-thumbnail">🎨</div>
                  )}
                </div>
                
                <div className="sketch-info">
                  <h3 className="sketch-name" title={sketch.name}>
                    {sketch.name.length > 25 
                      ? sketch.name.substring(0, 22) + '...' 
                      : sketch.name}
                  </h3>
                  <div className="sketch-meta">
                    <span className="sketch-date">
                      {formatDate(sketch.updatedAt)}
                    </span>
                    <span className="sketch-paths">
                      ✏️ {sketch.paths.length} stroke{sketch.paths.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="sketch-actions">
                  <button
                    className="action-btn duplicate-btn"
                    onClick={(e) => handleDuplicate(sketch.id, e)}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    className="action-btn export-btn"
                    onClick={(e) => handleExport(sketch, e)}
                    title="Export"
                  >
                    📥
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => handleDelete(sketch.id, e)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sketch-gallery-footer">
        <p className="storage-info">
          {sketches.length} sketch{sketches.length !== 1 ? 'es' : ''} saved • Unlimited storage with IndexedDB
        </p>
      </div>
    </div>
  );
};

export default SketchGallery;


import type { DrawingPath } from '../components/DrawingCanvas';
import { 
  getAllSketchesFromDB, 
  getSketchFromDB, 
  saveSketchToDB, 
  deleteSketchFromDB,
  getSketchCount,
  getStorageEstimate,
  initDB
} from './indexedDBStorage';

export interface Sketch {
  id: string;
  name: string;
  paths: DrawingPath[];
  thumbnail: string;
  createdAt: number;
  updatedAt: number;
  backgroundColor?: string;
}

// Initialize database on module load
initDB().catch(console.error);

// Migrate from localStorage to IndexedDB if needed
const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const oldSketches = localStorage.getItem('sketches');
    if (oldSketches) {
      const sketches: Sketch[] = JSON.parse(oldSketches);
      console.log(`Migrating ${sketches.length} sketches from localStorage to IndexedDB...`);
      
      for (const sketch of sketches) {
        await saveSketchToDB(sketch);
      }
      
      // Remove from localStorage after successful migration
      localStorage.removeItem('sketches');
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Error migrating sketches:', error);
  }
};

// Run migration on first load
migrateFromLocalStorage();

// Get all sketches (now unlimited!)
export const getAllSketches = async (): Promise<Sketch[]> => {
  try {
    const sketches = await getAllSketchesFromDB<Sketch>();
    // Sort by most recently updated
    return sketches.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Error loading sketches:', error);
    return [];
  }
};

// Get a single sketch by ID
export const getSketch = async (id: string): Promise<Sketch | null> => {
  try {
    return await getSketchFromDB<Sketch>(id);
  } catch (error) {
    console.error('Error loading sketch:', error);
    return null;
  }
};

// Save or update a sketch (no more limits!)
export const saveSketch = async (
  id: string | null,
  name: string,
  paths: DrawingPath[],
  thumbnail: string,
  backgroundColor?: string
): Promise<Sketch> => {
  try {
    const now = Date.now();
    let sketch: Sketch;

    if (id) {
      // Update existing sketch
      const existing = await getSketchFromDB<Sketch>(id);
      if (existing) {
        sketch = {
          ...existing,
          name,
          paths,
          thumbnail,
          backgroundColor,
          updatedAt: now
        };
      } else {
        throw new Error('Sketch not found');
      }
    } else {
      // Create new sketch
      sketch = {
        id: `sketch_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        paths,
        thumbnail,
        backgroundColor,
        createdAt: now,
        updatedAt: now
      };
    }

    await saveSketchToDB(sketch);
    return sketch;
  } catch (error) {
    console.error('Error saving sketch:', error);
    throw new Error('Failed to save sketch');
  }
};

// Delete a sketch
export const deleteSketch = async (id: string): Promise<void> => {
  try {
    await deleteSketchFromDB(id);
  } catch (error) {
    console.error('Error deleting sketch:', error);
    throw new Error('Failed to delete sketch');
  }
};

// Duplicate a sketch
export const duplicateSketch = async (id: string): Promise<Sketch | null> => {
  try {
    const original = await getSketchFromDB<Sketch>(id);
    if (!original) return null;

    const now = Date.now();
    const newSketch: Sketch = {
      ...original,
      id: `sketch_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now
    };

    await saveSketchToDB(newSketch);
    return newSketch;
  } catch (error) {
    console.error('Error duplicating sketch:', error);
    return null;
  }
};

// Export sketch as JSON
export const exportSketchAsJSON = (sketch: Sketch): void => {
  try {
    const json = JSON.stringify(sketch, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sketch.name}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting sketch:', error);
    throw new Error('Failed to export sketch');
  }
};

// Import sketch from JSON
export const importSketchFromJSON = async (file: File): Promise<Sketch> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate the data structure
    if (!data.paths || !Array.isArray(data.paths)) {
      throw new Error('Invalid sketch file format');
    }

    // Create a new sketch with imported data
    const now = Date.now();
    const newSketch: Sketch = {
      id: `sketch_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'Imported Sketch',
      paths: data.paths,
      thumbnail: data.thumbnail || '',
      backgroundColor: data.backgroundColor,
      createdAt: now,
      updatedAt: now
    };

    await saveSketchToDB(newSketch);
    return newSketch;
  } catch (error) {
    console.error('Error importing sketch:', error);
    throw new Error('Failed to import sketch. Please check the file format.');
  }
};

// Get storage info
export const getSketchStorageInfo = async (): Promise<{ 
  count: number; 
  usage: number; 
  quota: number; 
  percentage: number;
  usageFormatted: string;
  quotaFormatted: string;
}> => {
  try {
    const count = await getSketchCount();
    const { usage, quota, percentage } = await getStorageEstimate();
    
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };
    
    return {
      count,
      usage,
      quota,
      percentage,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { 
      count: 0, 
      usage: 0, 
      quota: 0, 
      percentage: 0,
      usageFormatted: '0 B',
      quotaFormatted: '0 B'
    };
  }
};


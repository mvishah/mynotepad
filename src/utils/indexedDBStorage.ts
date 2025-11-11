// IndexedDB wrapper for sketch storage - no limits!

const DB_NAME = 'NoteTakingAppDB';
const DB_VERSION = 1;
const SKETCHES_STORE = 'sketches';

let db: IDBDatabase | null = null;

// Initialize the database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create sketches store if it doesn't exist
      if (!database.objectStoreNames.contains(SKETCHES_STORE)) {
        const objectStore = database.createObjectStore(SKETCHES_STORE, { keyPath: 'id' });
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('name', 'name', { unique: false });
      }
    };
  });
};

// Get all sketches
export const getAllSketchesFromDB = async <T>(): Promise<T[]> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readonly');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(new Error('Failed to get sketches'));
    };
  });
};

// Get a single sketch by ID
export const getSketchFromDB = async <T>(id: string): Promise<T | null> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readonly');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.get(id);

    request.onsuccess = () => {
      resolve(request.result as T || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get sketch'));
    };
  });
};

// Save or update a sketch
export const saveSketchToDB = async <T extends { id: string }>(sketch: T): Promise<void> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.put(sketch);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save sketch'));
    };
  });
};

// Delete a sketch
export const deleteSketchFromDB = async (id: string): Promise<void> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete sketch'));
    };
  });
};

// Get count of sketches
export const getSketchCount = async (): Promise<number> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readonly');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get sketch count'));
    };
  });
};

// Clear all sketches (useful for reset)
export const clearAllSketches = async (): Promise<void> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SKETCHES_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SKETCHES_STORE);
    const request = objectStore.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear sketches'));
    };
  });
};

// Get storage estimate (how much space is being used)
export const getStorageEstimate = async (): Promise<{ usage: number; quota: number; percentage: number }> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    
    return { usage, quota, percentage };
  }
  
  return { usage: 0, quota: 0, percentage: 0 };
};


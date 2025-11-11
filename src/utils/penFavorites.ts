import type { PenStyle } from '../components/DrawingCanvas';

export interface PenFavorite {
  id: string;
  name: string;
  color: string;
  size: number;
  style: PenStyle;
  opacity: number;
  timestamp: number;
}

const STORAGE_KEY = 'pen_favorites';
const MAX_FAVORITES = 10;

export const savePenFavorite = (favorite: Omit<PenFavorite, 'id' | 'timestamp'>): PenFavorite => {
  const favorites = getPenFavorites();
  
  // Check if we've reached the limit
  if (favorites.length >= MAX_FAVORITES) {
    throw new Error(`Maximum of ${MAX_FAVORITES} favorites reached. Please delete one first.`);
  }
  
  const newFavorite: PenFavorite = {
    ...favorite,
    id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  favorites.push(newFavorite);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  
  return newFavorite;
};

export const getPenFavorites = (): PenFavorite[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultFavorites();
    
    const favorites = JSON.parse(stored) as PenFavorite[];
    return favorites.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading pen favorites:', error);
    return getDefaultFavorites();
  }
};

export const deletePenFavorite = (id: string): void => {
  const favorites = getPenFavorites();
  const filtered = favorites.filter(fav => fav.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const updatePenFavorite = (id: string, updates: Partial<Omit<PenFavorite, 'id' | 'timestamp'>>): void => {
  const favorites = getPenFavorites();
  const updated = favorites.map(fav => 
    fav.id === id ? { ...fav, ...updates } : fav
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Default pen favorites for new users
const getDefaultFavorites = (): PenFavorite[] => {
  return [
    {
      id: 'default_1',
      name: '✍️ Black Pen',
      color: '#000000',
      size: 2,
      style: 'writing',
      opacity: 1,
      timestamp: Date.now(),
    },
    {
      id: 'default_2',
      name: '🔵 Blue Fountain',
      color: '#0066ff',
      size: 3,
      style: 'fountain',
      opacity: 0.9,
      timestamp: Date.now() - 1,
    },
    {
      id: 'default_3',
      name: '🟢 Green Highlighter',
      color: '#00ff00',
      size: 8,
      style: 'highlighter',
      opacity: 0.4,
      timestamp: Date.now() - 2,
    },
    {
      id: 'default_4',
      name: '✏️ Gray Pencil',
      color: '#666666',
      size: 2,
      style: 'pencil',
      opacity: 0.8,
      timestamp: Date.now() - 3,
    },
  ];
};


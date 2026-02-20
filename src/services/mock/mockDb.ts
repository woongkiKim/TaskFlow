// src/services/mock/mockDb.ts
// In-memory database engine for mock services
// Supports CRUD operations with simulated async delays

let _store: Record<string, Record<string, unknown>[]> = {};
let _idCounter = 1000;

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms + Math.random() * 80));

const genId = () => `mock_${++_idCounter}`;

/** Initialize or reset a collection with seed data */
export const seedCollection = <T extends { id: string }>(name: string, data: T[]) => {
  _store[name] = data.map(d => ({ ...d }));
};

/** Get all items from a collection, with optional filter */
export const getAll = async <T>(
  name: string,
  filter?: Partial<Record<string, unknown>>
): Promise<T[]> => {
  await delay();
  const col = (_store[name] || []) as T[];
  if (!filter) return [...col];
  return col.filter(item => {
    return Object.entries(filter).every(([key, value]) => {
      const itemVal = (item as Record<string, unknown>)[key];
      // Support array-contains style
      if (Array.isArray(itemVal) && typeof value === 'string') {
        return itemVal.includes(value);
      }
      return itemVal === value;
    });
  });
};

/** Get single item by ID */
export const getById = async <T extends { id: string }>(name: string, id: string): Promise<T | null> => {
  await delay(50);
  const item = (_store[name] || []).find(d => (d as { id: string }).id === id) as T | undefined;
  return item ? { ...item } : null;
};

/** Add a new item to a collection */
export const add = async <T extends { id: string }>(name: string, data: Omit<T, 'id'> & { id?: string }): Promise<T> => {
  await delay();
  if (!_store[name]) _store[name] = [];
  const id = data.id || genId();
  const item = { ...data, id } as unknown as T;
  _store[name].push(item as Record<string, unknown>);
  return { ...item };
};

/** Update an existing item */
 
export const update = async (
  name: string,
  id: string,
  updates: Record<string, any>
): Promise<void> => {
  await delay(80);
  const col = _store[name] || [];
  const idx = col.findIndex(d => (d as { id: string }).id === id);
  if (idx !== -1) {
    col[idx] = { ...col[idx], ...updates };
  }
};

/** Remove an item */
export const remove = async (name: string, id: string): Promise<void> => {
  await delay(80);
  const col = _store[name] || [];
  _store[name] = col.filter(d => (d as { id: string }).id !== id);
};

/** Get count of items matching filter */
export const count = async (name: string, filter?: Partial<Record<string, unknown>>): Promise<number> => {
  const items = await getAll(name, filter);
  return items.length;
};

/** Batch update multiple items */
export const batchUpdate = async <T extends { id: string }>(
  name: string,
  updates: { id: string; data: Partial<T> }[]
): Promise<void> => {
  await delay();
  for (const u of updates) {
    const col = _store[name] || [];
    const idx = col.findIndex(d => (d as { id: string }).id === u.id);
    if (idx !== -1) {
      col[idx] = { ...col[idx], ...u.data };
    }
  }
};

/** Reset entire store (for testing) */
export const resetStore = () => {
  _store = {};
  _idCounter = 1000;
};

/** Check if mock mode is enabled */
export const isMockEnabled = (): boolean => {
  return import.meta.env.VITE_USE_MOCK === 'true';
};

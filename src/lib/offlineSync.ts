import { BusinessDocument } from '../types';

const DB_NAME = 'SahlBizOfflineDB';
const DB_VERSION = 1;
const STORE_PENDING_SALES = 'pending_sales';
const STORE_PENDING_INVENTORY = 'pending_inventory';
const STORE_CACHE = 'app_cache';

export interface PendingInventoryUpdate {
  id: string;
  productId: string;
  variantId?: string;
  deltaQty: number;
  timestamp: number;
  synced?: boolean;
}

export interface PendingSale {
  id: string;
  document: BusinessDocument;
  timestamp: number;
  synced?: boolean;
}

// Initialize IndexedDB database
export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PENDING_SALES)) {
        db.createObjectStore(STORE_PENDING_SALES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PENDING_INVENTORY)) {
        db.createObjectStore(STORE_PENDING_INVENTORY, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue an offline sale into IndexedDB
export async function queueOfflineSale(doc: BusinessDocument): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_PENDING_SALES, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_SALES);

    const pendingItem: PendingSale = {
      id: doc.id,
      document: doc,
      timestamp: Date.now(),
      synced: false,
    };

    store.put(pendingItem);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        requestBackgroundSync();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to queue offline sale in IndexedDB:', err);
  }
}

// Queue an offline inventory adjustment
export async function queueOfflineInventoryUpdate(
  productId: string,
  variantId: string | undefined,
  deltaQty: number
): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_PENDING_INVENTORY, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_INVENTORY);

    const pendingItem: PendingInventoryUpdate = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      variantId,
      deltaQty,
      timestamp: Date.now(),
      synced: false,
    };

    store.put(pendingItem);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        requestBackgroundSync();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to queue offline inventory update:', err);
  }
}

// Fetch all pending unsynced sales
export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_SALES, 'readonly');
      const store = tx.objectStore(STORE_PENDING_SALES);
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result || []).filter(item => !item.synced));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Fetch all pending unsynced inventory updates
export async function getPendingInventoryUpdates(): Promise<PendingInventoryUpdate[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_INVENTORY, 'readonly');
      const store = tx.objectStore(STORE_PENDING_INVENTORY);
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result || []).filter(item => !item.synced));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Clear or mark items as synced
export async function clearSyncedItems(saleIds: string[], invIds: string[]): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction([STORE_PENDING_SALES, STORE_PENDING_INVENTORY], 'readwrite');
    
    const salesStore = tx.objectStore(STORE_PENDING_SALES);
    const invStore = tx.objectStore(STORE_PENDING_INVENTORY);

    saleIds.forEach(id => salesStore.delete(id));
    invIds.forEach(id => invStore.delete(id));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed clearing synced items from IndexedDB:', err);
  }
}

// Sync all pending offline data with the backend server
export async function syncOfflineDataWithBackend(): Promise<{ salesCount: number; invCount: number }> {
  if (!navigator.onLine) {
    return { salesCount: 0, invCount: 0 };
  }

  const pendingSales = await getPendingSales();
  const pendingInv = await getPendingInventoryUpdates();

  if (pendingSales.length === 0 && pendingInv.length === 0) {
    return { salesCount: 0, invCount: 0 };
  }

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sales: pendingSales.map(s => s.document),
        inventoryUpdates: pendingInv,
      }),
    });

    if (response.ok) {
      const saleIds = pendingSales.map(s => s.id);
      const invIds = pendingInv.map(i => i.id);
      await clearSyncedItems(saleIds, invIds);
      console.log(`[Offline Sync] Successfully synced ${saleIds.length} sales & ${invIds.length} inventory updates to server.`);
      return { salesCount: saleIds.length, invCount: invIds.length };
    }
  } catch (err) {
    console.warn('[Offline Sync] Failed contacting server endpoint during sync:', err);
  }

  return { salesCount: 0, invCount: 0 };
}

// Request BackgroundSync API from Service Worker
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-sales');
    } catch (err) {
      console.log('Background Sync not registered:', err);
    }
  }
}

// Register PWA Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Service Worker] Registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Service Worker] Registration failed:', err);
        });
    });
  }
}

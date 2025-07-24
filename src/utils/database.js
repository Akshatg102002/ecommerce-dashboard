// utils/database.js
class DatabaseManager {
  constructor() {
    this.dbName = 'ReportsDB';
    this.version = 1;
    this.db = null;
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores for different report types
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('platform', 'platform', { unique: false });
          ordersStore.createIndex('dateRange', 'dateRange', { unique: false });
        }

        if (!db.objectStoreNames.contains('returns')) {
          const returnsStore = db.createObjectStore('returns', { keyPath: 'id' });
          returnsStore.createIndex('platform', 'platform', { unique: false });
          returnsStore.createIndex('dateRange', 'dateRange', { unique: false });
        }

        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('platform', 'platform', { unique: false });
          inventoryStore.createIndex('dateRange', 'dateRange', { unique: false });
        }

        // Create metadata store for app settings
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async saveRecord(reportType, record) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([reportType], 'readwrite');
      const store = transaction.objectStore(reportType);

      // Add timestamp if not present
      const recordWithTimestamp = {
        ...record,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = store.put(recordWithTimestamp);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRecords(reportType) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([reportType], 'readonly');
      const store = transaction.objectStore(reportType);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordById(reportType, id) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([reportType], 'readonly');
      const store = transaction.objectStore(reportType);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(reportType, id) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([reportType], 'readwrite');
      const store = transaction.objectStore(reportType);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsByPlatform(reportType, platform) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([reportType], 'readonly');
      const store = transaction.objectStore(reportType);
      const index = store.index('platform');
      const request = index.getAll(platform);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData() {
    if (!this.db) await this.initDatabase();

    const stores = ['orders', 'returns', 'inventory', 'metadata'];
    
    return Promise.all(stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }));
  }

  async saveMetadata(key, data) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, data, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key) {
    if (!this.db) await this.initDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.data);
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbManager = new DatabaseManager();

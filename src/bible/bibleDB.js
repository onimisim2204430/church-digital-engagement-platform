import { openDB } from 'idb';

const DB_NAME    = 'AppBibleDB';
const DB_VERSION = 1;

let _db = null;

async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('translations')) {
        db.createObjectStore('translations', { keyPath: 'code' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
      }
    },
  });

  return _db;
}

export const bibleDB = {

  async saveTranslation(code, verses) {
    const db = await getDB();
    await db.put('translations', { code, verses, savedAt: Date.now() });
  },

  async getTranslation(code) {
    const db = await getDB();
    const record = await db.get('translations', code);
    return record ? record.verses : null;
  },

  async hasTranslation(code) {
    const db = await getDB();
    const record = await db.get('translations', code);
    return !!record;
  },

  async deleteTranslation(code) {
    const db = await getDB();
    await db.delete('translations', code);
  },

  async listDownloaded() {
    const db = await getDB();
    const all = await db.getAll('translations');
    return all.map(r => r.code);
  },

  async saveMeta(data) {
    const db = await getDB();
    await db.put('meta', { key: 'bible_meta', data, savedAt: Date.now() });
  },

  async getMeta() {
    const db = await getDB();
    const record = await db.get('meta', 'bible_meta');
    return record ? record.data : null;
  },

  async saveBookmarks(bookmarks) {
    const db = await getDB();
    const tx = db.transaction('bookmarks', 'readwrite');
    await tx.store.clear();
    for (const bm of bookmarks) {
      await tx.store.add(bm);
    }
    await tx.done;
  },

  async getBookmarks() {
    const db = await getDB();
    return db.getAll('bookmarks');
  },

  async clearAll() {
    const db = await getDB();
    await db.clear('translations');
    await db.clear('meta');
    await db.clear('bookmarks');
  },
};

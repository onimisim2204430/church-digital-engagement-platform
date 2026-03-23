import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef,
} from 'react';
import { bibleDB } from './bibleDB';
import { DEFAULT_TRANSLATION } from './constants';

const BibleContext = createContext(null);

function normalizeSearchText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(text) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return [];
  return normalized.split(' ');
}

export function BibleProvider({ children, defaultTranslation = DEFAULT_TRANSLATION }) {
  const [meta, setMeta]                         = useState(null);
  const [translation, setTranslationState]      = useState(defaultTranslation);
  const [isReady, setIsReady]                   = useState(false);
  const [isOnline, setIsOnline]                 = useState(navigator.onLine);
  const [isDownloading, setIsDownloading]       = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError]       = useState(null);
  const [downloadedTranslations, setDownloaded] = useState([]);
  const [availableTranslations, setAvailable]   = useState([]);

  // In-memory cache — synchronous reads, instant
  // Structure: { "KJV": { "1": { "1": { "1": "In the beginning..." } } } }
  const memCache = useRef({});
  const searchCache = useRef({});

  // ── Online/Offline tracking ────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Switch active translation ──────────────────────────────────────────────
  const setTranslation = useCallback(async (code) => {
    if (memCache.current[code]) {
      setTranslationState(code);
      return;
    }

    const cached = await bibleDB.getTranslation(code);
    if (cached && Object.keys(cached).length > 0) {
      memCache.current[code] = cached;
      setDownloaded(prev => [...new Set([...prev, code])]);
      setTranslationState(code);
    }
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        // Step 1: try IndexedDB
        const cached = await bibleDB.getTranslation('KJV');
        if (cached && Object.keys(cached).length > 66) {
          memCache.current['KJV'] = cached;
          const cachedMeta = await bibleDB.getMeta();
          if (cachedMeta) setMeta(cachedMeta);
          setIsReady(true);
          return;
        }

        // Step 2: load from static file
        const res = await fetch('/bibles/kjv.json');
        if (!res.ok) throw new Error('fetch failed: ' + res.status);
        const data = await res.json();

        // data.verses is { "1": { "1": { "1": "text" } } } — use directly
        const verses = data.verses;
        if (!verses || Object.keys(verses).length < 66) {
          throw new Error('verses missing or incomplete');
        }

        // Build meta
        const metaBooks = Object.entries(data.books).map(([num, info]) => ({
          number: Number(num),
          name: info.name,
          abbreviation: info.abbreviation,
          testament: info.testament,
          chapters: info.chapters,
        }));
        const metaObj = {
          KJV: {
            name: 'King James Version',
            language: 'English',
            direction: 'ltr',
            books: metaBooks,
          }
        };

        // Save to IndexedDB (once, forever)
        await bibleDB.saveTranslation('KJV', verses);
        await bibleDB.saveMeta(metaObj);

        memCache.current['KJV'] = verses;
        setMeta(metaObj);
        setIsReady(true);

      } catch (err) {
        console.error('[Bible] init failed:', err);
      }
    }
    init();
  }, []); // eslint-disable-line

  // ── Data access (ALL synchronous reads from memCache) ─────────────────────

  const getVerse = useCallback((book, chapter, verse, tr = translation) => {
    return memCache.current[tr]?.[String(book)]?.[String(chapter)]?.[String(verse)] ?? null;
  }, [translation]);

  const getChapter = useCallback((book, chapter, tr = translation) => {
    const chData = memCache.current[tr]?.[String(book)]?.[String(chapter)];
    if (!chData) return [];
    return Object.entries(chData)
      .map(([v, text]) => ({ verse: Number(v), text }))
      .sort((a, b) => a.verse - b.verse);
  }, [translation]);

  const getBook = useCallback((bookNumber, tr = translation) => {
    return memCache.current[tr]?.[String(bookNumber)] ?? {};
  }, [translation]);

  const getBookInfo = useCallback((bookNumber, tr = translation) => {
    return meta?.[tr]?.books?.find(b => b.number === bookNumber) ?? null;
  }, [meta, translation]);

  const getBooks = useCallback((tr = translation) => {
    return meta?.[tr]?.books ?? [];
  }, [meta, translation]);

  const getChapterCount = useCallback((bookNumber, tr = translation) => {
    return getBookInfo(bookNumber, tr)?.chapters ?? 0;
  }, [getBookInfo]);

  const isDownloaded = useCallback((code) => {
    return downloadedTranslations.includes(code);
  }, [downloadedTranslations]);

  const ensureSearchIndex = useCallback((tr = translation) => {
    if (searchCache.current[tr]) return searchCache.current[tr];

    const cache = memCache.current[tr];
    if (!cache) return null;

    const books = meta?.[tr]?.books ?? [];
    const bookNameByNumber = new Map(books.map(b => [b.number, b.name]));

    const entries = [];
    const tokenMap = new Map();

    for (const [bookNum, chapters] of Object.entries(cache)) {
      const bookNumber = Number(bookNum);
      const bookName = bookNameByNumber.get(bookNumber) ?? `Book ${bookNum}`;

      for (const [chNum, verses] of Object.entries(chapters)) {
        const chapterNumber = Number(chNum);

        for (const [vNum, text] of Object.entries(verses)) {
          const verseNumber = Number(vNum);
          const normalized = normalizeSearchText(text);

          const idx = entries.length;
          entries.push({
            book: bookNumber,
            book_name: bookName,
            chapter: chapterNumber,
            verse: verseNumber,
            text,
            normalized,
          });

          const uniqueTokens = new Set(tokenizeSearchText(text));
          uniqueTokens.forEach(token => {
            if (!tokenMap.has(token)) tokenMap.set(token, []);
            tokenMap.get(token).push(idx);
          });
        }
      }
    }

    const built = { entries, tokenMap };
    searchCache.current[tr] = built;
    return built;
  }, [meta, translation]);

  const searchVersesPaged = useCallback((query, tr = translation, offset = 0, limit = 40) => {
    if (!query || query.trim().length < 2) {
      return { results: [], total: 0, hasMore: false };
    }

    const index = ensureSearchIndex(tr);
    if (!index) {
      return { results: [], total: 0, hasMore: false };
    }

    const normalizedQuery = normalizeSearchText(query);
    const queryTokens = tokenizeSearchText(query);
    if (!normalizedQuery || queryTokens.length === 0) {
      return { results: [], total: 0, hasMore: false };
    }

    const tokenPostingLists = queryTokens
      .map(token => index.tokenMap.get(token) || [])
      .sort((a, b) => a.length - b.length);

    if (tokenPostingLists[0]?.length === 0) {
      return { results: [], total: 0, hasMore: false };
    }

    const candidateSet = new Set(tokenPostingLists[0]);
    for (let i = 1; i < tokenPostingLists.length; i += 1) {
      const nextSet = new Set(tokenPostingLists[i]);
      for (const id of candidateSet) {
        if (!nextSet.has(id)) candidateSet.delete(id);
      }
      if (candidateSet.size === 0) break;
    }

    const matched = [];
    for (const idx of candidateSet) {
      const entry = index.entries[idx];
      const pos = entry.normalized.indexOf(normalizedQuery);
      if (pos === -1 && !queryTokens.every(t => entry.normalized.includes(t))) continue;

      matched.push(entry);
    }

    matched.sort((a, b) => {
      if (a.book !== b.book) return a.book - b.book;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    const total = matched.length;
    const start = Math.max(0, offset);
    const end = Math.min(total, start + Math.max(1, limit));
    const results = matched.slice(start, end).map(entry => ({ ...entry }));

    return {
      results,
      total,
      hasMore: end < total,
    };
  }, [translation, ensureSearchIndex]);

  const searchVerses = useCallback((query, tr = translation, limit = 500) => {
    return searchVersesPaged(query, tr, 0, limit).results;
  }, [translation, searchVersesPaged]);

  useEffect(() => {
    if (!isReady) return;
    // Build current translation search index in idle time for instant first query.
    const timeout = window.setTimeout(() => {
      ensureSearchIndex(translation);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isReady, translation, ensureSearchIndex]);

  const value = {
    // State
    meta, isReady, isOnline, isDownloading, downloadProgress, downloadError,
    translation, availableTranslations, downloadedTranslations,
    // Actions
    setTranslation,
    // Data access — all synchronous, all instant
    getVerse, getChapter, getBook, getBookInfo, getBooks,
    getChapterCount, isDownloaded, searchVerses, searchVersesPaged,
  };

  return (
    <BibleContext.Provider value={value}>
      {children}
    </BibleContext.Provider>
  );
}

export function useBible() {
  const ctx = useContext(BibleContext);
  if (!ctx) throw new Error('useBible() must be used inside <BibleProvider>');
  return ctx;
}

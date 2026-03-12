import { useMemo } from 'react';
import { useBible } from './BibleProvider';

export { useBible };

export function useVerse(book, chapter, verse, translation) {
  const { getVerse, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return null;
    return getVerse(book, chapter, verse, translation);
  }, [book, chapter, verse, translation, isReady, getVerse]);
}

export function useChapter(book, chapter, translation) {
  const { getChapter, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return [];
    return getChapter(book, chapter, translation);
  }, [book, chapter, translation, isReady, getChapter]);
}

export function useBooks(translation) {
  const { getBooks, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return [];
    return getBooks(translation);
  }, [translation, isReady, getBooks]);
}

export function useBookInfo(bookNumber, translation) {
  const { getBookInfo, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return null;
    return getBookInfo(bookNumber, translation);
  }, [bookNumber, translation, isReady, getBookInfo]);
}

export function useVerseSearch(query, translation) {
  const { searchVerses, isReady } = useBible();
  return useMemo(() => {
    if (!isReady || !query) return [];
    return searchVerses(query, translation);
  }, [query, translation, isReady, searchVerses]);
}

export function useBibleReady() {
  return useBible().isReady;
}

export function useTranslation() {
  const { translation, setTranslation } = useBible();
  return [translation, setTranslation];
}

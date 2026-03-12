import { useState, useCallback } from 'react';
import { useBible } from './BibleProvider';
import { useVerseSearch, useBooks } from './useBible';

/**
 * Editor panel for inserting Bible verses into content.
 *
 * Props:
 *   onInsert(verseObj) — called when editor clicks Insert
 *     verseObj = { book, chapter, verse, text, book_name, reference }
 */
export function BibleEditor({ onInsert }) {
  const { isReady, getChapter, getChapterCount, getBookInfo } = useBible();

  const [panel, setPanel]       = useState('browse');  // 'browse' | 'search'
  const [bookNum, setBookNum]    = useState(1);
  const [chapterNum, setChapter] = useState(1);
  const [query, setQuery]        = useState('');

  const books         = useBooks();
  const searchResults = useVerseSearch(query);
  const verses        = getChapter(bookNum, chapterNum);
  const bookInfo      = getBookInfo(bookNum);
  const maxChapters   = getChapterCount(bookNum);

  const handleInsert = useCallback((book, chapter, verse, text, bookName) => {
    if (typeof onInsert === 'function') {
      onInsert({
        book, chapter, verse, text, book_name: bookName,
        reference: `${bookName} ${chapter}:${verse}`,
      });
    }
  }, [onInsert]);

  if (!isReady) {
    return <div className="bible-editor">Loading Bible data...</div>;
  }

  return (
    <div className="bible-editor">

      {/* Tab toggle */}
      <div className="bible-editor-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={panel === 'browse'}
          onClick={() => setPanel('browse')}
          className={panel === 'browse' ? 'active' : ''}
        >
          Browse
        </button>
        <button
          role="tab"
          aria-selected={panel === 'search'}
          onClick={() => setPanel('search')}
          className={panel === 'search' ? 'active' : ''}
        >
          Search
        </button>
      </div>

      {/* Search panel */}
      {panel === 'search' && (
        <div className="bible-editor-search" role="tabpanel">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all verses... (offline, instant)"
            autoFocus
          />
          <div className="bible-editor-results">
            {query.length > 1 && searchResults.length === 0 && (
              <p className="bible-no-results">No results for &ldquo;{query}&rdquo;</p>
            )}
            {searchResults.map(r => (
              <div key={`${r.book}-${r.chapter}-${r.verse}`} className="bible-editor-result">
                <span className="bible-editor-ref">
                  {r.book_name} {r.chapter}:{r.verse}
                </span>
                <p>{r.text}</p>
                <button onClick={() => handleInsert(r.book, r.chapter, r.verse, r.text, r.book_name)}>
                  + Insert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse panel */}
      {panel === 'browse' && (
        <div className="bible-editor-browse" role="tabpanel">
          <div className="bible-editor-selectors">
            <select
              value={bookNum}
              onChange={e => { setBookNum(Number(e.target.value)); setChapter(1); }}
              aria-label="Select book"
            >
              {books.map(b => (
                <option key={b.number} value={b.number}>{b.name}</option>
              ))}
            </select>

            <select
              value={chapterNum}
              onChange={e => setChapter(Number(e.target.value))}
              aria-label="Select chapter"
            >
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Chapter {n}</option>
              ))}
            </select>
          </div>

          <div className="bible-editor-verse-list">
            {verses.map(({ verse, text }) => (
              <div key={verse} className="bible-editor-verse-row">
                <span className="bible-verse-num">{verse}</span>
                <p>{text}</p>
                <button
                  onClick={() => handleInsert(bookNum, chapterNum, verse, text, bookInfo?.name)}
                  aria-label={`Insert ${bookInfo?.name} ${chapterNum}:${verse}`}
                >
                  + Insert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

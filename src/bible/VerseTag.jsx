// VerseTag.jsx
import { useVerse, useBookInfo } from './useBible';

const verseTagStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital@1&family=Cinzel:wght@400&display=swap');

  .vt-tag {
    display: inline;
    font-family: 'Lora', Georgia, serif;
    font-style: italic;
    color: inherit;
  }

  .vt-ref {
    display: inline;
    font-family: 'Cinzel', serif;
    font-size: 0.7em;
    font-style: normal;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: #B8942A;
    margin-left: 0.4em;
  }

  .vt-loading {
    display: inline-block;
    width: 120px;
    height: 1em;
    background: linear-gradient(90deg, #F0EAD8 25%, #FAF7F0 50%, #F0EAD8 75%);
    background-size: 200% 100%;
    animation: vt-shimmer 1.5s infinite;
    border-radius: 3px;
    vertical-align: middle;
  }

  @keyframes vt-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export function VerseTag({ book, chapter, verse, translation, showRef = true, className = '' }) {
  const text     = useVerse(book, chapter, verse, translation);
  const bookInfo = useBookInfo(book, translation);

  if (text === null) {
    return (
      <>
        <style>{verseTagStyles}</style>
        <span className="vt-loading" aria-busy="true" aria-label="Loading verse" />
      </>
    );
  }

  return (
    <>
      <style>{verseTagStyles}</style>
      <span className={`vt-tag ${className}`}>
        &ldquo;{text}&rdquo;
        {showRef && (
          <cite className="vt-ref">
            — {bookInfo?.name ?? `Book ${book}`} {chapter}:{verse}
          </cite>
        )}
      </span>
    </>
  );
}
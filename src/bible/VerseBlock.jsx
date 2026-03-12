// VerseBlock.jsx
import { useBible } from './BibleProvider';

const verseBlockStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=Cinzel:wght@400&display=swap');

  .vb-block {
    position: relative;
    margin: 1.5rem 0;
    padding: 1.5rem 1.75rem 1.5rem 2.25rem;
    background: linear-gradient(135deg, #FAF7F0 0%, #F5F0E4 100%);
    border-left: 3px solid #B8942A;
    border-radius: 0 8px 8px 0;
    box-shadow: 0 2px 16px rgba(26, 39, 68, 0.06);
  }

  .vb-block::before {
    content: '\\201C';
    position: absolute;
    top: -0.5rem;
    left: 1rem;
    font-family: 'Cinzel', serif;
    font-size: 4rem;
    color: #D4AF4A;
    opacity: 0.4;
    line-height: 1;
    pointer-events: none;
  }

  .vb-text {
    font-family: 'Lora', Georgia, serif;
    font-size: 1rem;
    line-height: 1.8;
    color: #1C1C1C;
    font-style: italic;
    margin: 0 0 0.75rem;
  }

  .vb-ref {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.14em;
    color: #B8942A;
    text-transform: uppercase;
    text-align: right;
  }

  .vb-badge {
    font-family: 'Lora', serif;
    font-size: 0.7rem;
    color: #A09070;
    margin-left: 0.4rem;
  }

  .vb-skeleton {
    height: 80px;
    background: linear-gradient(90deg, #F0EAD8 25%, #FAF7F0 50%, #F0EAD8 75%);
    background-size: 200% 100%;
    animation: vb-shimmer 1.5s infinite;
    border-radius: 4px;
    border-left: 3px solid #D4AF4A;
  }

  @keyframes vb-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export function VerseBlock({ book, chapter, verse, translation, className = '' }) {
  const { getVerse, getBookInfo, isReady } = useBible();

  if (!isReady) {
    return (
      <>
        <style>{verseBlockStyles}</style>
        <div className={`vb-skeleton ${className}`} aria-hidden="true" />
      </>
    );
  }

  const text     = getVerse(book, chapter, verse, translation);
  const bookInfo = getBookInfo(book, translation);

  if (!text) return null;

  return (
    <>
      <style>{verseBlockStyles}</style>
      <blockquote className={`vb-block ${className}`}>
        <p className="vb-text">{text}</p>
        <cite className="vb-ref">
          {bookInfo?.name ?? `Book ${book}`} {chapter}:{verse}
          {translation && <span className="vb-badge">({translation})</span>}
        </cite>
      </blockquote>
    </>
  );
}
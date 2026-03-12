import { useState, useRef, useEffect, useCallback } from 'react';
import { useBible } from './BibleProvider';
import { useChapter, useBooks } from './useBible';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  /*
   * KEY LAYOUT PRINCIPLE:
   * .br-root uses height: 100% — it fills whatever container the page gives it.
   * The page (OpenBiblePage) must give the container a defined height:
   *   e.g.  height: calc(100vh - 64px)   <- 64px = your page top nav height
   * This way the bible nav never overlaps the page nav.
   * In reading/presentation mode the bible nav collapses to 0 height,
   * giving even more space to the reading pane.
   */

  .br-root {
    --gold: #B8942A;
    --gold-light: #D4AF4A;
    --gold-pale: #F0E4B8;
    --navy: #1A2744;
    --ink: #1C1C1C;
    --ink-soft: #3D3D3D;
    --ink-muted: #6B6B6B;
    --parchment: #FAF7F0;
    --parchment-warm: #F5F0E4;
    --border: #DDD5C0;
    --shadow: rgba(26,39,68,0.08);
    font-family: 'Lora', Georgia, serif;
    background: var(--parchment);
    color: var(--ink);
    /* Fill parent — parent controls the height */
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Fullscreen mode: take full viewport */
  .br-root.br-fullscreen {
    position: fixed;
    inset: 0;
    height: 100vh !important;
    z-index: 9999;
  }

  /* ─── BIBLE INTERNAL NAV ─── */
  .br-nav {
    flex-shrink: 0;
    background: var(--navy);
    border-bottom: 2px solid var(--gold);
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    height: 56px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.22);
    z-index: 40;
    overflow: hidden;
    transition: height 0.22s ease, opacity 0.22s ease, border 0.22s ease;
  }

  .br-nav.collapsed {
    height: 0;
    opacity: 0;
    border: none;
    pointer-events: none;
  }

  .br-nav-brand {
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gold-light);
    white-space: nowrap;
    margin-right: auto;
  }

  .br-nav-selects {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    max-width: 480px;
  }

  .br-select {
    appearance: none;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    color: #fff;
    font-family: 'Lora', serif;
    font-size: 0.83rem;
    padding: 0.38rem 1.8rem 0.38rem 0.65rem;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B8942A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    transition: border-color 0.2s;
    min-width: 0;
    flex: 1;
  }
  .br-select:focus { outline: none; border-color: var(--gold); }
  .br-select option { background: var(--navy); color: #fff; }
  .br-select-divider { color: rgba(255,255,255,0.25); font-size: 0.85rem; flex-shrink: 0; }

  .br-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
    cursor: pointer;
    transition: all 0.18s;
    flex-shrink: 0;
    padding: 0;
  }
  .br-nav-btn:hover:not(:disabled) { background: rgba(184,148,42,0.2); border-color: var(--gold); color: var(--gold-light); }
  .br-nav-btn:disabled { opacity: 0.28; cursor: not-allowed; }
  .br-nav-btn.mode-active { background: rgba(184,148,42,0.22); border-color: var(--gold); color: var(--gold-light); }
  .br-nav-sep { width: 1px; height: 26px; background: rgba(255,255,255,0.12); flex-shrink: 0; }

  /* ─── BODY LAYOUT ─── */
  .br-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 258px 1fr;
    min-height: 0;
    overflow: hidden;
    transition: grid-template-columns 0.25s ease;
  }

  .br-layout.no-sidebar {
    grid-template-columns: 0 1fr;
  }

  /* ─── SIDEBAR ─── */
  .br-sidebar {
    background: var(--parchment-warm);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    transition: opacity 0.22s ease;
  }
  .br-sidebar::-webkit-scrollbar { width: 4px; }
  .br-sidebar::-webkit-scrollbar-track { background: transparent; }
  .br-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .br-layout.no-sidebar .br-sidebar {
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
  }

  /* Sticky search */
  .br-search-wrap {
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid var(--border);
    background: var(--parchment-warm);
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .br-search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.45rem 0.7rem 0.45rem 1.85rem;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.45rem center;
    font-family: 'Lora', serif;
    font-size: 0.78rem;
    color: var(--ink);
    outline: none;
    transition: border-color 0.2s;
  }
  .br-search-input:focus { border-color: var(--gold); }
  .br-search-input::placeholder { color: var(--ink-muted); font-style: italic; }

  /* Active book chapter pills */
  .br-active-book-header {
    padding: 0.7rem 0.9rem 0;
    background: rgba(184,148,42,0.06);
    border-bottom: 1px solid var(--border);
  }
  .br-active-book-name {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 0.45rem;
  }
  .br-chapter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
    gap: 3px;
    padding: 0 0 0.65rem;
  }
  .br-ch-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 25px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: #fff;
    font-family: 'Crimson Pro', serif;
    font-size: 0.73rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.13s;
  }
  .br-ch-pill:hover { border-color: var(--gold-light); color: var(--navy); background: var(--gold-pale); }
  .br-ch-pill.active { background: var(--navy); border-color: var(--navy); color: #fff; font-weight: 600; }

  /* Book list */
  .br-testament-label {
    font-family: 'Cinzel', serif;
    font-size: 0.57rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--gold);
    padding: 0.9rem 1.1rem 0.35rem;
    display: block;
  }
  .br-book-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.4rem 1.1rem;
    background: transparent;
    border: none;
    text-align: left;
    font-family: 'Lora', serif;
    font-size: 0.8rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.13s;
    border-left: 3px solid transparent;
    box-sizing: border-box;
  }
  .br-book-btn:hover { background: rgba(184,148,42,0.08); color: var(--navy); border-left-color: var(--gold-light); }
  .br-book-btn.active { background: rgba(184,148,42,0.12); color: var(--navy); border-left-color: var(--gold); font-weight: 500; }
  .br-book-abbr { font-size: 0.66rem; color: var(--ink-muted); font-style: italic; flex-shrink: 0; }
  .br-book-btn.active .br-book-abbr { color: var(--gold); }

  /* ─── READING PANE ─── */
  .br-reading {
    overflow-y: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    position: relative;
  }
  .br-reading::-webkit-scrollbar { width: 5px; }
  .br-reading::-webkit-scrollbar-track { background: transparent; }
  .br-reading::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ─── FLOATING BAR (reading + presentation mode) ─── */
  .br-float-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 1.5rem;
    background: rgba(250,247,240,0.94);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 1px 10px rgba(26,39,68,0.06);
  }

  .br-float-ref {
    font-family: 'Cinzel', serif;
    font-size: 0.67rem;
    letter-spacing: 0.14em;
    color: var(--navy);
    font-weight: 500;
  }

  .br-float-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .br-float-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
  }
  .br-float-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--navy); background: var(--gold-pale); }
  .br-float-btn:disabled { opacity: 0.28; cursor: not-allowed; }

  .br-float-exit {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.28rem 0.7rem;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.2);
    background: var(--navy);
    color: var(--gold-light);
    font-family: 'Cinzel', serif;
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .br-float-exit:hover { border-color: var(--gold); color: #fff; }

  /* ─── READING INNER ─── */
  .br-reading-inner {
    padding: 2.5rem 2.5rem 5rem;
    max-width: 700px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* Chapter heading */
  .br-chapter-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1.75rem;
    border-bottom: 1px solid var(--border);
  }
  .br-book-name {
    font-family: 'Cinzel', serif;
    font-size: clamp(1.55rem, 3vw, 2.1rem);
    font-weight: 500;
    color: var(--navy);
    letter-spacing: 0.05em;
    margin: 0 0 0.2rem;
    line-height: 1.2;
  }
  .br-chapter-label {
    font-family: 'Crimson Pro', serif;
    font-size: 0.95rem;
    font-weight: 300;
    color: var(--gold);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin: 0;
  }
  .br-ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    margin-top: 1.1rem;
  }
  .br-ornament-line-l { height: 1px; width: 55px; background: linear-gradient(to right, transparent, var(--gold-light)); }
  .br-ornament-line-r { height: 1px; width: 55px; background: linear-gradient(to left, transparent, var(--gold-light)); }
  .br-ornament-diamond { width: 6px; height: 6px; background: var(--gold); transform: rotate(45deg); flex-shrink: 0; }

  /* Verse count */
  .br-verse-count {
    font-family: 'Crimson Pro', serif;
    font-size: 0.78rem;
    color: var(--ink-muted);
    text-align: center;
    margin-bottom: 1.25rem;
    font-style: italic;
  }

  /* Verses */
  .br-verse {
    display: flex;
    gap: 0.7rem;
    padding: 0.45rem 0.35rem;
    line-height: 1.85;
    border-radius: 4px;
    transition: background 0.13s;
    cursor: default;
    border-left: 3px solid transparent;
  }
  .br-verse:hover { background: rgba(184,148,42,0.05); }
  .br-verse.highlighted { background: rgba(184,148,42,0.1); border-left-color: var(--gold-light); }

  .br-vnum {
    font-family: 'Cinzel', serif;
    font-size: 0.58rem;
    font-weight: 600;
    color: var(--gold);
    min-width: 20px;
    padding-top: 0.52rem;
    text-align: right;
    flex-shrink: 0;
    user-select: none;
  }
  .br-vtext {
    font-family: 'Lora', serif;
    font-size: clamp(1rem, 1.35vw, 1.07rem);
    line-height: 1.88;
    color: var(--ink);
    flex: 1;
  }
  /* Drop cap */
  .br-verse:first-child .br-vtext::first-letter {
    font-family: 'Cinzel', serif;
    font-size: 3.1em;
    font-weight: 500;
    color: var(--navy);
    float: left;
    line-height: 0.75;
    margin: 0.12em 0.1em 0 0;
  }

  /* Bottom nav */
  .br-bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2.75rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--border);
  }
  .br-bottom-btn {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.6rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: #fff;
    font-family: 'Lora', serif;
    font-size: 0.8rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.18s;
  }
  .br-bottom-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--navy); background: var(--parchment-warm); box-shadow: 0 2px 10px var(--shadow); }
  .br-bottom-btn:disabled { opacity: 0.32; cursor: not-allowed; }
  .br-bottom-ref {
    font-family: 'Cinzel', serif;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    color: var(--ink-muted);
    text-align: center;
    flex-shrink: 0;
    padding: 0 0.5rem;
  }

  /* Offline badge */
  .br-offline {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.22rem 0.6rem;
    background: rgba(184,148,42,0.1);
    border: 1px solid var(--gold-light);
    border-radius: 20px;
    font-family: 'Crimson Pro', serif;
    font-size: 0.7rem;
    color: var(--gold);
    flex-shrink: 0;
  }

  /* Loading */
  .br-loading-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
  .br-spinner { width: 34px; height: 34px; border: 2.5px solid #E8DFC8; border-top-color: #B8942A; border-radius: 50%; animation: br-spin 0.9s linear infinite; }
  @keyframes br-spin { to { transform: rotate(360deg); } }
  .br-loading-label { font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 0.2em; color: #6B6B6B; text-transform: uppercase; }

  /* ─── MOBILE ─── */
  @media (max-width: 768px) {
    .br-root { height: auto !important; overflow: visible; }
    .br-layout { grid-template-columns: 1fr !important; overflow: visible; min-height: auto; }
    .br-sidebar { display: none !important; }
    .br-reading { overflow: visible; min-height: auto; }
    .br-reading-inner { padding: 1.75rem 1.1rem 3.5rem; }
    .br-nav-brand { display: none; }
    .br-bottom-btn span { display: none; }
  }
`;

export function BibleReader({ defaultBook = 1, defaultChapter = 1, onModeChange }) {
  const { isReady, isOnline, getChapterCount, getBookInfo } = useBible();

  const [bookNum, setBookNum]       = useState(defaultBook);
  const [chapterNum, setChapterNum] = useState(defaultChapter);
  const [searchQuery, setSearch]    = useState('');
  const [highlighted, setHighlight] = useState(null);
  // 'normal' | 'reading' | 'presentation'
  const [mode, setMode] = useState('normal');

  const readingRef = useRef(null);
  const rootRef    = useRef(null);

  const books    = useBooks();
  const verses   = useChapter(bookNum, chapterNum);
  const maxCh    = getChapterCount(bookNum);
  const bookInfo = getBookInfo(bookNum);

  const oldTestament = books.filter(b => b.testament === 'OT');
  const newTestament = books.filter(b => b.testament === 'NT');
  const filteredBooks = searchQuery
    ? books.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  // Notify parent when mode changes
  useEffect(() => {
    if (onModeChange) onModeChange(mode);
  }, [mode, onModeChange]);

  // Exit presentation if user presses Esc / browser exits fullscreen
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && mode === 'presentation') {
        setMode('normal');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [mode]);

  const enterFullscreen = useCallback(async () => {
    try { await rootRef.current?.requestFullscreen?.(); } catch (_) {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch (_) {}
  }, []);

  async function activateReading() {
    await exitFullscreen();
    setMode('reading');
  }

  async function activatePresentation() {
    setMode('presentation');
    await enterFullscreen();
  }

  async function exitMode() {
    await exitFullscreen();
    setMode('normal');
  }

  function scrollReadingToTop() {
    if (readingRef.current) readingRef.current.scrollTop = 0;
  }

  function selectBook(num) {
    setBookNum(num); setChapterNum(1); setSearch(''); setHighlight(null); scrollReadingToTop();
  }
  function selectChapter(num) {
    setChapterNum(num); setHighlight(null); scrollReadingToTop();
  }
  function goToPrev() {
    if (chapterNum > 1) { selectChapter(chapterNum - 1); }
    else if (bookNum > 1) {
      const p = bookNum - 1;
      setBookNum(p); setChapterNum(getChapterCount(p)); setHighlight(null); scrollReadingToTop();
    }
  }
  function goToNext() {
    if (chapterNum < maxCh) { selectChapter(chapterNum + 1); }
    else if (bookNum < 66) {
      setBookNum(b => b + 1); setChapterNum(1); setHighlight(null); scrollReadingToTop();
    }
  }

  const isFirst = bookNum === 1  && chapterNum === 1;
  const isLast  = bookNum === 66 && chapterNum === maxCh;

  const prevInfo = chapterNum > 1
    ? { name: bookInfo?.name,               ch: chapterNum - 1 }
    : bookNum > 1
      ? { name: getBookInfo(bookNum-1)?.name, ch: getChapterCount(bookNum-1) }
      : null;
  const nextInfo = chapterNum < maxCh
    ? { name: bookInfo?.name,               ch: chapterNum + 1 }
    : bookNum < 66
      ? { name: getBookInfo(bookNum+1)?.name, ch: 1 }
      : null;

  const navHidden     = mode === 'reading' || mode === 'presentation';
  const sidebarHidden = mode === 'reading' || mode === 'presentation';
  const showFloatBar  = navHidden;

  if (!isReady) {
    return (
      <>
        <style>{styles}</style>
        <div className="br-root" ref={rootRef}>
          <div className="br-loading-wrap">
            <div className="br-spinner" />
            <span className="br-loading-label">Opening Scripture</span>
          </div>
        </div>
      </>
    );
  }

  const renderBookList = (list) => list.map(b => (
    <button
      key={b.number}
      className={`br-book-btn ${b.number === bookNum ? 'active' : ''}`}
      onClick={() => selectBook(b.number)}
    >
      <span>{b.name}</span>
      <span className="br-book-abbr">{b.abbreviation}</span>
    </button>
  ));

  return (
    <>
      <style>{styles}</style>
      {/*
        IMPORTANT FOR PAGE INTEGRATION:
        The parent container that wraps <BibleReader> must have:
          height: calc(100vh - NAV_HEIGHT)
          overflow: hidden
        e.g. in OpenBiblePage:
          <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            <BibleReader />
          </div>
        This prevents the bible nav from overlapping the page top nav.
      */}
      <div
        className={`br-root${mode === 'presentation' ? ' br-fullscreen' : ''}`}
        ref={rootRef}
      >

        {/* ── BIBLE INTERNAL NAV ── */}
        <nav className={`br-nav${navHidden ? ' collapsed' : ''}`}>
          <span className="br-nav-brand">Holy Scripture · KJV</span>

          <div className="br-nav-selects">
            <select
              className="br-select"
              value={bookNum}
              onChange={e => { setBookNum(Number(e.target.value)); setChapterNum(1); scrollReadingToTop(); }}
              aria-label="Select book"
            >
              <optgroup label="— Old Testament —">
                {oldTestament.map(b => <option key={b.number} value={b.number}>{b.name}</option>)}
              </optgroup>
              <optgroup label="— New Testament —">
                {newTestament.map(b => <option key={b.number} value={b.number}>{b.name}</option>)}
              </optgroup>
            </select>
            <span className="br-select-divider">·</span>
            <select
              className="br-select"
              style={{ maxWidth: 125 }}
              value={chapterNum}
              onChange={e => selectChapter(Number(e.target.value))}
              aria-label="Select chapter"
            >
              {Array.from({ length: maxCh }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Chapter {n}</option>
              ))}
            </select>
          </div>

          {/* Prev / Next */}
          <button className="br-nav-btn" onClick={goToPrev} disabled={isFirst} title="Previous chapter">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="br-nav-btn" onClick={goToNext} disabled={isLast} title="Next chapter">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="br-nav-sep" />

          {/* Reading mode — clean reading, page nav still visible */}
          <button
            className={`br-nav-btn${mode === 'reading' ? ' mode-active' : ''}`}
            onClick={mode === 'reading' ? exitMode : activateReading}
            title="Reading mode — hide controls"
          >
            {/* Open book icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Presentation mode — fullscreen, everything hidden */}
          <button
            className={`br-nav-btn${mode === 'presentation' ? ' mode-active' : ''}`}
            onClick={mode === 'presentation' ? exitMode : activatePresentation}
            title="Presentation mode — fullscreen"
          >
            {/* Expand icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 21 3 21 3 15" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="3" x2="14" y2="10" strokeLinecap="round"/>
              <line x1="3"  y1="21" x2="10" y2="14" strokeLinecap="round"/>
            </svg>
          </button>

          {!isOnline && (
            <span className="br-offline">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
              </svg>
              Offline
            </span>
          )}
        </nav>

        {/* ── BODY ── */}
        <div className={`br-layout${sidebarHidden ? ' no-sidebar' : ''}`}>

          {/* SIDEBAR */}
          <aside className="br-sidebar">
            <div className="br-search-wrap">
              <input
                className="br-search-input"
                type="search"
                placeholder="Find a book..."
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {filteredBooks ? (
              <div>
                {filteredBooks.map(b => (
                  <button key={b.number} className={`br-book-btn ${b.number === bookNum ? 'active' : ''}`} onClick={() => selectBook(b.number)}>
                    <span>{b.name}</span><span className="br-book-abbr">{b.abbreviation}</span>
                  </button>
                ))}
                {filteredBooks.length === 0 && (
                  <p style={{ padding: '1rem', fontStyle: 'italic', color: '#6B6B6B', fontSize: '0.78rem', textAlign: 'center' }}>No books found</p>
                )}
              </div>
            ) : (
              <>
                <div className="br-active-book-header">
                  <span className="br-active-book-name">{bookInfo?.name}</span>
                  <div className="br-chapter-grid">
                    {Array.from({ length: maxCh }, (_, i) => i + 1).map(n => (
                      <button key={n} className={`br-ch-pill ${n === chapterNum ? 'active' : ''}`} onClick={() => selectChapter(n)}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="br-testament-label">Old Testament</span>
                  {renderBookList(oldTestament)}
                  <span className="br-testament-label" style={{ marginTop: '0.5rem' }}>New Testament</span>
                  {renderBookList(newTestament)}
                  <div style={{ height: '2rem' }} />
                </div>
              </>
            )}
          </aside>

          {/* READING PANE */}
          <main className="br-reading" ref={readingRef}>

            {/* Floating minimal bar in reading/presentation mode */}
            {showFloatBar && (
              <div className="br-float-bar">
                <span className="br-float-ref">{bookInfo?.name} · Chapter {chapterNum}</span>
                <div className="br-float-actions">
                  <button className="br-float-btn" onClick={goToPrev} disabled={isFirst} title="Previous">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="br-float-btn" onClick={goToNext} disabled={isLast} title="Next">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="br-float-exit" onClick={exitMode}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                    Exit
                  </button>
                </div>
              </div>
            )}

            <div className="br-reading-inner">
              <header className="br-chapter-header">
                <h1 className="br-book-name">{bookInfo?.name}</h1>
                <p className="br-chapter-label">Chapter {chapterNum}</p>
                <div className="br-ornament">
                  <div className="br-ornament-line-l" />
                  <div className="br-ornament-diamond" />
                  <div className="br-ornament-line-r" />
                </div>
              </header>

              {verses.length > 0 && <p className="br-verse-count">{verses.length} verses</p>}

              <div>
                {verses.map(({ verse, text }) => (
                  <div
                    key={verse}
                    className={`br-verse ${highlighted === verse ? 'highlighted' : ''}`}
                    onClick={() => setHighlight(v => v === verse ? null : verse)}
                  >
                    <span className="br-vnum">{verse}</span>
                    <span className="br-vtext">{text}</span>
                  </div>
                ))}
                {verses.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#6B6B6B', fontStyle: 'italic', marginTop: '3rem' }}>
                    No verses found for this chapter.
                  </p>
                )}
              </div>

              <nav className="br-bottom-nav">
                <button className="br-bottom-btn" onClick={goToPrev} disabled={isFirst}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {prevInfo && <span>{prevInfo.name} {prevInfo.ch}</span>}
                </button>
                <div className="br-bottom-ref">
                  {bookInfo?.abbreviation} {chapterNum}
                  {highlighted && <span style={{ display: 'block', marginTop: '0.12rem', fontSize: '0.62rem' }}>v.{highlighted}</span>}
                </div>
                <button className="br-bottom-btn" onClick={goToNext} disabled={isLast}>
                  {nextInfo && <span>{nextInfo.name} {nextInfo.ch}</span>}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </nav>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
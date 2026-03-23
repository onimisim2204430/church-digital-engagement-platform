import { useState, useRef, useEffect, useCallback } from 'react';
import { useBible } from './BibleProvider';
import { useChapter, useBooks } from './useBible';

const BOOK_GROUPS = [
  { id: 'law', testament: 'OT', label: 'Law', start: 1, end: 5 },
  { id: 'history-ot', testament: 'OT', label: 'History', start: 6, end: 17 },
  { id: 'poetry', testament: 'OT', label: 'Poetry', start: 18, end: 22 },
  { id: 'prophets', testament: 'OT', label: 'Prophets', start: 23, end: 39 },
  { id: 'gospels', testament: 'NT', label: 'Gospels', start: 40, end: 43 },
  { id: 'history-nt', testament: 'NT', label: 'History', start: 44, end: 44 },
  { id: 'letters', testament: 'NT', label: 'Letters', start: 45, end: 65 },
  { id: 'prophecy', testament: 'NT', label: 'Prophecy', start: 66, end: 66 },
];

const DESKTOP_BREAKPOINT = 768;

function getGroupForBook(bookNumber) {
  return BOOK_GROUPS.find(g => bookNumber >= g.start && bookNumber <= g.end) || null;
}

function getTestamentForBook(bookNumber) {
  return bookNumber <= 39 ? 'OT' : 'NT';
}

function getCompactVerseSnippet(text, maxLength = 120) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength).trim()}...`;
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  /*
   * KEY LAYOUT PRINCIPLE:
   * .br-root uses height: 100% — it fills whatever container the page gives it.
   * The page (OpenBiblePage) must give the container a defined height:
    *   e.g.  height: calc(100vh - NAV_HEIGHT)
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
    overflow: visible;
    transition: height 0.22s ease, opacity 0.22s ease, border 0.22s ease;
  }

  .br-nav.collapsed {
    height: 0;
    opacity: 0;
    border: none;
    pointer-events: none;
    overflow: hidden;
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
    min-width: 0;
  }

  .br-book-picker-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .br-book-picker-trigger {
    width: 100%;
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    color: #fff;
    font-family: 'Lora', serif;
    font-size: 0.83rem;
    padding: 0.38rem 0.65rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .br-book-picker-trigger:hover { border-color: rgba(212,175,74,0.65); }
  .br-book-picker-trigger:focus { outline: none; border-color: var(--gold); }
  .br-book-picker-trigger.open {
    border-color: var(--gold);
    background: rgba(184,148,42,0.18);
  }

  .br-book-picker-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .br-book-picker-chevron {
    color: var(--gold-light);
    font-size: 0.7rem;
    line-height: 1;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .br-book-picker-trigger.open .br-book-picker-chevron {
    transform: rotate(180deg);
  }

  .br-book-picker-panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    width: min(680px, 84vw);
    max-height: min(62vh, 520px);
    overflow-y: auto;
    background: #fff;
    border: 1px solid var(--border);
    border-top: 2px solid var(--gold);
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(26,39,68,0.18);
    z-index: 48;
    padding: 0.7rem;
  }

  .br-book-picker-section + .br-book-picker-section {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }

  .br-book-picker-title {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 0.45rem;
  }

  .br-book-picker-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
    gap: 0.35rem;
  }

  .br-book-picker-option {
    border: 1px solid var(--border);
    background: #fff;
    color: var(--ink);
    font-family: 'Lora', serif;
    font-size: 0.78rem;
    line-height: 1;
    border-radius: 5px;
    min-height: 30px;
    padding: 0.35rem 0.45rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .br-book-picker-option:hover {
    border-color: var(--gold);
    background: var(--parchment-warm);
    color: var(--navy);
  }
  .br-book-picker-option.active {
    border-color: var(--gold);
    background: rgba(184,148,42,0.14);
    color: var(--navy);
    font-weight: 600;
  }

  .br-chapter-picker-wrap {
    position: relative;
    width: 125px;
    flex: 0 0 125px;
  }

  .br-chapter-picker-trigger {
    width: 100%;
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    color: #fff;
    font-family: 'Lora', serif;
    font-size: 0.83rem;
    padding: 0.38rem 0.65rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .br-chapter-picker-trigger:hover { border-color: rgba(212,175,74,0.65); }
  .br-chapter-picker-trigger:focus { outline: none; border-color: var(--gold); }
  .br-chapter-picker-trigger.open {
    border-color: var(--gold);
    background: rgba(184,148,42,0.18);
  }

  .br-chapter-picker-value {
    font-variant-numeric: tabular-nums;
  }

  .br-chapter-picker-panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    width: min(360px, 72vw);
    max-height: min(56vh, 420px);
    overflow-y: auto;
    background: #fff;
    border: 1px solid var(--border);
    border-top: 2px solid var(--gold);
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(26,39,68,0.18);
    z-index: 49;
    padding: 0.6rem;
  }

  .br-chapter-picker-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .br-chapter-picker-option {
    border: 1px solid var(--border);
    background: #fff;
    color: var(--ink);
    font-family: 'Lora', serif;
    font-size: 0.78rem;
    line-height: 1;
    border-radius: 5px;
    min-height: 30px;
    padding: 0.3rem 0.2rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .br-chapter-picker-option:hover {
    border-color: var(--gold);
    background: var(--parchment-warm);
    color: var(--navy);
  }
  .br-chapter-picker-option.active {
    border-color: var(--gold);
    background: rgba(184,148,42,0.14);
    color: var(--navy);
    font-weight: 600;
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
  .br-select-prefix { color: rgba(255,255,255,0.5); font-size: 0.8rem; flex-shrink: 0; }

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
    overscroll-behavior: contain;
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

  .br-recent-wrap {
    padding: 0.55rem 0.9rem 0.65rem;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.35);
  }

  .br-meta-label {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 0.54rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 0.45rem;
  }

  .br-recent-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .br-recent-chip {
    border: 1px solid var(--border);
    background: #fff;
    color: var(--ink-soft);
    border-radius: 999px;
    font-family: 'Crimson Pro', serif;
    font-size: 0.72rem;
    line-height: 1;
    padding: 0.34rem 0.62rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .br-recent-chip:hover { border-color: var(--gold-light); color: var(--navy); }
  .br-recent-chip.active { background: var(--navy); border-color: var(--navy); color: #fff; }

  .br-testament-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
    padding: 0.62rem 0.9rem;
    border-bottom: 1px solid var(--border);
    background: var(--parchment-warm);
  }

  .br-testament-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 6px;
    height: 30px;
    font-family: 'Cinzel', serif;
    font-size: 0.56rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
  }
  .br-testament-tab:hover { border-color: var(--gold-light); color: var(--navy); }
  .br-testament-tab.active { border-color: var(--navy); background: var(--navy); color: #fff; }

  .br-group-wrap {
    padding: 0.35rem 0 1rem;
  }

  .br-group-block {
    border-bottom: 1px solid rgba(221,213,192,0.7);
  }

  .br-group-toggle {
    width: 100%;
    border: none;
    background: transparent;
    padding: 0.58rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-muted);
    cursor: pointer;
  }

  .br-group-toggle:hover {
    color: var(--navy);
    background: rgba(184,148,42,0.06);
  }

  .br-group-chevron {
    font-size: 0.62rem;
    color: var(--gold);
    transition: transform 0.15s;
    transform: rotate(0deg);
  }

  .br-group-chevron.expanded {
    transform: rotate(180deg);
  }

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
    overscroll-behavior: contain;
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
    .br-root { height: 100% !important; overflow: hidden; }
    .br-nav {
      position: sticky;
      top: 0;
      z-index: 50;
      height: 52px;
      padding: 0 0.65rem;
      gap: 0.45rem;
    }
    .br-layout { grid-template-columns: 1fr !important; overflow: hidden; min-height: 0; }
    .br-sidebar { display: none !important; }
    .br-reading { overflow-y: auto; min-height: 0; -webkit-overflow-scrolling: touch; }
    .br-reading-inner { padding: 1.75rem 1.1rem 3.5rem; }
    .br-nav-brand { display: none; }
    .br-nav-selects { max-width: none; gap: 0.35rem; }
    .br-book-picker-wrap { display: block; }
    .br-book-picker-panel {
      position: fixed;
      top: 56px;
      left: 0.6rem;
      right: 0.6rem;
      width: auto;
      max-height: min(72vh, 560px);
      border-radius: 10px;
      padding: 0.65rem;
      z-index: 62;
    }
    .br-book-picker-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.3rem;
    }
    .br-book-picker-option {
      min-height: 32px;
      padding: 0.35rem 0.2rem;
      text-align: center;
      font-size: 0.76rem;
    }
    .br-chapter-picker-wrap { width: 96px; flex-basis: 96px; }
    .br-chapter-picker-panel {
      position: fixed;
      top: 56px;
      left: 0.6rem;
      right: 0.6rem;
      width: auto;
      max-height: min(68vh, 520px);
      z-index: 63;
    }
    .br-chapter-picker-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.3rem;
    }
    .br-chapter-picker-option {
      min-height: 32px;
      font-size: 0.76rem;
    }
    .br-select { font-size: 0.78rem; }
    .br-select-prefix { font-size: 0.7rem; }
    .br-bottom-btn span { display: none; }
  }
`;

export function BibleReader({ defaultBook = 1, defaultChapter = 1, onModeChange }) {
  const { isReady, isOnline, getChapterCount, getBookInfo, searchVersesPaged } = useBible();

  const [bookNum, setBookNum]       = useState(defaultBook);
  const [chapterNum, setChapterNum] = useState(defaultChapter);
  const [searchQuery, setSearch]    = useState('');
  const [highlighted, setHighlight] = useState(null);
  const [activeTestament, setActiveTestament] = useState(getTestamentForBook(defaultBook));
  const [expandedGroups, setExpandedGroups] = useState({
    law: true,
    'history-ot': false,
    poetry: false,
    prophets: false,
    gospels: false,
    'history-nt': false,
    letters: false,
    prophecy: false,
  });
  const [recentBooks, setRecentBooks] = useState([]);
  const [sidebarMode, setSidebarMode] = useState('books');
  const [verseSearchQuery, setVerseSearchQuery] = useState('');
  const [debouncedVerseSearchQuery, setDebouncedVerseSearchQuery] = useState('');
  const [verseSearchPage, setVerseSearchPage] = useState(1);
  const [verseSearchItems, setVerseSearchItems] = useState([]);
  const [verseSearchTotal, setVerseSearchTotal] = useState(0);
  const [verseSearchHasMore, setVerseSearchHasMore] = useState(false);
  // 'normal' | 'reading' | 'presentation'
  const [mode, setMode] = useState('normal');
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [isChapterPickerOpen, setIsChapterPickerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > DESKTOP_BREAKPOINT;
  });

  const readingRef = useRef(null);
  const rootRef    = useRef(null);
  const bookPickerRef = useRef(null);
  const chapterPickerRef = useRef(null);
  const verseSearchLoadMoreRef = useRef(null);
  const verseSearchAutoLoadLockRef = useRef(false);

  const books    = useBooks();
  const verses   = useChapter(bookNum, chapterNum);
  const maxCh    = getChapterCount(bookNum);
  const bookInfo = getBookInfo(bookNum);

  const oldTestamentOrdered = books
    .filter(b => b.testament === 'OT')
    .sort((a, b) => a.number - b.number);
  const newTestamentOrdered = books
    .filter(b => b.testament === 'NT')
    .sort((a, b) => a.number - b.number);
  const filteredBooks = searchQuery
    ? books.filter(b => (
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    : null;
  const activeGroups = BOOK_GROUPS.filter(g => g.testament === activeTestament);
  const VERSE_PAGE_SIZE = 100;

  useEffect(() => {
    const group = getGroupForBook(bookNum);
    if (!group) return;

    setActiveTestament(group.testament);
    setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
    setRecentBooks(prev => {
      const next = [bookNum, ...prev.filter(n => n !== bookNum)];
      return next.slice(0, 5);
    });
  }, [bookNum]);

  useEffect(() => {
    if (!isBookPickerOpen && !isChapterPickerOpen) return;

    function handleOutsideClick(event) {
      const clickedBookPicker = bookPickerRef.current?.contains(event.target);
      const clickedChapterPicker = chapterPickerRef.current?.contains(event.target);
      if (!clickedBookPicker && !clickedChapterPicker) {
        setIsBookPickerOpen(false);
        setIsChapterPickerOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsBookPickerOpen(false);
        setIsChapterPickerOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isBookPickerOpen, isChapterPickerOpen]);

  useEffect(() => {
    function updateViewportMode() {
      setIsDesktop(window.innerWidth > DESKTOP_BREAKPOINT);
    }

    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedVerseSearchQuery(verseSearchQuery.trim());
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [verseSearchQuery]);

  useEffect(() => {
    setVerseSearchPage(1);
    setVerseSearchItems([]);
    verseSearchAutoLoadLockRef.current = false;
  }, [debouncedVerseSearchQuery]);

  useEffect(() => {
    if (debouncedVerseSearchQuery.length < 2) {
      setVerseSearchItems([]);
      setVerseSearchTotal(0);
      setVerseSearchHasMore(false);
      verseSearchAutoLoadLockRef.current = false;
      return;
    }

    const offset = (verseSearchPage - 1) * VERSE_PAGE_SIZE;
    const { results, total, hasMore } = searchVersesPaged(
      debouncedVerseSearchQuery,
      undefined,
      offset,
      VERSE_PAGE_SIZE,
    );

    setVerseSearchItems(prev => (verseSearchPage === 1 ? results : [...prev, ...results]));
    setVerseSearchTotal(total);
    setVerseSearchHasMore(hasMore);
    verseSearchAutoLoadLockRef.current = false;
  }, [debouncedVerseSearchQuery, verseSearchPage, searchVersesPaged]);

  useEffect(() => {
    if (sidebarMode !== 'verses') return;
    if (debouncedVerseSearchQuery.length < 2) return;
    if (!verseSearchHasMore) return;

    const sentinel = verseSearchLoadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (verseSearchAutoLoadLockRef.current) return;

        verseSearchAutoLoadLockRef.current = true;
        setVerseSearchPage(p => p + 1);
      },
      { root: null, rootMargin: '180px 0px', threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sidebarMode, debouncedVerseSearchQuery, verseSearchHasMore]);

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
    const group = getGroupForBook(num);
    if (group) {
      setActiveTestament(group.testament);
      setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
    }
    setIsBookPickerOpen(false);
    setIsChapterPickerOpen(false);
    setBookNum(num); setChapterNum(1); setSearch(''); setHighlight(null); scrollReadingToTop();
  }

  function selectSearchVerse(result) {
    const group = getGroupForBook(result.book);
    if (group) {
      setActiveTestament(group.testament);
      setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
    }
    setBookNum(result.book);
    setChapterNum(result.chapter);
    setHighlight(result.verse);
    scrollReadingToTop();
  }
  function selectChapter(num) {
    setIsChapterPickerOpen(false);
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

  const navHidden     = !isDesktop && (mode === 'reading' || mode === 'presentation');
  const sidebarHidden = !isDesktop && (mode === 'reading' || mode === 'presentation');
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

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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
            <div className="br-book-picker-wrap" ref={bookPickerRef}>
              <button
                type="button"
                className={`br-book-picker-trigger${isBookPickerOpen ? ' open' : ''}`}
                onClick={() => {
                  setIsBookPickerOpen(prev => !prev);
                  setIsChapterPickerOpen(false);
                }}
                aria-haspopup="listbox"
                aria-expanded={isBookPickerOpen}
                aria-label="Select book"
              >
                <span className="br-book-picker-value">{bookInfo?.abbreviation || 'Book'}</span>
                <span className="br-book-picker-chevron">▼</span>
              </button>

              {isBookPickerOpen && (
                <div className="br-book-picker-panel" role="dialog" aria-label="Bible books">
                  <section className="br-book-picker-section">
                    <span className="br-book-picker-title">Old Testament</span>
                    <div className="br-book-picker-columns">
                      {oldTestamentOrdered.map(b => (
                        <button
                          type="button"
                          key={b.number}
                          className={`br-book-picker-option ${b.number === bookNum ? 'active' : ''}`}
                          onClick={() => selectBook(b.number)}
                        >
                          {b.abbreviation}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="br-book-picker-section">
                    <span className="br-book-picker-title">New Testament</span>
                    <div className="br-book-picker-columns">
                      {newTestamentOrdered.map(b => (
                        <button
                          type="button"
                          key={b.number}
                          className={`br-book-picker-option ${b.number === bookNum ? 'active' : ''}`}
                          onClick={() => selectBook(b.number)}
                        >
                          {b.abbreviation}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <span className="br-select-divider">·</span>
            <span className="br-select-prefix">Chapter</span>
            <div className="br-chapter-picker-wrap" ref={chapterPickerRef}>
              <button
                type="button"
                className={`br-chapter-picker-trigger${isChapterPickerOpen ? ' open' : ''}`}
                onClick={() => {
                  setIsChapterPickerOpen(prev => !prev);
                  setIsBookPickerOpen(false);
                }}
                aria-haspopup="listbox"
                aria-expanded={isChapterPickerOpen}
                aria-label="Select chapter"
              >
                <span className="br-chapter-picker-value">{chapterNum}</span>
                <span className="br-book-picker-chevron">▼</span>
              </button>

              {isChapterPickerOpen && (
                <div className="br-chapter-picker-panel" role="dialog" aria-label="Chapters">
                  <div className="br-chapter-picker-grid">
                    {Array.from({ length: maxCh }, (_, i) => i + 1).map(n => (
                      <button
                        type="button"
                        key={n}
                        className={`br-chapter-picker-option ${n === chapterNum ? 'active' : ''}`}
                        onClick={() => selectChapter(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <div className="br-testament-tabs" style={{ marginBottom: '0.55rem' }}>
                <button
                  className={`br-testament-tab ${sidebarMode === 'books' ? 'active' : ''}`}
                  onClick={() => setSidebarMode('books')}
                >
                  Browse
                </button>
                <button
                  className={`br-testament-tab ${sidebarMode === 'verses' ? 'active' : ''}`}
                  onClick={() => setSidebarMode('verses')}
                >
                  Verse Search
                </button>
              </div>

              {sidebarMode === 'books' ? (
                <input
                  className="br-search-input"
                  type="search"
                  placeholder="Find a book or abbreviation..."
                  value={searchQuery}
                  onChange={e => setSearch(e.target.value)}
                />
              ) : (
                <input
                  className="br-search-input"
                  type="search"
                  placeholder="Search words, phrases, or sentences..."
                  value={verseSearchQuery}
                  onChange={e => setVerseSearchQuery(e.target.value)}
                />
              )}
            </div>

            {sidebarMode === 'verses' ? (
              <div>
                {debouncedVerseSearchQuery.length < 2 ? (
                  <p style={{ padding: '0.9rem', fontSize: '0.76rem', color: '#6B6B6B', textAlign: 'center' }}>
                    Type at least 2 characters to search the entire Bible instantly.
                  </p>
                ) : (
                  <>
                    <div style={{ padding: '0.55rem 0.9rem', borderBottom: '1px solid #DDD5C0', fontSize: '0.72rem', color: '#6B6B6B' }}>
                      {verseSearchTotal} matches for &ldquo;{debouncedVerseSearchQuery}&rdquo;
                    </div>

                    <div>
                      {verseSearchItems.map(result => (
                        <button
                          key={`${result.book}-${result.chapter}-${result.verse}`}
                          className="br-book-btn"
                          onClick={() => selectSearchVerse(result)}
                          style={{ display: 'block', width: '100%', textAlign: 'left' }}
                        >
                          <span style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.04em', color: '#6B6B6B', marginBottom: '0.2rem' }}>
                            {result.book_name} {result.chapter}:{result.verse}
                          </span>
                          <span style={{ fontSize: '0.73rem', lineHeight: '1.35', color: '#1C1C1C' }}>
                            {getCompactVerseSnippet(result.text)}
                          </span>
                        </button>
                      ))}

                      {verseSearchItems.length === 0 && (
                        <p style={{ padding: '1rem', fontStyle: 'italic', color: '#6B6B6B', fontSize: '0.78rem', textAlign: 'center' }}>
                          No verses found.
                        </p>
                      )}

                      {verseSearchHasMore && (
                        <div
                          ref={verseSearchLoadMoreRef}
                          style={{ padding: '0.9rem', textAlign: 'center', fontSize: '0.72rem', color: '#6B6B6B' }}
                        >
                          Scroll to load more...
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : filteredBooks ? (
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

                {recentBooks.length > 0 && (
                  <div className="br-recent-wrap">
                    <span className="br-meta-label">Recent Books</span>
                    <div className="br-recent-list">
                      {recentBooks.map(number => {
                        const recentBook = getBookInfo(number);
                        if (!recentBook) return null;
                        return (
                          <button
                            key={number}
                            className={`br-recent-chip ${number === bookNum ? 'active' : ''}`}
                            onClick={() => selectBook(number)}
                          >
                            {recentBook.abbreviation}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="br-testament-tabs">
                  <button
                    className={`br-testament-tab ${activeTestament === 'OT' ? 'active' : ''}`}
                    onClick={() => setActiveTestament('OT')}
                  >
                    Old Testament
                  </button>
                  <button
                    className={`br-testament-tab ${activeTestament === 'NT' ? 'active' : ''}`}
                    onClick={() => setActiveTestament('NT')}
                  >
                    New Testament
                  </button>
                </div>

                <div className="br-group-wrap">
                  {activeGroups.map(group => {
                    const booksInGroup = books.filter(b => b.number >= group.start && b.number <= group.end);
                    const isExpanded = Boolean(expandedGroups[group.id]);

                    return (
                      <section key={group.id} className="br-group-block">
                        <button className="br-group-toggle" onClick={() => toggleGroup(group.id)}>
                          <span>{group.label}</span>
                          <span className={`br-group-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                        </button>
                        {isExpanded && renderBookList(booksInGroup)}
                      </section>
                    );
                  })}

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
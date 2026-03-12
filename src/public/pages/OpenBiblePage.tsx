import React, { useState } from 'react';
import { BibleReader, BibleLoader, useBible } from '../../bible';
import SharedNavigation from '../shared/SharedNavigation';
import Footer from '../sections/Footer';

const pageStyles = `
  .obp-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #FAF7F0;  }

  .obp-root.with-topnav {    padding-top: 84px; /* Account for fixed topnav */
  }

  .obp-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    background: #FAF7F0;
    min-height: calc(100vh - 64px);
  }

  .obp-reader {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Remove footer padding when Bible is open for immersive reading */
  .obp-reader + footer {
    display: none;
  }
`;

const OpenBiblePage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [bibleMode, setBibleMode] = useState<'normal' | 'reading' | 'presentation'>('normal');
  const { isReady } = useBible();

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleModeChange = React.useCallback((mode: 'normal' | 'reading' | 'presentation') => {
    setBibleMode(mode);
  }, []);

  return (
    <>
      <style>{pageStyles}</style>
      <div className={`obp-root${bibleMode === 'normal' ? ' with-topnav' : ''}`}>
        {bibleMode === 'normal' && (
          <SharedNavigation isScrolled={isScrolled} currentPage="bible" fullWidth={true} />
        )}

        {!isReady ? (
          <div className="obp-loading">
            <BibleLoader />
          </div>
        ) : (
          <div className="obp-reader">
            <BibleReader defaultBook={1} defaultChapter={1} onModeChange={handleModeChange} />
          </div>
        )}
      </div>
    </>
  );
};

export default OpenBiblePage;
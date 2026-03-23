import React, { useState } from 'react';
import { BibleReader, BibleLoader, useBible } from '../../bible';
import SharedNavigation from '../shared/SharedNavigation';

const pageStyles = `
  /*
   * Bible page container contract:
   * - In normal mode, public top nav is fixed at top.
   * - Bible reader gets the remaining viewport height and owns scrolling.
   * - In reading/presentation modes, reader uses full viewport height.
   */
  .obp-root {
    --obp-topnav-height: 80px;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: #FAF7F0;
  }

  .obp-root.with-topnav {
    padding-top: 0;
  }

  .obp-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    background: #FAF7F0;
    min-height: calc(100vh - var(--obp-topnav-height));
  }

  .obp-root.with-topnav .obp-loading {
    margin-top: var(--obp-topnav-height);
    height: calc(100vh - var(--obp-topnav-height));
    min-height: 0;
  }

  .obp-reader {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .obp-root.with-topnav .obp-reader {
    margin-top: var(--obp-topnav-height);
    height: calc(100vh - var(--obp-topnav-height));
  }

  .obp-root.mode-reading .obp-reader,
  .obp-root.mode-presentation .obp-reader {
    margin-top: 0;
    height: 100vh;
  }

  .obp-root.mode-reading .obp-loading,
  .obp-root.mode-presentation .obp-loading {
    margin-top: 0;
    height: 100vh;
    min-height: 0;
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
      <div className={`obp-root mode-${bibleMode}${bibleMode === 'normal' ? ' with-topnav' : ''}`}>
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
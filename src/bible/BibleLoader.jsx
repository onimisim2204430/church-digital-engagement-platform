const loaderStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Crimson+Pro:ital,wght@1,300&display=swap');

  @keyframes bible-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes bible-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .bl-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 4rem 2rem;
  }

  .bl-ring {
    position: relative;
    width: 52px;
    height: 52px;
  }

  .bl-ring-outer {
    width: 52px;
    height: 52px;
    border: 2px solid #E8DFC8;
    border-top-color: #B8942A;
    border-radius: 50%;
    animation: bible-spin 1s linear infinite;
    position: absolute;
    inset: 0;
  }

  .bl-ring-inner {
    width: 36px;
    height: 36px;
    border: 1px solid #E8DFC8;
    border-bottom-color: #D4AF4A;
    border-radius: 50%;
    animation: bible-spin 0.7s linear infinite reverse;
    position: absolute;
    top: 8px;
    left: 8px;
  }

  .bl-label {
    font-family: 'Cinzel', serif;
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #6B6B6B;
    animation: bible-pulse 2s ease-in-out infinite;
  }

  .bl-verse {
    font-family: 'Crimson Pro', serif;
    font-size: 0.9rem;
    font-style: italic;
    color: #A09070;
    font-weight: 300;
    text-align: center;
    max-width: 280px;
    line-height: 1.6;
  }
`;

export function BibleLoader() {
  return (
    <>
      <style>{loaderStyles}</style>
      <div className="bl-wrap" role="status" aria-live="polite" aria-label="Opening Bible">
        <div className="bl-ring">
          <div className="bl-ring-outer" />
          <div className="bl-ring-inner" />
        </div>
        <span className="bl-label">Opening Scripture</span>
        <p className="bl-verse">
          "Thy word is a lamp unto my feet, and a light unto my path."
          <br />— Psalm 119:105
        </p>
      </div>
    </>
  );
}
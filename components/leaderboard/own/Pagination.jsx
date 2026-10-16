import { useLayoutEffect, useRef } from 'react';

function pageList(np, pn) {
  const a = [];
  if (np <= 6) {
    for (let i = 1; i <= np; i++) a.push(i);
  } else if (pn <= 3) return [1, 2, 3, 4, 0, np];
  else if (pn >= np - 2) return [1, 0, np - 3, np - 2, np - 1, np];
  else return [1, 0, pn - 1, pn, pn + 1, 0, np];
  return a;
}

function Arrow({ dir, disabled, d, onGo }) {
  return (
    <button
      type="button"
      className="pb ar"
      disabled={disabled}
      aria-label={(dir === 'p' ? 'Previous' : 'Next') + ' page'}
      onClick={() => onGo(dir)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={d} />
      </svg>
    </button>
  );
}

export default function Pagination({ pageCount, page, onGo }) {
  const boxRef = useRef(null);
  const pillRef = useRef(null);
  const wasHidden = useRef(true);
  const hidden = pageCount < 2;

  // Slide the highlight "pill" behind the active page button.
  const placePill = () => {
    const box = boxRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;
    const a = box.querySelector('#pgb .pb.on');
    if (!a) {
      pill.style.opacity = 0;
      return;
    }
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + 'px';
    pill.style.height = a.offsetHeight + 'px';
    pill.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`;
  };

  useLayoutEffect(() => {
    if (hidden) {
      wasHidden.current = true;
      return;
    }
    const pill = pillRef.current;
    if (wasHidden.current) {
      pill.style.transition = 'none';
      placePill();
      void pill.offsetWidth;
      pill.style.transition = '';
      wasHidden.current = false;
    } else placePill();
  });

  useLayoutEffect(() => {
    addEventListener('resize', placePill);
    return () => removeEventListener('resize', placePill);
  }, []);

  return (
    <div className="pgw">
      <div className="pgn" id="pgn" hidden={hidden} ref={boxRef}>
        <i className="pill" id="pill" ref={pillRef} />
        <span id="pgb">
          {!hidden && (
            <>
              <Arrow dir="p" disabled={page === 1} d="M15 5l-7 7 7 7" onGo={onGo} />
              {pageList(pageCount, page).map((n, i) =>
                n ? (
                  <button
                    key={'p' + n}
                    type="button"
                    className={'pb' + (n === page ? ' on' : '')}
                    aria-label={'Page ' + n}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => onGo(n)}
                  >
                    {n}
                  </button>
                ) : (
                  <span key={'d' + i} className="pb dots" aria-hidden="true">
                    {'\u00b7\u00b7\u00b7'}
                  </span>
                )
              )}
              <Arrow dir="n" disabled={page === pageCount} d="M9 5l7 7-7 7" onGo={onGo} />
            </>
          )}
        </span>
      </div>
    </div>
  );
}

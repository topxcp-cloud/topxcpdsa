import { useEffect, useRef, useState } from 'react';

// Floating "You're #N" pill, shown whenever your own row is scrolled out of view.
export default function MeBar({ rank, streak, onJump, deps }) {
  const [on, setOn] = useState(false);
  const has = rank > 0;
  const tick = useRef(0);

  useEffect(() => {
    const check = () => {
      if (!has) return setOn(false);
      const t = document.querySelector('#pod .pc.me, #tb tr.me');
      let vis = false;
      if (t) {
        const r = t.getBoundingClientRect();
        const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stk')) || 0;
        vis = r.bottom > top + 10 && r.top < innerHeight - 10;
      }
      setOn(!vis);
    };
    const onScroll = () => {
      if (tick.current) return;
      tick.current = 1;
      requestAnimationFrame(() => {
        tick.current = 0;
        check();
      });
    };
    check();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', check);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [has, ...deps]);

  return (
    <div className={'mebar' + (on ? ' on' : '')} id="me" data-has={has ? '1' : ''} role="status">
      <span id="met">
        {has && (
          <>
            You{'\u2019'}re <b>#{rank}</b> {'\u00b7'} {streak} day streak
          </>
        )}
      </span>
      <button type="button" id="mej" onClick={onJump}>
        Jump to me
      </button>
    </div>
  );
}

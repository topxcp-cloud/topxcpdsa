import { useEffect, useRef, useState } from 'react';

// Flips to `visible` once, the first time the element scrolls into view.
export default function useReveal(instant = false) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(instant);

  useEffect(() => {
    if (visible) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return [ref, visible];
}

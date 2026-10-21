'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './topx-preloader.css';

const VIDEO_PLAYBACK_RATE = 0.85;
const FADE_DURATION = 2150;

export default function TopxPreloader() {
  const [active, setActive] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [cycle, setCycle] = useState(0);
  const videoRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const clearTransitionTimeout = useCallback(() => {
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    if (!active || revealing) return;

    clearTransitionTimeout();
    if (videoRef.current) videoRef.current.pause();
    setRevealing(true);
    transitionTimeoutRef.current = window.setTimeout(() => {
      setActive(false);
      transitionTimeoutRef.current = null;
    }, FADE_DURATION);
  }, [active, clearTransitionTimeout, revealing]);

  useEffect(() => {
    window.replayTopxIntro = () => {
      clearTransitionTimeout();
      setRevealing(false);
      setCycle((current) => current + 1);
      setActive(true);
    };

    return () => {
      clearTransitionTimeout();
      delete window.replayTopxIntro;
    };
  }, [clearTransitionTimeout]);

  useEffect(() => {
    if (!active) return undefined;

    const bodyStyle = document.body.style;
    const originalOverflow = bodyStyle.overflow;
    const originalPaddingRight = bodyStyle.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      const currentPaddingRight = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      bodyStyle.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }
    bodyStyle.overflow = 'hidden';

    const restoreBodyStyles = () => {
      bodyStyle.overflow = originalOverflow;
      bodyStyle.paddingRight = originalPaddingRight;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(false);
      return restoreBodyStyles;
    }

    return () => {
      clearTransitionTimeout();
      restoreBodyStyles();
    };
  }, [active, clearTransitionTimeout, cycle]);

  useEffect(() => {
    if (!active) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.code === 'Space') {
        event.preventDefault();
        dismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, dismiss]);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const videoSource = window.matchMedia('(max-width: 700px)').matches
      ? '/videos/topx-intro-mobile.mp4'
      : '/videos/topx-intro.mp4';

    video.playbackRate = VIDEO_PLAYBACK_RATE;
    video.src = videoSource;
    video.load();
  }, [active, cycle]);

  if (!active) return null;

  const handleLoadedMetadata = (event) => {
    event.currentTarget.playbackRate = VIDEO_PLAYBACK_RATE;
  };

  const handleVideoError = (event) => {
    console.error('Unable to load the TOP-X preloader video.', event.currentTarget.error);
    clearTransitionTimeout();
    setActive(false);
  };

  return (
    <div
      id="topx-preloader-root"
      className={`topx-preloader${revealing ? ' is-revealing' : ''}`}
      onClick={dismiss}
      aria-label="TOP-X intro; click or press Escape to skip"
    >
      <video
        key={cycle}
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="none"
        className="topx-intro-video"
        aria-label="TOP-X intro: CODE. COMPETE. CONQUER."
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={dismiss}
        onError={handleVideoError}
      />
    </div>
  );
}

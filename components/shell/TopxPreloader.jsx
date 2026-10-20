'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import './topx-preloader.css';

// Exact Vertex Shader for full-screen quad
const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = (position + 1.0) * 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Lightweight polar-noise portal dissolve with an orange edge.
const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_progress;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_noiseStrength;
  uniform float u_edgeSoftness;
  uniform vec3 u_maskColor;
  uniform vec3 u_glowColor;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 blend = fract(p);
    blend = blend * blend * (3.0 - 2.0 * blend);
    float lower = mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x);
    float upper = mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), blend.x);
    return mix(lower, upper, blend.y);
  }

  void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 centered = vUv * vec2(aspect, 1.0) - vec2(aspect * 0.5, 0.5);
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);
    vec2 noiseUv = vec2(angle * 1.8, radius * 3.0) + vec2(u_time * 0.035, -u_time * 0.02);
    float field = noise(noiseUv) * 0.72
      + noise(noiseUv * 2.15 + vec2(17.3, 9.2)) * 0.28;

    float edge = u_progress * (0.65 + field * u_noiseStrength * 0.6);
    float edgeWidth = 0.015 + u_edgeSoftness * 0.025;
    float mask = u_progress <= 0.001
      ? 1.0
      : smoothstep(edge - edgeWidth, edge + edgeWidth, radius);
    float edgeGlow = (1.0 - smoothstep(0.0, edgeWidth * 2.0, abs(radius - edge)))
      * step(0.001, u_progress);
    vec3 color = mix(u_maskColor, u_glowColor, edgeGlow * 0.95);

    gl_FragColor = vec4(color, mask);
  }
`;

export default function TopxPreloader() {
  const [active, setActive] = useState(true);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wordStep, setWordStep] = useState(0);
  const [logoRevealed, setLogoRevealed] = useState(false);
  const [statusText, setStatusText] = useState('WORKSPACE // STARTING CODING ARENA...');

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const exitStartRef = useRef(0);
  const exitProgressRef = useRef(0);
  const exitTimeoutRef = useRef(null);
  const glRef = useRef(null);
  const uniformsRef = useRef({});

  // Show the intro on every page load.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.replayTopxIntro = () => {
      setClosing(false);
      setProgress(0);
      setWordStep(0);
      setLogoRevealed(false);
      exitProgressRef.current = 0;
      exitStartRef.current = 0;
      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
      setActive(true);
      document.body.style.overflow = 'hidden';
    };

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      if (exitTimeoutRef.current) window.clearTimeout(exitTimeoutRef.current);
      delete window.replayTopxIntro;
    };
  }, []);

  // WebGL Shader Compilation & Renderer
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = canvas.closest('.topx-preloader-wrap');
    glRef.current = null;
    uniformsRef.current = {};

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root?.classList.add('no-webgl');
      return undefined;
    }

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false }) ||
               canvas.getContext('experimental-webgl', { alpha: true, antialias: false });

    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS dissolve');
      root?.classList.add('no-webgl');
      return;
    }
    root?.classList.remove('no-webgl');

    // Resize canvas
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 0.85 : 0.9);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniformsRef.current.u_resolution) {
        gl.uniform2f(uniformsRef.current.u_resolution, canvas.width, canvas.height);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Compile Shader Helper
    const createShader = (glCtx, type, source) => {
      const shader = glCtx.createShader(type);
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compilation error:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) {
      root?.classList.add('no-webgl');
      window.removeEventListener('resize', resizeCanvas);
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      root?.classList.add('no-webgl');
      window.removeEventListener('resize', resizeCanvas);
      return;
    }
    gl.useProgram(program);

    // Quad Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    uniformsRef.current = {
      u_progress: gl.getUniformLocation(program, 'u_progress'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_noiseStrength: gl.getUniformLocation(program, 'u_noiseStrength'),
      u_edgeSoftness: gl.getUniformLocation(program, 'u_edgeSoftness'),
      u_maskColor: gl.getUniformLocation(program, 'u_maskColor'),
      u_glowColor: gl.getUniformLocation(program, 'u_glowColor')
    };

    // Initial values
    gl.uniform2f(uniformsRef.current.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(uniformsRef.current.u_noiseStrength, 1.5);
    gl.uniform1f(uniformsRef.current.u_edgeSoftness, 0.55);
    // White mask keeps the portal reveal consistent with the light intro theme.
    gl.uniform3f(uniformsRef.current.u_maskColor, 1.0, 1.0, 1.0);
    gl.uniform3f(uniformsRef.current.u_glowColor, 1.0, 0.39, 0.08);
    gl.uniform1f(uniformsRef.current.u_progress, 0.0);
    glRef.current = gl;

    startTimeRef.current = performance.now();

    // Let the browser schedule every available frame for a smooth portal reveal.
    const render = (now) => {
      const elapsed = (now - startTimeRef.current) * 0.001;
      gl.uniform1f(uniformsRef.current.u_time, elapsed);

      // Handle exit progress tearing animation
      if (exitStartRef.current > 0) {
        const exitElapsed = (now - exitStartRef.current) * 0.001;
        const duration = 0.9;
        const t = Math.min(exitElapsed / duration, 1.0);
        // Exponential ease-in-out power curve for tearing opening
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        exitProgressRef.current = ease * 2.1; // 0 to 2.1 unmasks complete canvas
        gl.uniform1f(uniformsRef.current.u_progress, exitProgressRef.current);

        if (t >= 1.0) {
          // Finished tearing!
          if (exitTimeoutRef.current) {
            window.clearTimeout(exitTimeoutRef.current);
            exitTimeoutRef.current = null;
          }
          setActive(false);
          document.body.style.overflow = '';
          glRef.current = null;
          return;
        }
      } else {
        gl.uniform1f(uniformsRef.current.u_progress, 0.0);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      glRef.current = null;
    };
  }, [active]);

  // Timeline Sequence (Words + Telemetry + Exit trigger)
  useEffect(() => {
    if (!active) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setLogoRevealed(true);
      setWordStep(4);
      setProgress(100);
      const reducedExit = setTimeout(triggerExit, 500);
      return () => clearTimeout(reducedExit);
    }

    // Rebuild the mark first, then reveal the statement and highlight CODE.
    const tLogo = setTimeout(() => {
      setLogoRevealed(true);
      setStatusText('WORKSPACE // LOADING YOUR TOOLKIT...');
    }, 120);

    const t0 = setTimeout(() => {
      setWordStep(1); // CODE
      setStatusText('EDITOR // READY FOR YOUR NEXT LINE...');
    }, 950);

    const t1 = setTimeout(() => {
      setWordStep(2); // COMPETE
      setStatusText('CHALLENGE // TEST YOUR PROBLEM-SOLVING...');
    }, 1200);

    const t2 = setTimeout(() => {
      setWordStep(3); // CONQUER
      setStatusText('SOLUTION // BUILD, TEST, IMPROVE...');
    }, 1450);

    const tHighlight = setTimeout(() => {
      setWordStep(4);
      setStatusText('ALL SYSTEMS // READY TO CODE.');
    }, 1750);

    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progInterval);
          return 100;
        }
        return Math.min(prev + 6, 100);
      });
    }, 180);

    const tExit = setTimeout(() => {
      triggerExit();
    }, 2650);

    return () => {
      clearTimeout(tLogo);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tHighlight);
      clearTimeout(tExit);
      clearInterval(progInterval);
    };
  }, [active]);

  // Trigger Exit Dissolve
  const triggerExit = useCallback(() => {
    if (exitStartRef.current > 0) return;
    setClosing(true);
    setProgress(100);
    setWordStep(4);
    setStatusText("WORKSPACE_READY // LET'S BUILD SOMETHING.");
    exitStartRef.current = performance.now();

    exitTimeoutRef.current = window.setTimeout(() => {
      setActive(false);
      document.body.style.overflow = '';
      exitTimeoutRef.current = null;
    }, glRef.current ? 1000 : 950);
  }, []);

  // Keyboard shortcut listener (ESC to skip)
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        triggerExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, triggerExit]);

  if (!active) return null;

  return (
    <div
      id="topx-preloader-root"
      className={`topx-preloader-wrap ${closing ? 'is-closing' : ''}`}
      onClick={triggerExit}
      title="Click anywhere or press ESC to skip"
    >
      {/* Background WebGL Shader Canvas for the Liquid Noise Portal Dissolve */}
      <canvas ref={canvasRef} className="topx-preloader-canvas" />

      {/* Cyberpunk Telemetry HUD Overlay */}
      <div className={`topx-preloader-hud ${closing ? 'hud-exit' : ''}`}>
        {/* Top HUD Bar */}
        <div className="topx-hud-bar top">
          <div className="topx-hud-brand">
            <span className="topx-hud-dot" />
            <span className="topx-hud-title">TOP-X</span>
          </div>
          <div className="topx-hud-sys">
            <span className="topx-hud-code">CODING ARENA: ONLINE</span>
          </div>
        </div>

        {/* Center Stage: 8-Polygon Emblem + Cinematic Words */}
        <div className="topx-preloader-center">
          {/* Geometric 8-Polygon Top-X Mark */}
          <div className={`topx-loader-logo-wrap ${logoRevealed ? 'revealed' : ''}`}>
            <svg viewBox="345 155 900 490" className="topx-loader-logo-svg">
              <g className="topx-poly-group">
                {/* Outer Chevrons */}
                <polygon
                  className="topx-poly poly-chev-l"
                  points="538,208 587,254 449,393 579,527 529,577 354,395"
                />
                <polygon
                  className="topx-poly poly-chev-r"
                  points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254"
                />
                {/* Central Diagonal Orange Spire */}
                <polygon
                  className="topx-poly poly-accent-main"
                  points="988,159 1027,159 547,640 508,640"
                />
                {/* Inner Angular Geometric Shards */}
                <polygon
                  className="topx-poly poly-shard-1"
                  points="625,255 717,255 796,334 745,383 678,313"
                />
                <polygon
                  className="topx-poly poly-shard-2"
                  points="625,367 678,313 745,383 694,438"
                />
                <polygon
                  className="topx-poly poly-shard-3"
                  points="942,334 989,382 897,478 850,430"
                />
                <polygon
                  className="topx-poly poly-shard-4"
                  points="770,433 813,390 850,430 897,478 959,544 871,544"
                />
                <polygon
                  className="topx-poly poly-shard-5"
                  points="832,369 870,410 850,430 813,390"
                />
              </g>
            </svg>
          </div>

          {/* Cinematic 3-Word Statement */}
          <div className="topx-loader-words">
            <span className={`topx-word word-1 ${wordStep >= 1 ? 'active' : ''} ${wordStep >= 4 ? 'glow-orange' : ''}`}>
              CODE.
            </span>
            <span className={`topx-word word-2 ${wordStep >= 2 ? 'active' : ''}`}>
              COMPETE.
            </span>
            <span className={`topx-word word-3 ${wordStep >= 3 ? 'active' : ''}`}>
              CONQUER.
            </span>
          </div>

          <div className="topx-loader-tagline">
            FROM YOUR FIRST LINE TO ACCEPTED SOLUTIONS
          </div>
        </div>

        {/* Bottom HUD Bar */}
        <div className="topx-hud-bar bottom">
          <div className="topx-hud-log">
            <span className="log-caret">&gt;</span>
            <span className="log-text">{statusText}</span>
          </div>

          <div className="topx-hud-progress">
            <div className="topx-hud-bar-track">
              <div className="topx-hud-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="topx-hud-percent">{String(progress).padStart(3, '0')}%</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerExit();
            }}
            className="topx-hud-skip"
          >
            <span>SKIP [ESC]</span>
          </button>
        </div>
      </div>
    </div>
  );
}

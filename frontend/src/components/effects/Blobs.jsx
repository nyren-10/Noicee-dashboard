/**
 * Floating animated blob orbs — CSS-based, no WebGL.
 * Inspired by the React Bits "Orbs" and MotionSite blob effects.
 * Uses SVG filter feTurbulence for the organic morphing shape.
 */
export default function Blobs({ count = 3, className = '', style: styleProp = {} }) {
  const CONFIGS = [
    {
      size: 600,
      x: '-10%', y: '-20%',
      color: 'rgba(99,102,241,0.18)',
      duration: 22,
      delay: 0,
    },
    {
      size: 500,
      x: '60%', y: '50%',
      color: 'rgba(6,182,212,0.14)',
      duration: 28,
      delay: -8,
    },
    {
      size: 450,
      x: '30%', y: '-15%',
      color: 'rgba(168,85,247,0.12)',
      duration: 18,
      delay: -4,
    },
    {
      size: 380,
      x: '80%', y: '10%',
      color: 'rgba(59,130,246,0.1)',
      duration: 25,
      delay: -12,
    },
  ].slice(0, count);

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, ...styleProp }}
    >
      {/* SVG filter for organic blob morphing */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="blob-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="4"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="40"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="blob-filter-2">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="50"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {CONFIGS.map((cfg, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cfg.x,
            top: cfg.y,
            width: cfg.size,
            height: cfg.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 40%, ${cfg.color}, transparent 70%)`,
            filter: `url(#blob-filter${i % 2 === 1 ? '-2' : ''}) blur(${i === 0 ? 40 : 50}px)`,
            animation: `blob-drift-${i % 3} ${cfg.duration}s ease-in-out ${cfg.delay}s infinite alternate`,
            willChange: 'transform',
          }}
        />
      ))}

      <style>{`
        @keyframes blob-drift-0 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(60px, 40px) scale(1.12); }
        }
        @keyframes blob-drift-1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-50px, 60px) scale(0.9); }
        }
        @keyframes blob-drift-2 {
          from { transform: translate(0, 0) scale(1) rotate(0deg); }
          to   { transform: translate(30px, -50px) scale(1.08) rotate(15deg); }
        }
      `}</style>
    </div>
  );
}

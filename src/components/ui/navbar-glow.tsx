"use client";

export function NavbarGlow() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="navGlow1" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        <radialGradient id="navGlow2" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="rgba(255,180,80,0.18)" />
          <stop offset="50%" stopColor="rgba(255,180,80,0.08)" />
          <stop offset="100%" stopColor="rgba(255,180,80,0)" />
        </radialGradient>

        <filter id="blur">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>

      {/* Center soft white glow */}
      <ellipse
        cx="600"
        cy="100"
        rx="420"
        ry="90"
        fill="url(#navGlow1)"
        filter="url(#blur)"
      />

      {/* Warm accent glow */}
      <ellipse
        cx="900"
        cy="120"
        rx="300"
        ry="70"
        fill="url(#navGlow2)"
        filter="url(#blur)"
      />
    </svg>
  );
}

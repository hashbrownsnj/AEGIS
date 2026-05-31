import { useId } from "react";

/**
 * AEGIS wings — original angular/polygonal mark.
 * White → light-blue → dark-blue vertical gradient, transparent ground.
 * Used for the favicon, the sidebar brand, the login screen, and loaders.
 */
export function AegisMark({ className, animate = false }: { className?: string; animate?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const wing = (
    <>
      <polygon points="137.00,78.00 182.58,51.70 226.00,8.00 173.30,39.90" />
      <polygon points="140.00,84.00 192.83,67.81 248.00,34.00 186.53,54.19" />
      <polygon points="143.00,90.00 195.42,85.12 256.00,64.00 192.28,71.48" />
      <polygon points="146.00,97.00 194.72,102.60 254.00,95.00 194.48,89.60" />
      <polygon points="149.00,105.00 187.81,119.23 240.00,124.00 190.27,107.49" />
      <polygon points="152.00,114.00 178.05,133.83 217.00,148.00 183.15,124.09" />
      <polygon points="155.00,123.00 166.91,145.10 190.00,165.00 174.59,138.70" />
      <polygon points="131.00,92.00 159.79,85.68 188.00,66.00 154.65,74.40" />
      <polygon points="134.00,103.00 164.93,105.15 200.00,96.00 163.79,94.41" />
      <polygon points="137.00,114.00 158.22,125.19 185.00,128.00 160.90,115.97" />
    </>
  );
  return (
    <svg
      viewBox="0 0 256 200"
      fill="none"
      className={className}
      role="img"
      aria-label="AEGIS"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.12" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="34%" stopColor="#e6f4fe" />
          <stop offset="60%" stopColor="#5cc6f6" />
          <stop offset="84%" stopColor="#1182c6" />
          <stop offset="100%" stopColor="#0a3a63" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`} className={animate ? "aegis-wing-in" : undefined}>
        <g>{wing}</g>
        <g transform="translate(256,0) scale(-1,1)">{wing}</g>
      </g>
    </svg>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AegisMark } from "./AegisMark";

/**
 * IntroLoader — a cinematic "boot sequence" preloader.
 *
 * Plays once per browser session. The progress bar advances while a monospace
 * status line steps through what Aegis is actually doing, so a first-time
 * viewer (e.g. a hackathon judge) absorbs the product story in the ~2.5s before
 * the home page resolves underneath. Honors prefers-reduced-motion.
 */

const BOOT_STEPS: { at: number; label: string }[] = [
  { at: 0, label: "Booting Aegis core" },
  { at: 16, label: "Calibrating ACUITY triage engine" },
  { at: 34, label: "Linking facility + EMS network" },
  { at: 54, label: "Loading clinical reasoning models" },
  { at: 72, label: "Establishing secure channel · TLS 1.3" },
  { at: 88, label: "Synchronizing live patient flow" },
  { at: 100, label: "Ready" },
];

function currentStep(p: number) {
  let label = BOOT_STEPS[0].label;
  for (const s of BOOT_STEPS) if (p >= s.at) label = s.label;
  return label;
}

export function IntroLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 700 : 2600;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      // easeOutCubic so it surges then settles, like a real load
      const linear = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - linear, 3);
      setProgress(Math.round(eased * 100));
      if (linear < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setVisible(false), reduce ? 120 : 420);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = String(progress).padStart(3, "0");

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className="intro-root"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(8px)" }}
          transition={{ duration: 0.85, ease: [0.7, 0, 0.2, 1] }}
          role="status"
          aria-label="Loading Aegis"
        >
          <div className="intro-bg" aria-hidden />
          <div className="intro-grid" aria-hidden />
          <div className="intro-scan" aria-hidden />

          <button
            className="intro-skip"
            onClick={() => setVisible(false)}
            aria-label="Skip intro"
          >
            Skip
          </button>

          <div className="intro-center">
            <motion.div
              className="intro-mark"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="intro-mark-glow" aria-hidden />
              <AegisMark className="h-20 w-auto relative z-10" animate />
            </motion.div>

            <motion.div
              className="intro-wordmark"
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.32em" }}
              transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
            >
              AEGIS
            </motion.div>

            <motion.p
              className="intro-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.55 }}
            >
              Adaptive Emergency Guidance &amp; Intelligence System
            </motion.p>

            <motion.div
              className="intro-progress-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="intro-progress-meta">
                <span className="intro-status">{currentStep(progress)}</span>
                <span className="intro-pct">{pct}</span>
              </div>
              <div className="intro-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="intro-fill" style={{ width: `${progress}%` }}>
                  <span className="intro-fill-tip" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

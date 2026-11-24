import { motion, AnimatePresence } from "motion/react";

/** Animated waveform pinned to the side that pulses while Pantry is speaking. */
export function AISpeakingIndicator({ active, label = "Pantry is talking" }: { active: boolean; label?: string }) {
  const bars = [0.35, 0.6, 0.85, 0.55, 0.4];
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="ai-speaking"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.22, 0.9, 0.3, 1] }}
          className="pointer-events-none fixed left-4 top-1/2 z-30 -translate-y-1/2 sm:left-6"
          aria-live="polite"
          aria-label={label}
        >
          <div
            className="glass flex flex-col items-center gap-3 rounded-full px-3 py-5"
            style={{
              background: "color-mix(in oklab, var(--ink) 88%, transparent)",
              boxShadow: "0 18px 40px -22px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-end gap-1 h-12">
              {bars.map((base, i) => (
                <motion.span
                  key={i}
                  className="block w-1 rounded-full"
                  style={{ background: "var(--tomato)" }}
                  animate={{
                    height: [`${base * 30}%`, `${(base + 0.3) * 100}%`, `${base * 30}%`],
                  }}
                  transition={{
                    duration: 0.9 + i * 0.07,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.08,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-[9px] uppercase tracking-[0.32em]"
                style={{ color: "color-mix(in oklab, var(--cream) 80%, transparent)" }}
              >
                Pantry
              </span>
              <motion.span
                className="block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--tomato)" }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

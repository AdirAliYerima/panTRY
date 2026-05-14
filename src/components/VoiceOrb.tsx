import { Mic, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { AppState } from "@/lib/types";

export function VoiceOrb({
  state,
  onClick,
}: {
  state: AppState;
  onClick: () => void;
}) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isConfirming = state === "confirming";

  // Orb breathes outward as the conversation gets more active.
  const scale = isThinking ? 1.18 : isListening ? 1.1 : isConfirming ? 1.04 : 1;

  return (
    <motion.button
      onClick={onClick}
      aria-label={isListening ? "Stop listening" : "Start listening"}
      animate={{ scale }}
      transition={{ duration: 0.9, ease: [0.22, 0.9, 0.3, 1] }}
      className="group relative grid h-44 w-44 place-items-center rounded-full focus:outline-none"
    >
      {/* Outer ripples when listening */}
      {isListening && (
        <>
          <span
            className="animate-ripple absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--amber) 40%, transparent), transparent 60%)" }}
          />
          <span
            className="animate-ripple absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, color-mix(in oklab, var(--amber) 30%, transparent), transparent 60%)",
              animationDelay: "0.6s",
            }}
          />
        </>
      )}

      {/* Soft glow ring */}
      <span
        className={`absolute inset-2 rounded-full ${state === "idle" ? "animate-pulse-glow" : ""}`}
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--amber-glow) 80%, transparent), color-mix(in oklab, var(--amber) 70%, transparent) 60%, color-mix(in oklab, var(--forest) 80%, transparent) 100%)",
          boxShadow:
            "inset 0 0 30px rgba(255,220,150,0.35), 0 0 60px rgba(212,168,83,0.45)",
        }}
      />

      {/* Inner core */}
      <motion.span
        whileTap={{ scale: 0.94 }}
        className="relative z-10 grid h-28 w-28 place-items-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #f5d68a, var(--amber) 60%, #8a6a2a 100%)",
          boxShadow:
            "inset 0 6px 14px rgba(255,255,255,0.4), inset 0 -10px 20px rgba(0,0,0,0.35), 0 20px 40px rgba(0,0,0,0.45)",
        }}
      >
        {isThinking ? (
          <Loader2 className="h-10 w-10 animate-spin text-forest-deep" style={{ color: "var(--forest-deep)" }} />
        ) : isListening ? (
          <WaveBars />
        ) : (
          <Mic className="h-10 w-10" style={{ color: "var(--forest-deep)" }} strokeWidth={2.4} />
        )}
      </motion.span>
    </motion.button>
  );
}

function WaveBars() {
  return (
    <div className="flex items-end gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-1.5 origin-bottom rounded-full"
          style={{
            height: 28,
            background: "var(--forest-deep)",
            animation: `wave 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

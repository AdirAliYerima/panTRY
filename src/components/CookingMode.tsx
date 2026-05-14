import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, Timer, X } from "lucide-react";
import type { Meal } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/speech";

export function CookingMode({
  meal,
  onExit,
}: {
  meal: Meal;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const step = meal.steps[idx];
  const total = meal.steps.length;
  const progress = ((idx + 1) / total) * 100;

  useEffect(() => {
    speak(`Step ${idx + 1}. ${step.instruction}`);
    return () => stopSpeaking();
  }, [idx, step.instruction]);

  const next = () => {
    if (idx < total - 1) {
      setDirection(1);
      setIdx(idx + 1);
    } else {
      stopSpeaking();
      speak("All done. Enjoy your meal!");
      onExit();
    }
  };
  const prev = () => {
    if (idx > 0) {
      setDirection(-1);
      setIdx(idx - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex w-full max-w-4xl flex-col px-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--amber)" }}>
            Now cooking
          </p>
          <h2 className="font-display text-3xl">{meal.name}</h2>
        </div>
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 hover:border-amber/60"
          aria-label="Exit cooking mode"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-card/60">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--amber)" }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {idx + 1} of {total}
      </p>

      <div className="relative mt-8 min-h-[280px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={idx}
            custom={direction}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 0.9, 0.3, 1] }}
            className="glass rounded-3xl p-8 md:p-12"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <p className="font-display text-3xl leading-snug md:text-4xl">
              {step.instruction}
            </p>
            {step.timerMinutes ? <StepTimer minutes={step.timerMinutes} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 disabled:opacity-40"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <button
          onClick={next}
          className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-medium hover:brightness-110"
          style={{ background: "var(--amber)", color: "var(--forest-deep)", boxShadow: "var(--shadow-glow)" }}
        >
          {idx === total - 1 ? "Finish" : "Next step"} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

function StepTimer({ minutes }: { minutes: number }) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(total);
    setRunning(false);
  }, [total]);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          speak("Timer done!");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-card/70 px-5 py-3">
      <Timer className="h-5 w-5" style={{ color: "var(--amber)" }} />
      <span className="font-display text-2xl tabular-nums">
        {m}:{s.toString().padStart(2, "0")}
      </span>
      <button
        onClick={() => setRunning((v) => !v)}
        className="ml-2 grid h-9 w-9 place-items-center rounded-full"
        style={{ background: "var(--amber)", color: "var(--forest-deep)" }}
        aria-label={running ? "Pause" : "Start"}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}

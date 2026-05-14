import { motion } from "motion/react";
import { ArrowLeft, Check, X } from "lucide-react";
import type { Meal } from "@/lib/types";
import { imageFor } from "./MealCards";

export function MealReview({
  meal,
  onBack,
  onConfirm,
  onDecline,
}: {
  meal: Meal;
  onBack: () => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-3xl px-6"
    >
      <button
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em]"
        style={{ color: "var(--ink-soft)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="text-center">
        <p className="eyebrow" style={{ color: "var(--tomato)" }}>{meal.cuisine}</p>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mt-3 font-display text-5xl leading-[1] md:text-6xl"
          style={{ color: "var(--ink)" }}
        >
          {meal.name}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mx-auto my-10 grid h-72 w-72 place-items-center rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--amber) 28%, transparent), transparent 70%)",
          }}
        >
          <img
            src={imageFor(meal, 0)}
            alt={meal.name}
            className="h-56 w-56 object-contain"
            style={{ filter: "drop-shadow(0 24px 32px rgba(120,70,30,0.32))" }}
          />
        </motion.div>

        <p
          className="mx-auto max-w-xl font-display text-xl italic leading-relaxed md:text-2xl"
          style={{ color: "var(--ink)" }}
        >
          "{meal.description}"
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm uppercase tracking-[0.18em]" style={{ color: "var(--ink-soft)" }}>
          <span><strong style={{ color: "var(--ink)" }}>{meal.estimatedCost}</strong> · cost</span>
          <span><strong style={{ color: "var(--ink)" }}>{meal.prepTimeMinutes}m</strong> · time</span>
          <span><strong style={{ color: "var(--ink)" }}>{meal.nutrition.calories}</strong> · cal</span>
          <span><strong style={{ color: "var(--ink)" }}>{meal.nutrition.proteinG}g</strong> · protein</span>
        </div>

        <div className="mt-12">
          <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>Shall we cook this one?</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium tracking-wide transition-all hover:scale-[1.03]"
              style={{
                background: "var(--tomato)",
                color: "var(--primary-foreground)",
                boxShadow: "0 14px 30px -12px color-mix(in oklab, var(--tomato) 70%, transparent)",
              }}
            >
              <Check className="h-4 w-4" /> Yes, let's go
            </button>
            <button
              onClick={onDecline}
              className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-medium hover:bg-card"
              style={{
                borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)",
                color: "var(--ink)",
              }}
            >
              <X className="h-4 w-4" /> Pick another
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

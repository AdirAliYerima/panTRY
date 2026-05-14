import { motion, AnimatePresence } from "motion/react";
import { Check, X, ShoppingBasket, ArrowLeft } from "lucide-react";
import type { Meal } from "@/lib/types";

export function IngredientChecklist({
  meal,
  index,
  haveSet,
  onAnswer,
  onBack,
  onFinish,
}: {
  meal: Meal;
  index: number;
  haveSet: Set<string>;
  onAnswer: (have: boolean) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const total = meal.ingredients.length;
  const done = index >= total;
  const current = meal.ingredients[Math.min(index, total - 1)];
  const need = meal.ingredients.filter((i) => !haveSet.has(i.name));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-3xl px-6"
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em]"
        style={{ color: "var(--ink-soft)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>
        <span>Pantry check</span>
        <span>{Math.min(index, total)} of {total}</span>
      </div>
      <div className="h-px w-full" style={{ background: "color-mix(in oklab, var(--ink) 14%, transparent)" }}>
        <motion.div
          initial={false}
          animate={{ width: `${(Math.min(index, total) / total) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 0.9, 0.3, 1] }}
          className="h-px"
          style={{ background: "var(--tomato)" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key={current.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.4, ease: [0.22, 0.9, 0.3, 1] }}
            className="mt-12 text-center"
          >
            <p className="eyebrow">Do you have…</p>
            <h2
              className="mt-4 font-display text-6xl leading-[1] md:text-7xl"
              style={{ color: "var(--ink)" }}
            >
              {current.name}
              <span style={{ color: "var(--tomato)" }}>?</span>
            </h2>
            <p className="mt-4 text-sm" style={{ color: "var(--ink-soft)" }}>
              {current.quantity} · {current.category}
            </p>

            <div className="mt-12 flex items-center justify-center gap-3">
              <button
                onClick={() => onAnswer(true)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium tracking-wide transition-all hover:scale-[1.03]"
                style={{
                  background: "var(--ink)",
                  color: "var(--cream)",
                }}
              >
                <Check className="h-4 w-4" /> Yes, I have it
              </button>
              <button
                onClick={() => onAnswer(false)}
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-medium hover:bg-card"
                style={{
                  borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)",
                  color: "var(--ink)",
                }}
              >
                <X className="h-4 w-4" /> Need to buy
              </button>
            </div>

            {/* Running tally */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
              {meal.ingredients.slice(0, index).map((ing) => {
                const have = haveSet.has(ing.name);
                return (
                  <span
                    key={ing.name}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{
                      background: have
                        ? "color-mix(in oklab, var(--sage) 20%, transparent)"
                        : "color-mix(in oklab, var(--tomato) 14%, transparent)",
                      color: have ? "var(--sage)" : "var(--tomato)",
                      border: `1px solid ${have ? "color-mix(in oklab, var(--sage) 35%, transparent)" : "color-mix(in oklab, var(--tomato) 30%, transparent)"}`,
                    }}
                  >
                    {have ? <Check className="h-3 w-3" /> : <ShoppingBasket className="h-3 w-3" />}
                    {ing.name}
                  </span>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-14 text-center"
          >
            <p className="eyebrow">All checked</p>
            <h2 className="mt-3 font-display text-5xl md:text-6xl" style={{ color: "var(--ink)" }}>
              {need.length === 0 ? (
                <>You've got <span style={{ color: "var(--sage)", fontStyle: "italic" }}>everything</span>.</>
              ) : (
                <>You'll need <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>{need.length}</span> {need.length === 1 ? "thing" : "things"}.</>
              )}
            </h2>
            <p className="mx-auto mt-4 max-w-md" style={{ color: "var(--ink-soft)" }}>
              {need.length === 0
                ? "Time to fire up the stove."
                : "I'll put a quick shopping list together for you."}
            </p>
            <button
              onClick={onFinish}
              className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium tracking-wide transition-all hover:scale-[1.03]"
              style={{
                background: "var(--tomato)",
                color: "var(--primary-foreground)",
                boxShadow: "0 14px 30px -12px color-mix(in oklab, var(--tomato) 70%, transparent)",
              }}
            >
              {need.length === 0 ? "Start cooking" : "See shopping list"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

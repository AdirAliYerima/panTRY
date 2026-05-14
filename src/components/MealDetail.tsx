import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChefHat, ShoppingBasket, Check } from "lucide-react";
import type { Meal } from "@/lib/types";
import { imageFor } from "./MealCards";

export function MealDetail({
  meal,
  onBack,
  onStartCooking,
  onShowGrocery,
  haveSet,
  toggleHave,
}: {
  meal: Meal;
  onBack: () => void;
  onStartCooking: () => void;
  onShowGrocery: () => void;
  haveSet: Set<string>;
  toggleHave: (name: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-5xl px-6"
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plan
      </button>

      <div className="glass overflow-hidden rounded-3xl" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="grid gap-8 p-8 md:grid-cols-[260px_1fr] md:p-10">
          <div className="grid h-60 place-items-center rounded-2xl"
               style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--amber) 20%, transparent), transparent 70%)" }}>
            <img src={imageFor(meal, 0)} alt={meal.name} className="h-48 w-48 object-contain"
                 style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.55))" }} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--amber)" }}>
              {meal.cuisine} · Serves {meal.servings}
            </p>
            <h2 className="mt-1 font-display text-4xl leading-tight md:text-5xl">{meal.name}</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">{meal.description}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Pill>{meal.estimatedCost} total</Pill>
              <Pill>{meal.prepTimeMinutes} min</Pill>
              <Pill>{meal.nutrition.calories} cal</Pill>
              <Pill>{meal.nutrition.proteinG}g protein</Pill>
              <Pill>{meal.nutrition.carbsG}g carbs</Pill>
              <Pill>{meal.nutrition.fatG}g fat</Pill>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 px-8 pb-8 pt-6 md:px-10">
          <h3 className="font-display text-2xl">Ingredients</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap to mark what you already have.
          </p>

          <ul className="mt-5 grid gap-2 md:grid-cols-2">
            {meal.ingredients.map((ing) => {
              const have = haveSet.has(ing.name);
              return (
                <li key={ing.name}>
                  <button
                    onClick={() => toggleHave(ing.name)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left transition hover:border-amber/50"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="grid h-6 w-6 place-items-center rounded-md border"
                        style={{
                          borderColor: have ? "var(--amber)" : "var(--border)",
                          background: have ? "var(--amber)" : "transparent",
                        }}
                      >
                        {have && <Check className="h-4 w-4" style={{ color: "var(--forest-deep)" }} />}
                      </span>
                      <span>
                        <span className="block font-medium">{ing.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {ing.quantity} · {ing.category}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">{ing.estimatedCost}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onStartCooking}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium transition hover:brightness-110"
              style={{ background: "var(--amber)", color: "var(--forest-deep)", boxShadow: "var(--shadow-glow)" }}
            >
              <ChefHat className="h-5 w-5" /> Start Cooking
            </button>
            <button
              onClick={onShowGrocery}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3 font-medium hover:border-amber/60"
            >
              <ShoppingBasket className="h-5 w-5" /> Grocery list
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

import { motion } from "motion/react";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Meal } from "@/lib/types";

export function GroceryList({
  meal,
  haveSet,
  onBack,
}: {
  meal: Meal;
  haveSet: Set<string>;
  onBack: () => void;
}) {
  const need = meal.ingredients.filter((i) => !haveSet.has(i.name));
  const grouped = need.reduce<Record<string, typeof need>>((acc, i) => {
    (acc[i.category] ||= []).push(i);
    return acc;
  }, {});
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const text = Object.entries(grouped)
      .map(([cat, items]) => `${cat}\n${items.map((i) => `• ${i.quantity} ${i.name}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(`Grocery list — ${meal.name}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-6"
    >
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="glass rounded-3xl p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--amber)" }}>
              Grocery list
            </p>
            <h2 className="mt-1 font-display text-4xl">{meal.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {need.length} item{need.length === 1 ? "" : "s"} to buy
            </p>
          </div>
          <button
            onClick={copyText}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-amber/60"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {need.length === 0 ? (
          <p className="mt-8 text-muted-foreground">You already have everything. Time to cook!</p>
        ) : (
          <div className="mt-8 space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="font-display text-xl" style={{ color: "var(--amber)" }}>{cat}</h3>
                <ul className="mt-2 divide-y divide-border/40">
                  {items.map((i) => (
                    <li key={i.name} className="flex items-center justify-between py-2.5">
                      <span>
                        <span className="font-medium">{i.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{i.quantity}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">{i.estimatedCost}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

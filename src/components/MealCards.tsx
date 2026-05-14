import { motion } from "motion/react";
import { Clock, DollarSign } from "lucide-react";
import type { Meal } from "@/lib/types";
import avocado from "@/assets/food-avocado.png";
import lemon from "@/assets/food-lemon.png";
import tomato from "@/assets/food-tomato.png";
import pasta from "@/assets/food-pasta.png";
import herbs from "@/assets/food-herbs.png";
import eggs from "@/assets/food-eggs.png";
import bread from "@/assets/food-bread.png";

const PALETTE = [pasta, tomato, avocado, eggs, bread, lemon, herbs];

function imageFor(meal: Meal, idx: number) {
  const n = meal.name.toLowerCase();
  if (n.includes("pasta") || n.includes("noodle") || n.includes("spaghetti")) return pasta;
  if (n.includes("egg") || n.includes("omelet") || n.includes("frittata")) return eggs;
  if (n.includes("avocado") || n.includes("guac")) return avocado;
  if (n.includes("tomato") || n.includes("marinara") || n.includes("bruschetta")) return tomato;
  if (n.includes("bread") || n.includes("toast") || n.includes("sandwich")) return bread;
  if (n.includes("lemon") || n.includes("citrus")) return lemon;
  if (n.includes("pesto") || n.includes("basil") || n.includes("herb") || n.includes("salad")) return herbs;
  return PALETTE[idx % PALETTE.length];
}

export function MealCards({
  meals,
  onSelect,
}: {
  meals: Meal[];
  onSelect: (m: Meal) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4">
      {meals.map((meal, i) => (
        <motion.button
          key={meal.name + i}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 0.9, 0.3, 1] }}
          whileHover={{ y: -6 }}
          onClick={() => onSelect(meal)}
          className="glass group relative overflow-hidden rounded-3xl p-5 text-left"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="relative mb-4 grid h-36 place-items-center overflow-hidden rounded-2xl"
               style={{ background: "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--amber) 18%, transparent), transparent 70%)" }}>
            <img
              src={imageFor(meal, i)}
              alt={meal.name}
              loading="lazy"
              className="h-32 w-32 object-contain transition-transform duration-500 group-hover:scale-110"
              style={{ filter: "drop-shadow(0 16px 20px rgba(120,70,30,0.22))" }}
            />
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-amber" style={{ color: "var(--amber)" }}>
            {meal.cuisine}
          </p>
          <h3 className="mt-1 font-display text-2xl leading-tight">{meal.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {meal.description}
          </p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-4 w-4" /> {meal.estimatedCost}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> {meal.prepTimeMinutes} min
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export { imageFor };

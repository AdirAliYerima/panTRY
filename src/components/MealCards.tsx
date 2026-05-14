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
  if (n.includes("avocado") || n.includes("guac") || n.includes("toast")) return avocado;
  if (n.includes("tomato") || n.includes("marinara") || n.includes("bruschetta") || n.includes("soup") || n.includes("bean")) return tomato;
  if (n.includes("bread") || n.includes("sandwich")) return bread;
  if (n.includes("lemon") || n.includes("citrus")) return lemon;
  if (n.includes("pesto") || n.includes("basil") || n.includes("herb") || n.includes("salad") || n.includes("garden")) return herbs;
  return PALETTE[idx % PALETTE.length];
}

export function MealCards({
  meals,
  onSelect,
  activeIndex = null,
}: {
  meals: Meal[];
  onSelect: (m: Meal) => void;
  activeIndex?: number | null;
}) {
  const isThree = meals.length === 3;
  const cols = isThree ? "lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`mx-auto grid w-full max-w-6xl grid-cols-1 gap-7 px-6 ${cols}`}>
      {meals.map((meal, i) => {
        const isActive = activeIndex === i;
        const isDimmed = activeIndex !== null && activeIndex !== i;
        return (
          <motion.button
            key={meal.name + i}
            initial={{ opacity: 0, y: 40 }}
            animate={{
              opacity: isDimmed ? 0.35 : 1,
              y: 0,
              scale: isActive ? 1.04 : 1,
            }}
            transition={{ delay: activeIndex === null ? i * 0.12 : 0, duration: 0.55, ease: [0.22, 0.9, 0.3, 1] }}
            whileHover={{ y: -6 }}
            onClick={() => onSelect(meal)}
            className="glass group relative overflow-hidden rounded-3xl p-7 text-left"
            style={{
              boxShadow: isActive
                ? "0 30px 60px -20px color-mix(in oklab, var(--tomato) 45%, transparent)"
                : "var(--shadow-card)",
              outline: isActive ? "2px solid var(--tomato)" : "none",
              outlineOffset: isActive ? "-1px" : "0",
            }}
          >
            <div
              className={`relative mb-5 grid place-items-center overflow-hidden rounded-2xl ${isThree ? "h-56" : "h-36"}`}
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--amber) 22%, transparent), transparent 70%)",
              }}
            >
              <img
                src={imageFor(meal, i)}
                alt={meal.name}
                loading="lazy"
                className={`object-contain transition-transform duration-700 ${isThree ? "h-48 w-48" : "h-32 w-32"} ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                style={{ filter: "drop-shadow(0 18px 22px rgba(120,70,30,0.22))" }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: "var(--tomato)", fontWeight: 600 }}>
              {meal.cuisine}
            </p>
            <h3 className={`mt-1 font-display leading-tight ${isThree ? "text-3xl" : "text-2xl"}`}>{meal.name}</h3>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-4 w-4" /> {meal.estimatedCost}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" /> {meal.prepTimeMinutes} min
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export { imageFor };

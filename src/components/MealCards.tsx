import { motion, type Variants } from "motion/react";
import { useState } from "react";
import { Clock, DollarSign, Sparkles } from "lucide-react";
import type { Meal } from "@/lib/types";
import avocado from "@/assets/food-avocado.png";
import lemon from "@/assets/food-lemon.png";
import tomato from "@/assets/food-tomato.png";
import pasta from "@/assets/food-pasta.png";
import herbs from "@/assets/food-herbs.png";
import eggs from "@/assets/food-eggs.png";
import bread from "@/assets/food-bread.png";

const PALETTE = [pasta, tomato, avocado, eggs, bread, lemon, herbs];

/** Real-photo URL for a meal, derived from imagePrompt (or name+cuisine).
 *  Pollinations is free, no API key, and returns a generated image of the dish. */
export function photoUrlFor(meal: Meal): string {
  const prompt =
    meal.imagePrompt?.trim() ||
    `${meal.name}, ${meal.cuisine} food photography, plated, overhead shot, natural light`;
  const seed = encodeURIComponent(meal.name).slice(0, 32) || "pantry";
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=600&height=600&nologo=true&seed=${seed}`;
}

type FoodKind =
  | "pasta"
  | "egg"
  | "avocado"
  | "tomato"
  | "bread"
  | "citrus"
  | "herb"
  | "default";

function kindFor(meal: Meal): FoodKind {
  const n = meal.name.toLowerCase();
  if (n.includes("pasta") || n.includes("noodle") || n.includes("spaghetti")) return "pasta";
  if (n.includes("egg") || n.includes("omelet") || n.includes("frittata")) return "egg";
  if (n.includes("avocado") || n.includes("guac") || n.includes("toast")) return "avocado";
  if (n.includes("tomato") || n.includes("marinara") || n.includes("bruschetta") || n.includes("soup") || n.includes("bean")) return "tomato";
  if (n.includes("bread") || n.includes("sandwich")) return "bread";
  if (n.includes("lemon") || n.includes("citrus")) return "citrus";
  if (n.includes("pesto") || n.includes("basil") || n.includes("herb") || n.includes("salad") || n.includes("garden")) return "herb";
  return "default";
}

function imageFor(meal: Meal, idx: number) {
  switch (kindFor(meal)) {
    case "pasta": return pasta;
    case "egg": return eggs;
    case "avocado": return avocado;
    case "tomato": return tomato;
    case "bread": return bread;
    case "citrus": return lemon;
    case "herb": return herbs;
    default: return PALETTE[idx % PALETTE.length];
  }
}

/** Food-specific entrance + idle motion. */
function heroVariantsFor(kind: FoodKind): Variants {
  switch (kind) {
    case "pasta":
      return {
        initial: { opacity: 0, rotate: -45, scale: 0.6 },
        animate: {
          opacity: 1,
          rotate: [0, -3, 3, 0],
          scale: 1,
          transition: { opacity: { duration: 0.5 }, rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.6, ease: [0.22, 0.9, 0.3, 1] } },
        },
      };
    case "tomato":
      return {
        initial: { opacity: 0, y: 40, scale: 0.4 },
        animate: {
          opacity: 1,
          y: [0, -4, 0],
          scale: [1, 1.04, 1],
          transition: { opacity: { duration: 0.5 }, y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } },
        },
      };
    case "egg":
      return {
        initial: { opacity: 0, rotateY: 90, scale: 0.7 },
        animate: {
          opacity: 1,
          rotateY: 0,
          scale: 1,
          y: [0, -3, 0],
          transition: { opacity: { duration: 0.5 }, rotateY: { duration: 0.8, ease: [0.22, 0.9, 0.3, 1] }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
        },
      };
    case "avocado":
      return {
        initial: { opacity: 0, y: -60, rotate: -12 },
        animate: {
          opacity: 1,
          y: [0, 4, 0],
          rotate: [0, 2, -2, 0],
          transition: { opacity: { duration: 0.5 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" } },
        },
      };
    case "bread":
      return {
        initial: { opacity: 0, y: 60, scale: 0.9 },
        animate: {
          opacity: 1,
          y: [0, -2, 0],
          scale: 1,
          transition: { opacity: { duration: 0.5 }, y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.6 } },
        },
      };
    case "citrus":
      return {
        initial: { opacity: 0, rotate: -180, scale: 0.5 },
        animate: {
          opacity: 1,
          rotate: [0, 6, -6, 0],
          scale: 1,
          transition: { opacity: { duration: 0.5 }, rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.7, ease: [0.22, 0.9, 0.3, 1] } },
        },
      };
    case "herb":
      return {
        initial: { opacity: 0, x: -30, rotate: -20 },
        animate: {
          opacity: 1,
          x: 0,
          rotate: [0, 4, -4, 0],
          transition: { opacity: { duration: 0.5 }, x: { duration: 0.7 }, rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" } },
        },
      };
    default:
      return {
        initial: { opacity: 0, y: 20, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
      };
  }
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
        const kind = kindFor(meal);
        const heroVar = heroVariantsFor(kind);
        const facts = meal.nutritionFacts ?? [];
        return (
          <MealCard
            key={meal.name + i}
            meal={meal}
            index={i}
            isThree={isThree}
            isActive={isActive}
            isDimmed={isDimmed}
            heroVar={heroVar}
            facts={facts}
            illustrationFallback={imageFor(meal, i)}
            onSelect={onSelect}
            activeIndex={activeIndex}
          />
        );
      })}
    </div>
  );
}

function MealCard({
  meal,
  index: i,
  isThree,
  isActive,
  isDimmed,
  heroVar,
  facts,
  illustrationFallback,
  onSelect,
  activeIndex,
}: {
  meal: Meal;
  index: number;
  isThree: boolean;
  isActive: boolean;
  isDimmed: boolean;
  heroVar: Variants;
  facts: string[];
  illustrationFallback: string;
  onSelect: (m: Meal) => void;
  activeIndex: number | null;
}) {
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = photoUrlFor(meal);
  const showPhoto = !photoFailed;

  return (
    <motion.button
      initial={{ opacity: 0, y: 60 }}
      animate={{
        opacity: isDimmed ? 0.4 : 1,
        y: 0,
        scale: isActive ? 1.04 : 1,
      }}
      transition={{ delay: activeIndex === null ? i * 0.14 : 0, duration: 0.7, ease: [0.22, 0.9, 0.3, 1] }}
      whileHover={{ y: -8 }}
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
        className={`relative mb-5 overflow-hidden rounded-2xl ${isThree ? "h-56" : "h-36"}`}
        style={{
          background:
            "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--amber) 26%, transparent), transparent 70%)",
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.0, 0.18, 0.0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          style={{
            background:
              "radial-gradient(50% 40% at 50% 65%, color-mix(in oklab, var(--tomato) 35%, transparent), transparent 70%)",
          }}
        />

        {/* Illustration: shown until the real photo loads (or if it fails). */}
        {(!photoLoaded || !showPhoto) && (
          <div className="absolute inset-0 grid place-items-center">
            <motion.img
              src={illustrationFallback}
              alt=""
              aria-hidden
              variants={heroVar}
              initial="initial"
              animate="animate"
              className={`object-contain ${isThree ? "h-48 w-48" : "h-32 w-32"}`}
              style={{ filter: "drop-shadow(0 18px 22px rgba(120,70,30,0.22))" }}
            />
          </div>
        )}

        {/* Real food photo */}
        {showPhoto && (
          <motion.img
            src={photoUrl}
            alt={meal.name}
            loading="lazy"
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoFailed(true)}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: photoLoaded ? 1 : 0, scale: photoLoaded ? 1 : 1.06 }}
            transition={{ duration: 0.7, ease: [0.22, 0.9, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "saturate(1.05)" }}
          />
        )}
      </div>

      <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: "var(--tomato)", fontWeight: 600 }}>
        {meal.cuisine}
      </p>
      <h3 className={`mt-1 font-display leading-tight ${isThree ? "text-3xl" : "text-2xl"}`}>{meal.name}</h3>

      {isThree && meal.description && (
        <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--ink-soft)" }}>
          {meal.description}
        </p>
      )}

      {isThree && facts.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {facts.slice(0, 3).map((fact, fi) => (
            <motion.li
              key={fi}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.14 + 0.35 + fi * 0.08, duration: 0.5 }}
              className="flex items-start gap-2 text-xs"
            >
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--tomato)" }} />
              <span style={{ color: "var(--ink-soft)" }}>{fact}</span>
            </motion.li>
          ))}
        </ul>
      )}

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
}

export { imageFor };

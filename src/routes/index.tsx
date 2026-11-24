import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, ChefHat } from "lucide-react";
import type { AppState, Meal } from "@/lib/types";
import {
  speak,
  stopSpeaking,
  startConversation,
  stopConversation,
  primeAudio,
  startMealGuide,
  startConfirm,
  startReviewConfirm,
  startPantryCheck,
} from "@/lib/speech";
import { getNutritionFacts, heroIngredient } from "@/lib/journey-foods";
import { FoodCollage } from "@/components/FoodCollage";
import { VoiceOrb } from "@/components/VoiceOrb";
import { MealCards, photoUrlFor } from "@/components/MealCards";
import { MealDetail } from "@/components/MealDetail";
import { MealReview } from "@/components/MealReview";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { CookingMode } from "@/components/CookingMode";
import { GroceryList } from "@/components/GroceryList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantry — Voice meal planning on a budget" },
      {
        name: "description",
        content:
          "Tell Pantry your budget. It plans your meals, builds your grocery list, and walks you through cooking, hands-free.",
      },
      { property: "og:title", content: "Pantry — Voice meal planning" },
      {
        property: "og:description",
        content: "Your voice-powered cooking companion.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: PantryApp,
});

const STATUS: Record<AppState, string> = {
  idle: "Tap to start",
  listening: "Listening…",
  confirming: "Did I get that right?",
  thinking: "Building your meal plan…",
  plan: "Pick a meal to dive in",
  detail: "Ready when you are",
  reviewing: "Take a closer look",
  checking: "Pantry check",
  grocery: "Your shopping list",
  cooking: "Cooking together",
};

function PantryApp() {
  const [state, setState] = useState<AppState>("idle");
  const [budget, setBudget] = useState<string | null>(null);
  const [rawRequest, setRawRequest] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<Meal | null>(null);
  const [haveSet, setHaveSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [narrationIndex, setNarrationIndex] = useState<number | null>(null);
  const [narrationLine, setNarrationLine] = useState<string>("");
  const [checkIndex, setCheckIndex] = useState(0);
  const narrationTimers = useRef<number[]>([]);

  // When entering the plan screen, auto-start the AI meal guide and keep it open.
  useEffect(() => {
    if (state !== "plan" || meals.length === 0) return;
    const mealsContext = meals
      .map(
        (m, i) =>
          `${i + 1}. ${m.name} — ${m.cuisine}, ${m.estimatedCost}, ${m.prepTimeMinutes} min. ` +
          `${m.description} ` +
          `Key ingredients: ${m.ingredients.slice(0, 5).map((x) => x.name).join(", ")}. ` +
          `Facts: ${(m.nutritionFacts ?? []).join(" / ")}`,
      )
      .join("\n");
    void startMealGuide({
      mealsContext,
      userRequest: rawRequest,
      onFocus: (idx) => setNarrationIndex(idx),
      onPick: (idx) => {
        const m = meals[idx];
        if (m) {
          stopConversation();
          setSelected(m);
          setNarrationIndex(null);
          setState("reviewing");
        }
      },
      onError: (msg) => setError(msg),
    });
    return () => {
      stopConversation();
      setNarrationIndex(null);
    };
  }, [state, meals]);

  const clearNarration = () => {
    narrationTimers.current.forEach((id) => window.clearTimeout(id));
    narrationTimers.current = [];
    stopSpeaking();
    setNarrationIndex(null);
    setNarrationLine("");
  };

  const startConvo = () => {
    primeAudio(); // unlock AudioContext during user gesture
    setError(null);
    setState("listening");
    startConversation({
      onReady: (bud, req) => {
        stopConversation();
        setBudget(bud);
        setRawRequest(req);
        // Speak the confirmation line FIRST, then reveal the card and start listening.
        speak(`Okay — so ${req}, for ${bud}. Want me to roll with that?`, {
          onend: () => {
            setState("confirming");
            void startConfirm({
              request: req,
              budget: bud,
              onYes: () => {
                stopConversation();
                void generateMeals(req, bud);
              },
              onNo: () => {
                stopConversation();
                startConvo();
              },
              onError: (msg) => setError(msg),
            });
          },
        });
      },
      onError: (msg) => {
        setState("idle");
        setError(msg);
      },
    }).catch((e) => {
      setState("idle");
      setError(e instanceof Error ? e.message : "Failed to start voice session.");
    });
  };

  const generateMeals = async (request: string, budgetStr: string | null) => {
    setState("thinking");
    const reqLine = (request || "that").trim();
    const budLine = (budgetStr || "your budget").trim();
    speak(
      `Love it. I'm curating three meals around "${reqLine}" for ${budLine} — give me just a minute.`,
    );
    setError(null);

    // Up to 3 client-side attempts on 429/503 with backoff, in case every model in the
    // server chain was rate-limited at the same moment.
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget: budgetStr ?? "", preferences: request }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
            const wait = 1500 * attempt; // 1.5s, 3s
            if (attempt === 1) {
              speak("Things are a little busy — giving it another shot.");
            }
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          if (res.status === 429)
            throw new Error("Pantry is rate-limited right now. Wait a moment and tap retry.");
          if (res.status === 402)
            throw new Error("AI credits exhausted. Add credits in workspace settings.");
          throw new Error(j.error || "Could not generate meals.");
        }
        const data = (await res.json()) as { meals: Meal[] };
        const top = (data.meals ?? []).slice(0, 3);
        if (top.length === 0) throw new Error("The model returned no meals. Try again.");
        const enriched = await enrichWithNutrition(top);
        setMeals(enriched);
        setState("plan");
        speak(`I found ${enriched.length} options. Take a look — and ask me anything.`);
        return;
      } catch (e) {
        if (attempt < maxAttempts) {
          // Network blip — retry once more.
          await new Promise((r) => setTimeout(r, 1200 * attempt));
          continue;
        }
        const msg = e instanceof Error ? e.message : "Something went wrong generating meals.";
        setError(msg);
        setState("confirming");
        speak("I couldn't reach the kitchen right now. Tap yes to try again.");
        return;
      }
    }
  };

  /** Look up Journey Foods nutrient facts for each meal's hero ingredient. */
  const enrichWithNutrition = async (input: Meal[]): Promise<Meal[]> => {
    return Promise.all(
      input.map(async (m) => {
        // Skip if already seeded
        if (m.nutritionFacts && m.nutritionFacts.length >= 2) return m;
        const hero = m.heroIngredient ?? heroIngredient(m.ingredients.map((i) => i.name));
        const facts = await getNutritionFacts(hero);
        return { ...m, heroIngredient: hero, nutritionFacts: facts };
      }),
    );
  };

  const toggleHave = (name: string) => {
    setHaveSet((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const pickMeal = (m: Meal) => {
    clearNarration();
    stopConversation();
    setSelected(m);
    setNarrationIndex(null);
    setState("reviewing");
    // Review-screen voice handoff is started by the useEffect that watches `selected`.
  };

  // Voice handoff on the review screen.
  useEffect(() => {
    if (state !== "reviewing" || !selected) return;
    const summary =
      `${selected.cuisine} | ${selected.estimatedCost} | ${selected.prepTimeMinutes} min | ` +
      `${selected.description}`;
    void startReviewConfirm({
      mealName: selected.name,
      mealSummary: summary,
      onYes: () => {
        stopConversation();
        startChecking();
      },
      onNo: () => {
        stopConversation();
        setSelected(null);
        setState("plan");
      },
      onError: (msg) => setError(msg),
    });
    return () => {
      stopConversation();
    };
  }, [state, selected]);

  const startChecking = () => {
    if (!selected) return;
    clearNarration();
    stopConversation();
    setHaveSet(new Set());
    setCheckIndex(0);
    setState("checking");
    // Voice flow is started by the useEffect watching `state==='checking'`.
  };

  // Voice handoff for the pantry check.
  useEffect(() => {
    if (state !== "checking" || !selected) return;
    void startPantryCheck({
      mealName: selected.name,
      ingredients: selected.ingredients.map((i) => ({ name: i.name, quantity: i.quantity })),
      onAnswer: (name, have) => {
        const idx = selected.ingredients.findIndex(
          (i) => i.name.toLowerCase() === name.toLowerCase(),
        );
        if (idx >= 0) {
          setCheckIndex((c) => Math.max(c, idx + 1));
          if (have) {
            setHaveSet((s) => {
              if (s.has(selected.ingredients[idx].name)) return s;
              const next = new Set(s);
              next.add(selected.ingredients[idx].name);
              return next;
            });
          }
        }
      },
      onDone: () => {
        stopConversation();
        // Always move to grocery so user can SMS the list (even if 0 missing).
        setState("grocery");
      },
      onError: (msg) => setError(msg),
    });
    return () => {
      stopConversation();
    };
  }, [state, selected]);

  const answerIngredient = (have: boolean) => {
    if (!selected) return;
    const ing = selected.ingredients[checkIndex];
    if (!ing) return;
    if (have) {
      setHaveSet((s) => {
        const next = new Set(s);
        next.add(ing.name);
        return next;
      });
    }
    const next = checkIndex + 1;
    setCheckIndex(next);
  };

  const finishChecking = () => {
    if (!selected) return;
    const need = selected.ingredients.filter((i) => !haveSet.has(i.name));
    setState(need.length === 0 ? "cooking" : "grocery");
  };

  const resetAll = () => {
    stopConversation();
    clearNarration();
    setMeals([]);
    setSelected(null);
    setHaveSet(new Set());
    setBudget(null);
    setRawRequest("");
    setCheckIndex(0);
    setState("idle");
  };

  const showHero =
    state === "idle" || state === "listening" || state === "confirming";

  return (
    <main className="relative z-10 min-h-screen overflow-hidden">
      {/* Top editorial bar */}
      <div className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 text-xs uppercase tracking-[0.28em]">
        <span className="font-semibold" style={{ color: "var(--tomato)" }}>Pantry — Issue 01</span>
        <span className="hidden sm:inline" style={{ color: "var(--ink-soft)" }}>
          Voice · Plan · Cook
        </span>
        <span style={{ color: "var(--ink-soft)" }}>Spring '26</span>
      </div>

      {/* HERO */}
      <AnimatePresence>
        {showHero && (
          <motion.section
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-6"
          >
            <FoodCollage
              blurred={state === "listening" || state === "confirming"}
              generating={false}
            />

            {/* Ambient warm-light pulse — responds to the conversation */}
            <AnimatePresence>
              {(state === "listening" || state === "confirming") && (
                <motion.div
                  key="ambient"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.35, 0.6, 0.35],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 50% at 50% 55%, color-mix(in oklab, var(--amber-glow) 55%, transparent), transparent 70%)",
                  }}
                  aria-hidden
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="eyebrow mb-4">A voice-led cookbook</p>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="font-display text-[clamp(4rem,12vw,9rem)] leading-[0.92] tracking-tight"
                style={{ color: "var(--ink)", fontWeight: 500 }}
              >
                Pant<span style={{ color: "var(--tomato)", fontStyle: "italic" }}>ry</span>.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
                className="mt-4 max-w-md text-base md:text-lg"
                style={{ color: "var(--ink-soft)" }}
              >
                Tell me your budget. I'll handle dinner — start to plate.
              </motion.p>

              {/* Confirming step */}
              <AnimatePresence mode="wait">
                {state === "confirming" ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.5, ease: [0.22, 0.9, 0.3, 1] }}
                    className="glass mt-10 w-full max-w-xl rounded-3xl px-8 py-8"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <p className="eyebrow">Confirm request</p>
                    {budget ? (
                      <>
                        <motion.div
                          initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          transition={{ duration: 0.6, ease: [0.22, 0.9, 0.3, 1], delay: 0.1 }}
                          className="mt-4 grid h-16 w-16 place-items-center rounded-2xl"
                          style={{
                            background:
                              "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--tomato) 22%, transparent), transparent 70%)",
                          }}
                        >
                          <ChefHat className="h-9 w-9" style={{ color: "var(--tomato)" }} />
                        </motion.div>
                        <p
                          className="mt-3 font-display text-3xl leading-snug md:text-4xl"
                          style={{ color: "var(--ink)" }}
                        >
                          You want{" "}
                          <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>
                            "{rawRequest}"
                          </span>
                          {" "}for{" "}
                          <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>
                            {budget}
                          </span>
                          . Sound right?
                        </p>

                        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              stopConversation();
                              void generateMeals(rawRequest || budget || "", budget);
                            }}
                            className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium tracking-wide transition-all hover:scale-[1.02]"
                            style={{
                              background: "var(--tomato)",
                              color: "var(--primary-foreground)",
                              boxShadow: "0 14px 30px -12px color-mix(in oklab, var(--tomato) 70%, transparent)",
                            }}
                          >
                            <Check className="h-4 w-4" /> Yes, that's right
                          </button>
                          <button
                            onClick={() => {
                              stopConversation();
                              startConvo();
                            }}
                            className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium hover:bg-card"
                            style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)", color: "var(--ink)" }}
                          >
                            <X className="h-4 w-4" /> No, change it
                          </button>
                        </div>

                        <p className="mt-5 text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--ink-soft)" }}>
                          Say "yes" or "no" — I'm listening.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 font-display text-3xl leading-snug md:text-4xl" style={{ color: "var(--ink)" }}>
                          What's your budget?
                        </p>
                        <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                          "{rawRequest}"
                        </p>

                        <p className="mt-5 text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--ink-soft)" }}>
                          Speak your update, then confirm.
                        </p>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="orb"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="my-12"
                  >
                    <VoiceOrb state={state} onClick={() => startConvo()} />
                  </motion.div>
                )}
              </AnimatePresence>

              {state !== "confirming" && (
                <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>
                  {STATUS[state]}
                </p>
              )}

              {error && (
                <p className="mt-4 max-w-md text-sm" style={{ color: "var(--tomato)" }}>
                  {error}
                </p>
              )}

              {/* Keyboard is rendered as a centered overlay outside this column. */}
            </div>

            {/* Editorial footer rule */}
            <div className="absolute inset-x-0 bottom-6 mx-auto max-w-6xl px-6">
              <div className="editorial-rule" />
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em]"
                   style={{ color: "var(--ink-soft)" }}>
                <span>No. 001 · Hands-free</span>
                <span>Eat well. Spend less.</span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* THINKING — dedicated curation loading screen. */}
      <AnimatePresence>
        {state === "thinking" && (
          <motion.section
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5 }}
            className="relative flex min-h-screen flex-col items-center justify-center px-6"
          >
            {/* Ambient warm pulse */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.45, 0.8, 0.45] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 50%, color-mix(in oklab, var(--amber-glow) 65%, transparent), transparent 70%)",
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="eyebrow mb-6" style={{ color: "var(--tomato)" }}>
                Curating your menu
              </p>

              {/* Orbiting ingredient dots */}
              <div className="relative h-40 w-40">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--tomato) 35%, transparent), transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const r = 70;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    return (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          background: i % 2 === 0 ? "var(--tomato)" : "var(--amber-glow)",
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                        animate={{ scale: [0.8, 1.3, 0.8] }}
                        transition={{
                          duration: 1.6,
                          repeat: Infinity,
                          delay: i * 0.18,
                          ease: "easeInOut",
                        }}
                      />
                    );
                  })}
                </motion.div>
                <motion.div
                  className="absolute inset-0 grid place-items-center"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 0.9, 0.3, 1] }}
                >
                  <ChefHat className="h-10 w-10" style={{ color: "var(--tomato)" }} />
                </motion.div>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="mt-10 font-display text-4xl leading-tight md:text-5xl"
                style={{ color: "var(--ink)", fontWeight: 500 }}
              >
                Curating three meals around{" "}
                <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>
                  “{rawRequest || "your request"}”
                </span>
                {budget && (
                  <>
                    {" "}for{" "}
                    <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>{budget}</span>
                  </>
                )}
                .
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-5 max-w-md text-base md:text-lg"
                style={{ color: "var(--ink-soft)" }}
              >
                Hang tight — I'm pairing flavors, checking prices, and pulling fresh nutrition
                facts. Just a minute.
              </motion.p>

              {/* Step shimmer */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {["Sketching dishes", "Pricing ingredients", "Tuning nutrition"].map((label, i) => (
                  <motion.span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.22em]"
                    style={{
                      borderColor: "color-mix(in oklab, var(--ink) 14%, transparent)",
                      color: "var(--ink-soft)",
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: i * 0.35,
                      ease: "easeInOut",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--tomato)" }}
                    />
                    {label}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* PLAN — minimal: just the 3 meals, Pantry talks. */}
      <AnimatePresence>
        {state === "plan" && (
          <motion.section
            key="plan"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="relative flex min-h-screen items-center justify-center overflow-hidden py-12"
          >
            {/* Backdrop: blurred photo of the meal Pantry is currently talking about. */}
            <AnimatePresence mode="wait">
              {narrationIndex !== null && meals[narrationIndex] && (
                <motion.div
                  key={`bg-${narrationIndex}`}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 0.55, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.22, 0.9, 0.3, 1] }}
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `url(${photoUrlFor(meals[narrationIndex])})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(48px) saturate(1.15)",
                  }}
                  aria-hidden
                />
              )}
            </AnimatePresence>
            {/* Soft cream wash so cards stay legible over the blurred photo. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 50%, color-mix(in oklab, var(--cream) 70%, transparent), color-mix(in oklab, var(--cream) 92%, transparent) 80%)",
              }}
            />
            {/* Small floating reset */}
            <button
              onClick={resetAll}
              className="absolute right-6 top-6 z-10 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-card"
              style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)", color: "var(--ink-soft)" }}
            >
              Start over
            </button>
            <div className="relative z-10 w-full">
              <MealCards meals={meals} onSelect={pickMeal} activeIndex={narrationIndex} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* REVIEWING */}
      <AnimatePresence>
        {state === "reviewing" && selected && (
          <motion.section
            key="reviewing"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-screen py-16"
          >
            <MealReview
              meal={selected}
              onBack={() => { clearNarration(); setState("plan"); }}
              onConfirm={startChecking}
              onDecline={() => { clearNarration(); setState("plan"); }}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* CHECKING ingredients */}
      <AnimatePresence>
        {state === "checking" && selected && (
          <motion.section
            key="checking"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-screen py-16"
          >
            <IngredientChecklist
              meal={selected}
              index={checkIndex}
              haveSet={haveSet}
              onAnswer={answerIngredient}
              onBack={() => { clearNarration(); setState("reviewing"); }}
              onFinish={finishChecking}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* DETAIL (legacy, used outside demo flow) */}
      <AnimatePresence>
        {state === "detail" && selected && (
          <motion.section
            key="detail"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-screen py-16"
          >
            <MealDetail
              meal={selected}
              onBack={() => setState("plan")}
              onStartCooking={() => setState("cooking")}
              onShowGrocery={() => setState("grocery")}
              haveSet={haveSet}
              toggleHave={toggleHave}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* GROCERY */}
      <AnimatePresence>
        {state === "grocery" && selected && (
          <motion.section
            key="grocery"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-screen py-16"
          >
            <GroceryList
              meal={selected}
              haveSet={haveSet}
              onBack={() => setState("checking")}
            />
            <div className="mx-auto mt-8 flex max-w-3xl justify-end px-6">
              <button
                onClick={() => setState("cooking")}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium tracking-wide hover:scale-[1.03] transition-transform"
                style={{
                  background: "var(--tomato)",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 14px 30px -12px color-mix(in oklab, var(--tomato) 70%, transparent)",
                }}
              >
                Start cooking →
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* COOKING */}
      <AnimatePresence>
        {state === "cooking" && selected && (
          <motion.section
            key="cooking"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-screen py-16"
          >
            <CookingMode meal={selected} onExit={() => setState("reviewing")} />
          </motion.section>
        )}
      </AnimatePresence>

    </main>
  );
}

function Header({
  eyebrow,
  title,
  subtitle,
  onReset,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 font-display text-5xl leading-none md:text-6xl" style={{ color: "var(--ink)" }}>
            {title}
          </h2>
          <p className="mt-3 max-w-xl" style={{ color: "var(--ink-soft)" }}>{subtitle}</p>
        </div>
        <button
          onClick={onReset}
          className="hidden shrink-0 rounded-full border px-4 py-2 text-sm hover:bg-card sm:inline-flex"
          style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)", color: "var(--ink)" }}
        >
          Start over
        </button>
      </div>
      <div className="editorial-rule mt-6" />
    </div>
  );
}

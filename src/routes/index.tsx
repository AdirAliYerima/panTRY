import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Keyboard, Send, Check, X, Mic, Sparkles } from "lucide-react";
import type { AppState, Meal } from "@/lib/types";
import { getRecognition, speak, stopSpeaking } from "@/lib/speech";
import { FoodCollage } from "@/components/FoodCollage";
import { VoiceOrb } from "@/components/VoiceOrb";
import { MealCards } from "@/components/MealCards";
import { MealDetail } from "@/components/MealDetail";
import { MealReview } from "@/components/MealReview";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { CookingMode } from "@/components/CookingMode";
import { GroceryList } from "@/components/GroceryList";
import { DEMO_MEALS } from "@/lib/demo";

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

/** Parse a dollar budget from natural speech. Returns formatted "$30" or null. */
function parseBudget(s: string): string | null {
  const cleaned = s.toLowerCase().replace(/,/g, "");
  const m = cleaned.match(/\$?\s*(\d{1,5})(?:\s*(?:dollars|bucks|usd))?/);
  if (m) return `$${m[1]}`;
  const words: Record<string, number> = {
    ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  };
  for (const k of Object.keys(words)) if (cleaned.includes(k)) return `$${words[k]}`;
  return null;
}

function PantryApp() {
  const [state, setState] = useState<AppState>("idle");
  const [transcript, setTranscript] = useState("");
  const [budget, setBudget] = useState<string | null>(null);
  const [rawRequest, setRawRequest] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selected, setSelected] = useState<Meal | null>(null);
  const [haveSet, setHaveSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const recRef = useRef<ReturnType<typeof getRecognition>>(null);

  useEffect(() => {
    recRef.current = getRecognition();
  }, []);

  const generateMeals = async (utterance: string) => {
    setState("thinking");
    speak("Perfect. Let me put together a few options for you.");
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: utterance, preferences: utterance }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("Rate limit hit — try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
        throw new Error(j.error || "Could not generate meals.");
      }
      const data = (await res.json()) as { meals: Meal[] };
      setMeals(data.meals);
      setState("plan");
      speak(`I found ${data.meals.length} options. Take a look and pick what sounds good.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setState("idle");
      speak("I ran into a problem. Please try again.");
    }
  };

  /** After we capture the user's request, repeat the budget back and ask to confirm. */
  const askConfirm = (utterance: string) => {
    const b = parseBudget(utterance) ?? "$30";
    setBudget(b);
    setRawRequest(utterance);
    setState("confirming");
    speak(`Just to confirm — your budget is ${b}. Does that sound right?`);
  };

  const startListening = (mode: "intake" | "confirm" = "intake") => {
    setError(null);
    const rec = recRef.current;
    if (!rec) {
      setShowText(true);
      return;
    }
    if (state === "listening") {
      rec.stop();
      return;
    }
    setTranscript("");
    setState("listening");
    stopSpeaking();
    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final + interim);
    };
    rec.onend = () => {
      const text = (final || transcript).trim();
      if (!text) {
        setState(mode === "confirm" ? "confirming" : "idle");
        return;
      }
      if (mode === "confirm") {
        const lower = text.toLowerCase();
        if (/(yes|yeah|yep|yup|correct|right|sure|confirm)/.test(lower)) {
          generateMeals(rawRequest || text);
        } else if (/(no|nope|wrong|change)/.test(lower)) {
          setState("idle");
          speak("Okay, tell me your budget again.");
        } else {
          // Treat any new utterance as a fresh budget
          askConfirm(text);
        }
      } else {
        askConfirm(text);
      }
    };
    rec.onerror = () => {
      setState(mode === "confirm" ? "confirming" : "idle");
      setError("Microphone unavailable. Try typing instead.");
      setShowText(true);
    };
    try {
      rec.start();
    } catch {
      setState(mode === "confirm" ? "confirming" : "idle");
    }
  };

  const submitText = () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    setShowText(false);
    setTranscript(t);
    askConfirm(t);
  };

  const toggleHave = (name: string) => {
    setHaveSet((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  /** Demo: jump straight into a fully populated meal plan so designers
   *  can preview the plan/detail/grocery/cooking screens. */
  const loadDemo = (target: AppState = "plan") => {
    stopSpeaking();
    setError(null);
    setBudget("$30");
    setRawRequest("$30 for the week, mostly vegetarian, easy weeknight meals");
    setMeals(DEMO_MEALS);
    setSelected(DEMO_MEALS[0]);
    setHaveSet(new Set(["Olive oil", "Garlic", "Yellow onion"]));
    setState(target);
  };

  const showHero =
    state === "idle" || state === "listening" || state === "thinking" || state === "confirming";

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
              generating={state === "thinking"}
            />

            {/* Ambient warm-light pulse — responds to the conversation */}
            <AnimatePresence>
              {(state === "listening" || state === "thinking" || state === "confirming") && (
                <motion.div
                  key="ambient"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: state === "thinking" ? [0.55, 0.85, 0.55] : [0.35, 0.6, 0.35],
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
                    <p className="eyebrow">Confirm budget</p>
                    <p
                      className="mt-3 font-display text-3xl leading-snug md:text-4xl"
                      style={{ color: "var(--ink)" }}
                    >
                      Your budget is{" "}
                      <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>
                        {budget}
                      </span>
                      . Does that sound right?
                    </p>
                    <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                      "{rawRequest}"
                    </p>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => generateMeals(rawRequest || budget || "")}
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
                          setState("idle");
                          speak("Okay, tell me your budget again.");
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium hover:bg-card"
                        style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)", color: "var(--ink)" }}
                      >
                        <X className="h-4 w-4" /> No, change it
                      </button>
                      <button
                        onClick={() => startListening("confirm")}
                        aria-label="Reply by voice"
                        className="grid h-11 w-11 place-items-center rounded-full border hover:bg-card"
                        style={{ borderColor: "color-mix(in oklab, var(--ink) 18%, transparent)", color: "var(--ink)" }}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-5 text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--ink-soft)" }}>
                      Say "yes" or "no" — I'm listening.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="orb"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="my-12"
                  >
                    <VoiceOrb state={state} onClick={() => startListening("intake")} />
                  </motion.div>
                )}
              </AnimatePresence>

              {state !== "confirming" && (
                <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--ink-soft)" }}>
                  {STATUS[state]}
                </p>
              )}

              <AnimatePresence>
                {transcript && (state === "listening" || state === "thinking") && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 max-w-xl font-display text-xl italic"
                    style={{ color: "var(--ink)" }}
                  >
                    "{transcript}"
                  </motion.p>
                )}
              </AnimatePresence>

              {error && (
                <p className="mt-4 max-w-md text-sm" style={{ color: "var(--tomato)" }}>
                  {error}
                </p>
              )}

              {state !== "confirming" && (
                <div className="mt-6 flex items-center gap-5">
                  <button
                    onClick={() => setShowText((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] hover:text-foreground"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                    {showText ? "Hide keyboard" : "Or type instead"}
                  </button>
                  <span className="h-3 w-px" style={{ background: "color-mix(in oklab, var(--ink) 18%, transparent)" }} />
                  <button
                    onClick={() => loadDemo("plan")}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] hover:text-foreground"
                    style={{ color: "var(--tomato)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    See a sample plan
                  </button>
                </div>
              )}

              {/* Reserved slot — keyboard floats in/out without pushing layout */}
              <div className="relative mt-4 h-14 w-full max-w-xl">
                <AnimatePresence>
                  {showText && state !== "confirming" && (
                    <motion.form
                      key="kbd"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.45, ease: [0.22, 0.9, 0.3, 1] }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitText();
                      }}
                      className="absolute inset-x-0 top-0 flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-md"
                      style={{
                        borderColor: "color-mix(in oklab, var(--ink) 14%, transparent)",
                        background: "color-mix(in oklab, var(--card) 95%, transparent)",
                        boxShadow: "0 18px 40px -22px rgba(60,40,20,0.32)",
                      }}
                    >
                      <input
                        autoFocus
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="$30 for dinner this week, vegetarian, easy…"
                        className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                        style={{ color: "var(--ink)" }}
                      />
                      <button
                        type="submit"
                        className="grid h-9 w-9 place-items-center rounded-full"
                        style={{ background: "var(--tomato)", color: "var(--primary-foreground)" }}
                        aria-label="Send"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
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

      {/* PLAN */}
      <AnimatePresence>
        {state === "plan" && (
          <motion.section
            key="plan"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="relative min-h-screen py-16"
          >
            <Header
              eyebrow="Your meal plan"
              title="Four ideas, on budget"
              subtitle="Tap any meal to see ingredients, costs, and step-by-step cooking."
              onReset={() => {
                setMeals([]);
                setSelected(null);
                setHaveSet(new Set());
                setBudget(null);
                setRawRequest("");
                setState("idle");
              }}
            />
            <div className="mt-10">
              <MealCards meals={meals} onSelect={(m) => { setSelected(m); setState("detail"); }} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* DETAIL */}
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
            <GroceryList meal={selected} haveSet={haveSet} onBack={() => setState("detail")} />
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
            <CookingMode meal={selected} onExit={() => setState("detail")} />
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

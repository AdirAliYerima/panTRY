import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Keyboard, Send } from "lucide-react";
import type { AppState, Meal } from "@/lib/types";
import { getRecognition, speak, stopSpeaking } from "@/lib/speech";
import { FoodCollage } from "@/components/FoodCollage";
import { VoiceOrb } from "@/components/VoiceOrb";
import { MealCards } from "@/components/MealCards";
import { MealDetail } from "@/components/MealDetail";
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
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: PantryApp,
});

const STATUS: Record<AppState, string> = {
  idle: "Tap to start",
  listening: "Listening…",
  thinking: "Building your meal plan…",
  plan: "Pick a meal to dive in",
  detail: "Ready when you are",
  grocery: "Your shopping list",
  cooking: "Cooking together",
};

function PantryApp() {
  const [state, setState] = useState<AppState>("idle");
  const [transcript, setTranscript] = useState("");
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
    speak("Let me put together a few options for you.");
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: utterance,
          preferences: utterance,
        }),
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

  const startListening = () => {
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
      if (text.length > 0) {
        generateMeals(text);
      } else {
        setState("idle");
      }
    };
    rec.onerror = () => {
      setState("idle");
      setError("Microphone unavailable. Try typing instead.");
      setShowText(true);
    };
    try {
      rec.start();
    } catch {
      setState("idle");
    }
  };

  const submitText = () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    setShowText(false);
    setTranscript(t);
    generateMeals(t);
  };

  const toggleHave = (name: string) => {
    setHaveSet((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const showHero = state === "idle" || state === "listening" || state === "thinking";

  return (
    <main className="relative z-10 min-h-screen overflow-hidden">
      {/* HERO */}
      <AnimatePresence>
        {showHero && (
          <motion.section
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6"
          >
            <FoodCollage blurred={state === "listening" || state === "thinking"} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="font-display text-7xl leading-none tracking-tight md:text-8xl"
                style={{ color: "var(--cream)" }}
              >
                Pantry
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
                className="mt-3 max-w-md text-base text-muted-foreground md:text-lg"
              >
                Tell me your budget. I'll handle dinner.
              </motion.p>

              <div className="my-12">
                <VoiceOrb state={state} onClick={startListening} />
              </div>

              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                {STATUS[state]}
              </p>

              <AnimatePresence>
                {transcript && (state === "listening" || state === "thinking") && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 max-w-xl font-display text-xl italic"
                    style={{ color: "var(--cream)" }}
                  >
                    "{transcript}"
                  </motion.p>
                )}
              </AnimatePresence>

              {error && (
                <p className="mt-4 max-w-md text-sm" style={{ color: "#f3a878" }}>
                  {error}
                </p>
              )}

              <button
                onClick={() => setShowText((v) => !v)}
                className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <Keyboard className="h-3.5 w-3.5" />
                {showText ? "Hide keyboard" : "Or type instead"}
              </button>

              <AnimatePresence>
                {showText && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitText();
                    }}
                    className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 backdrop-blur"
                  >
                    <input
                      autoFocus
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="$30 for dinner this week, vegetarian, easy…"
                      className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      className="grid h-9 w-9 place-items-center rounded-full"
                      style={{ background: "var(--amber)", color: "var(--forest-deep)" }}
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
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
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--amber)" }}>
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-5xl leading-none md:text-6xl">{title}</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        </div>
        <button
          onClick={onReset}
          className="hidden shrink-0 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-amber/60 sm:inline-flex"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

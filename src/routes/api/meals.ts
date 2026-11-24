import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { getGoogleApiKey, GOOGLE_GENERATIVE_BASE } from "@/lib/ai-gateway";

const MEAL_MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SYSTEM_PROMPT =
  "You are Pantry, a warm, savvy meal planning assistant focused on delicious, budget-friendly home cooking. " +
  "CRITICAL: every meal you suggest MUST honor the user's stated request — their cuisine, dietary restrictions, mood, ingredients they mentioned, time/serving constraints, and total budget. Never contradict them. " +
  "If they said vegetarian, all 3 meals are vegetarian. If they asked for Italian comfort food on $20, all 3 are Italian comfort dishes that together fit $20. If they named ingredients they want or want to avoid, respect that. " +
  "Within those constraints, make the 3 meals meaningfully distinct from each other (different mains/techniques/feel) — but never break the user's request to add variety. " +
  "Generate realistic ingredient costs in USD. Steps must be clear and concise. " +
  "For each meal include heroIngredient (one short ingredient name), an imagePrompt " +
  "(a vivid 6–12 word food-photography description of THIS dish plated, used to fetch a real image), " +
  "and 3 short, varied nutritionFacts strings " +
  "(one per dominant ingredient, ~10 words each).";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    meals: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          cuisine: { type: "STRING" },
          estimatedCost: { type: "STRING", description: "Like '$8.50'" },
          prepTimeMinutes: { type: "INTEGER" },
          servings: { type: "INTEGER" },
          description: { type: "STRING" },
          heroIngredient: { type: "STRING" },
          imagePrompt: {
            type: "STRING",
            description:
              "A vivid 6–12 word food-photography prompt of THIS plated dish, e.g. 'overhead shot of creamy mushroom risotto in a white bowl, garnished with parsley'. No camera/lens jargon.",
          },
          nutritionFacts: {
            type: "ARRAY",
            minItems: 3,
            maxItems: 3,
            items: { type: "STRING" },
          },
          ingredients: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                quantity: { type: "STRING" },
                estimatedCost: { type: "STRING" },
                category: {
                  type: "STRING",
                  enum: ["Produce", "Proteins", "Pantry", "Dairy", "Other"],
                },
              },
              required: ["name", "quantity", "estimatedCost", "category"],
            },
          },
          nutrition: {
            type: "OBJECT",
            properties: {
              calories: { type: "INTEGER" },
              proteinG: { type: "INTEGER" },
              carbsG: { type: "INTEGER" },
              fatG: { type: "INTEGER" },
            },
            required: ["calories", "proteinG", "carbsG", "fatG"],
          },
          steps: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                instruction: { type: "STRING" },
                timerMinutes: { type: "INTEGER", nullable: true },
              },
              required: ["instruction"],
            },
          },
        },
        required: [
          "name",
          "cuisine",
          "estimatedCost",
          "prepTimeMinutes",
          "servings",
          "description",
          "heroIngredient",
          "imagePrompt",
          "nutritionFacts",
          "ingredients",
          "nutrition",
          "steps",
        ],
      },
    },
  },
  required: ["meals"],
};

export const Route = createFileRoute("/api/meals")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          budget?: string;
          preferences?: string;
        };

        const key = getGoogleApiKey();
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userPrompt =
          `The user just told Pantry, in their own words:\n` +
          `  "${(body.preferences ?? "").trim() || "easy weeknight dinner"}"\n\n` +
          `Budget: ${(body.budget ?? "").trim() || "around $30 total"}\n\n` +
          `Generate EXACTLY 3 meals that fully honor that request — same cuisine/diet/mood/ingredients the user named — ` +
          `together fitting within the budget. Use real ingredient prices in USD. ` +
          `Make the 3 meals distinct from each other within those constraints. ` +
          `Return JSON only, matching the schema.`;

        const url = (model: string) =>
          `${GOOGLE_GENERATIVE_BASE}/models/${encodeURIComponent(model)}:generateContent` +
          `?key=${encodeURIComponent(key)}`;

        const reqBody = JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        });

        // Try each model in the chain. For each model, retry once on 429/503 with backoff.
        let lastStatus = 0;
        let lastBody = "";
        let res: Response | null = null;

        outer: for (const model of MEAL_MODEL_CHAIN) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const r = await fetch(url(model), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: reqBody,
              });
              if (r.ok) {
                res = r;
                break outer;
              }
              lastStatus = r.status;
              lastBody = await r.text().catch(() => "");
              // 429 = rate limit, 503 = overloaded — retry once, then fall through to next model.
              if (r.status === 429 || r.status === 503) {
                if (attempt === 0) {
                  await sleep(800 + Math.random() * 600);
                  continue;
                }
                break; // try next model
              }
              // Other errors (400 schema, 401 auth, etc.) — don't bother with other models.
              break outer;
            } catch (e) {
              lastStatus = 500;
              lastBody = e instanceof Error ? e.message : "network error";
              break;
            }
          }
        }

        try {
          if (!res) {
            return new Response(
              JSON.stringify({ error: lastBody || `Generation failed (${lastStatus})` }),
              {
                status: lastStatus || 502,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const j = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };

          const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (!raw) {
            return new Response(
              JSON.stringify({ error: "No text output from model" }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) {
              return new Response(
                JSON.stringify({ error: "Model returned non-JSON output" }),
                { status: 502, headers: { "Content-Type": "application/json" } },
              );
            }
            parsed = JSON.parse(m[0]);
          }

          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const e = err as Error;
          return new Response(JSON.stringify({ error: e.message ?? "AI request failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

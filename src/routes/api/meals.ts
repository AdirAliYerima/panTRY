import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const MealSchema = z.object({
  name: z.string(),
  cuisine: z.string(),
  estimatedCost: z.string().describe("Cost estimate like '$8.50'"),
  prepTimeMinutes: z.number(),
  servings: z.number(),
  description: z.string().describe("One sentence enticing description"),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      estimatedCost: z.string(),
      category: z.enum(["Produce", "Proteins", "Pantry", "Dairy", "Other"]),
    }),
  ),
  nutrition: z.object({
    calories: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  steps: z.array(
    z.object({
      instruction: z.string(),
      timerMinutes: z.number().nullable(),
    }),
  ),
});

const ResponseSchema = z.object({
  meals: z.array(MealSchema).min(3).max(4),
});

export const Route = createFileRoute("/api/meals")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          budget?: string;
          preferences?: string;
        };

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const { output } = await generateText({
            model,
            output: Output.object({ schema: ResponseSchema }),
            system:
              "You are Pantry, a warm, savvy meal planning assistant focused on delicious, budget-friendly home cooking. Generate realistic ingredient costs in USD. Steps must be clear and concise. Provide 4 distinct meal options that fit the user's budget and preferences.",
            prompt: `Budget: ${body.budget ?? "moderate"}\nPreferences: ${body.preferences ?? "anything tasty for dinner"}\n\nGenerate 4 meal options that fit comfortably within the budget. Vary cuisines. Keep ingredient lists realistic.`,
          });

          return Response.json(output);
        } catch (err) {
          const e = err as { statusCode?: number; message?: string };
          const status = e?.statusCode ?? 500;
          return new Response(
            JSON.stringify({ error: e?.message ?? "AI request failed" }),
            { status, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

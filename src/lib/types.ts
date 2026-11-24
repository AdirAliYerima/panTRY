export type Ingredient = {
  name: string;
  quantity: string;
  estimatedCost: string;
  category: "Produce" | "Proteins" | "Pantry" | "Dairy" | "Other";
};

export type Step = {
  instruction: string;
  timerMinutes: number | null;
};

export type Meal = {
  name: string;
  cuisine: string;
  estimatedCost: string;
  prepTimeMinutes: number;
  servings: number;
  description: string;
  ingredients: Ingredient[];
  nutrition: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  /** 2-3 short nutritional / ingredient facts shown on the meal card. */
  nutritionFacts?: string[];
  /** Hero ingredient used to drive card animation + fact lookup. */
  heroIngredient?: string;
  /** Short, descriptive food-photography prompt used to fetch a meal image. */
  imagePrompt?: string;
  steps: Step[];
};

export type AppState =
  | "idle"
  | "listening"
  | "confirming"
  | "thinking"
  | "plan"
  | "detail"
  | "reviewing"
  | "checking"
  | "grocery"
  | "cooking";

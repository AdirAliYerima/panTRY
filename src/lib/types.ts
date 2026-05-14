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
  steps: Step[];
};

export type AppState =
  | "idle"
  | "listening"
  | "thinking"
  | "plan"
  | "detail"
  | "grocery"
  | "cooking";

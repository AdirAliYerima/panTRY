import type { Meal } from "./types";

/** Hand-tuned sample meal plan so designers can preview every screen
 *  without waiting for the AI to respond. */
export const DEMO_MEALS: Meal[] = [
  {
    name: "Tuscan White Bean Soup",
    cuisine: "Italian",
    estimatedCost: "$7",
    prepTimeMinutes: 35,
    servings: 4,
    description:
      "A rustic, garlicky soup with cannellini beans, lacinato kale, and a swirl of good olive oil. Eats like a hug.",
    ingredients: [
      { name: "Cannellini beans", quantity: "2 cans (15 oz)", estimatedCost: "$2.40", category: "Pantry" },
      { name: "Lacinato kale", quantity: "1 bunch", estimatedCost: "$2.00", category: "Produce" },
      { name: "Yellow onion", quantity: "1 large", estimatedCost: "$0.60", category: "Produce" },
      { name: "Garlic", quantity: "4 cloves", estimatedCost: "$0.30", category: "Produce" },
      { name: "Vegetable broth", quantity: "4 cups", estimatedCost: "$1.20", category: "Pantry" },
      { name: "Olive oil", quantity: "3 tbsp", estimatedCost: "$0.40", category: "Pantry" },
      { name: "Crusty sourdough", quantity: "½ loaf", estimatedCost: "$1.80", category: "Pantry" },
    ],
    nutrition: { calories: 380, proteinG: 16, carbsG: 52, fatG: 11 },
    heroIngredient: "Cannellini beans",
    nutritionFacts: [
      "Cannellini beans: 14g plant protein per cup",
      "Kale brings vitamins K, A & C in one leaf",
      "Olive oil — heart-healthy monounsaturated fats",
    ],
    steps: [
      { instruction: "Warm olive oil in a heavy pot. Add diced onion and a pinch of salt; cook until translucent.", timerMinutes: 6 },
      { instruction: "Stir in minced garlic and a few grinds of black pepper. Cook just until fragrant — don't let it brown.", timerMinutes: 1 },
      { instruction: "Pour in broth and beans (with their liquid). Bring to a gentle simmer.", timerMinutes: 10 },
      { instruction: "Smash a quarter of the beans against the side of the pot to thicken the broth.", timerMinutes: null },
      { instruction: "Tear kale into bite-size pieces, stir in, and simmer until tender and silky.", timerMinutes: 8 },
      { instruction: "Taste, adjust salt, and finish with a generous drizzle of olive oil. Serve with sourdough.", timerMinutes: null },
    ],
  },
  {
    name: "Lemon Herb Pasta",
    cuisine: "Italian",
    estimatedCost: "$6",
    prepTimeMinutes: 20,
    servings: 4,
    description:
      "Bright, peppery, and ready in twenty. Fresh basil and parsley, a hit of lemon, and lots of grated parmesan.",
    ingredients: [
      { name: "Spaghetti", quantity: "1 lb", estimatedCost: "$1.50", category: "Pantry" },
      { name: "Lemon", quantity: "2", estimatedCost: "$1.00", category: "Produce" },
      { name: "Fresh basil", quantity: "1 bunch", estimatedCost: "$2.00", category: "Produce" },
      { name: "Flat-leaf parsley", quantity: "½ bunch", estimatedCost: "$1.00", category: "Produce" },
      { name: "Parmesan", quantity: "½ cup grated", estimatedCost: "$2.50", category: "Dairy" },
      { name: "Olive oil", quantity: "¼ cup", estimatedCost: "$0.50", category: "Pantry" },
    ],
    nutrition: { calories: 520, proteinG: 18, carbsG: 78, fatG: 16 },
    heroIngredient: "Spaghetti",
    nutritionFacts: [
      "Slow-release carbs — sustained energy",
      "Lemon: vitamin C powerhouse, zero sugar",
      "Parmesan packs calcium + umami",
    ],
    steps: [
      { instruction: "Bring a large pot of well-salted water to a rolling boil.", timerMinutes: 8 },
      { instruction: "Cook spaghetti until just shy of al dente. Reserve a mug of pasta water before draining.", timerMinutes: 9 },
      { instruction: "In a wide pan, warm olive oil with lemon zest over low heat for a minute.", timerMinutes: 1 },
      { instruction: "Add pasta, lemon juice, and a splash of pasta water. Toss vigorously to emulsify.", timerMinutes: null },
      { instruction: "Off the heat, fold in chopped herbs and parmesan. Serve immediately.", timerMinutes: null },
    ],
  },
  {
    name: "Garden Frittata",
    cuisine: "Mediterranean",
    estimatedCost: "$5",
    prepTimeMinutes: 25,
    servings: 4,
    description:
      "Eggs, soft sweet onion, cherry tomatoes, and a snowfall of feta. Brunch energy any night of the week.",
    ingredients: [
      { name: "Large eggs", quantity: "8", estimatedCost: "$2.40", category: "Dairy" },
      { name: "Cherry tomatoes", quantity: "1 pint", estimatedCost: "$2.50", category: "Produce" },
      { name: "Feta cheese", quantity: "½ cup", estimatedCost: "$2.00", category: "Dairy" },
      { name: "Yellow onion", quantity: "1 small", estimatedCost: "$0.40", category: "Produce" },
      { name: "Butter", quantity: "1 tbsp", estimatedCost: "$0.30", category: "Dairy" },
    ],
    nutrition: { calories: 310, proteinG: 22, carbsG: 8, fatG: 22 },
    heroIngredient: "Eggs",
    nutritionFacts: [
      "Eggs: complete protein, all 9 essential amino acids",
      "Tomatoes — lycopene & vitamin C",
      "Feta: lower-fat cheese with calcium boost",
    ],
    steps: [
      { instruction: "Preheat oven to 375°F. Whisk eggs with salt, pepper, and a splash of water until uniform.", timerMinutes: null },
      { instruction: "Melt butter in an oven-safe skillet. Soften the onion slowly until just sweet.", timerMinutes: 7 },
      { instruction: "Scatter halved tomatoes across the pan. Pour in the eggs and crumble feta on top.", timerMinutes: null },
      { instruction: "Transfer to the oven and bake until just set in the center.", timerMinutes: 12 },
      { instruction: "Slide onto a board, slice into wedges, and serve warm or at room temperature.", timerMinutes: null },
    ],
  },
  {
    name: "Avocado Sourdough Toast",
    cuisine: "Cafe",
    estimatedCost: "$4",
    prepTimeMinutes: 10,
    servings: 2,
    description:
      "Thick-cut sourdough, smashed avocado, lemon, chili flakes, and a soft jammy egg. The perfect quick supper.",
    ingredients: [
      { name: "Sourdough", quantity: "4 thick slices", estimatedCost: "$1.80", category: "Pantry" },
      { name: "Ripe avocado", quantity: "2", estimatedCost: "$2.00", category: "Produce" },
      { name: "Lemon", quantity: "1", estimatedCost: "$0.50", category: "Produce" },
      { name: "Eggs", quantity: "2", estimatedCost: "$0.60", category: "Dairy" },
      { name: "Chili flakes", quantity: "Pinch", estimatedCost: "$0.10", category: "Pantry" },
    ],
    nutrition: { calories: 420, proteinG: 14, carbsG: 38, fatG: 24 },
    heroIngredient: "Avocado",
    nutritionFacts: [
      "Avocado: heart-healthy monounsaturated fats",
      "Sourdough — fermented, easier on the gut",
      "Eggs deliver choline for brain health",
    ],
    steps: [
      { instruction: "Toast the sourdough until deeply golden and crisp on the edges.", timerMinutes: 4 },
      { instruction: "Smash avocado with lemon juice and a generous pinch of flaky salt.", timerMinutes: null },
      { instruction: "Soft-boil eggs (start in boiling water, set timer).", timerMinutes: 7 },
      { instruction: "Pile avocado on the toast, top with halved eggs, and finish with chili flakes.", timerMinutes: null },
    ],
  },
];

export type ItemCategory =
  | 'cooked_leftover'
  | 'produce'
  | 'dairy_protein'
  | 'bakery_grains'
  | 'pantry_condiments'
  | 'other';

export type FreshnessLevel = 'peak' | 'moderate' | 'expiring_soon' | 'critical';

export type SpoilageRisk = 'high' | 'medium' | 'low';

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category: ItemCategory;
  freshness: FreshnessLevel;
  freshnessDescription: string;
  spoilageRisk: SpoilageRisk;
  estimatedDaysLeft: number;
  expiresAt: string; // YYYY-MM-DD
  addedAt: string; // ISO string
  storageTip: string;
  status: 'active' | 'used' | 'discarded';
  confidence?: number;
  imageUrl?: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  isFromLeftovers: boolean;
  spoilageRisk?: 'high' | 'medium' | 'low' | 'pantry';
}

export interface RecipeStep {
  stepNumber: number;
  title?: string;
  instruction: string;
  proTip?: string;
}

export interface Recipe {
  id: string;
  title: string;
  tagline: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  rescuedItems: string[];
  urgencyRationale: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  wastePreventionTip: string;
}

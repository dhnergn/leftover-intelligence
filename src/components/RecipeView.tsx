import React, { useState, useEffect } from 'react';
import {
  PantryItem,
  Recipe,
} from '../types/pantry';
import {
  ChefHat,
  Flame,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Leaf,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { calculateDaysLeft } from '../utils/storage';

interface RecipeViewProps {
  pantryItems: PantryItem[];
  preselectedItems?: PantryItem[];
  onMarkItemsAsUsed: (itemIds: string[]) => void;
  onNavigateToScan: () => void;
}

export const RecipeView: React.FC<RecipeViewProps> = ({
  pantryItems,
  preselectedItems,
  onMarkItemsAsUsed,
  onNavigateToScan,
}) => {
  const activePantry = pantryItems.filter((i) => i.status === 'active');

  // Track which items are checked to include in recipe generation
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    if (preselectedItems && preselectedItems.length > 0) {
      return new Set(preselectedItems.map((i) => i.id));
    }
    // Default to all high & medium risk items, or all if none
    const highMed = activePantry.filter(
      (i) => i.spoilageRisk === 'high' || i.spoilageRisk === 'medium' || calculateDaysLeft(i.expiresAt) <= 3
    );
    if (highMed.length > 0) {
      return new Set(highMed.map((i) => i.id));
    }
    return new Set(activePantry.slice(0, 5).map((i) => i.id));
  });

  const [dietary, setDietary] = useState<string>('Any style');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [cookedSuccessMessage, setCookedSuccessMessage] = useState<string | null>(null);

  // Sync if preselectedItems change
  useEffect(() => {
    if (preselectedItems && preselectedItems.length > 0) {
      setSelectedItemIds(new Set(preselectedItems.map((i) => i.id)));
    }
  }, [preselectedItems]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllExpiring = () => {
    const expiring = activePantry.filter(
      (i) => i.spoilageRisk === 'high' || calculateDaysLeft(i.expiresAt) <= 2
    );
    setSelectedItemIds(new Set(expiring.map((i) => i.id)));
  };

  const generateRecipes = async () => {
    const itemsToRescue = activePantry.filter((i) => selectedItemIds.has(i.id));
    if (itemsToRescue.length === 0) {
      setErrorMessage('Please select at least one leftover or pantry ingredient to rescue.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCookedSuccessMessage(null);

    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToRescue,
          preferences: dietary === 'Any style' ? '' : dietary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate recipes');
      }

      const data = await response.json();
      if (!data.recipes || data.recipes.length === 0) {
        throw new Error('No recipes generated. Please adjust selected items and try again.');
      }

      setRecipes(data.recipes);
      setExpandedRecipeId(data.recipes[0]?.id || null);
    } catch (err: any) {
      console.error('Recipe error:', err);
      setErrorMessage(err.message || 'Could not connect to recipe AI service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCookThisRecipe = (recipe: Recipe) => {
    // Find matching items in active pantry by name similarity
    const lowerRescued = recipe.rescuedItems.map((r) => r.toLowerCase());
    const matchedIds: string[] = [];

    activePantry.forEach((item) => {
      const itemNameLower = item.name.toLowerCase();
      const matched =
        lowerRescued.some(
          (rescued) => itemNameLower.includes(rescued) || rescued.includes(itemNameLower)
        ) || selectedItemIds.has(item.id);

      if (matched) {
        matchedIds.push(item.id);
      }
    });

    if (matchedIds.length > 0) {
      onMarkItemsAsUsed(matchedIds);
      setCookedSuccessMessage(
        `Great job! Marked ${matchedIds.length} leftovers as cooked and rescued from food waste.`
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display">
          Zero-Waste Leftover Recipes
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          AI crafts meal ideas prioritizing ingredients with high spoilage risk and shortest shelf life.
        </p>
      </div>

      {cookedSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{cookedSuccessMessage}</span>
          </div>
          <button
            onClick={() => setCookedSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ingredient Selector Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Select Leftovers to Rescue ({selectedItemIds.size} of {activePantry.length})
            </h2>
            <p className="text-xs text-stone-500">
              Ingredients with high spoilage risk are pre-selected to prevent waste.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAllExpiring}
              className="text-xs text-rose-700 hover:text-rose-800 font-medium px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
            >
              Select Expiring First
            </button>
            <button
              onClick={() => setSelectedItemIds(new Set(activePantry.map((i) => i.id)))}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium px-2 py-1"
            >
              Select All
            </button>
          </div>
        </div>

        {activePantry.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-stone-500">
              No active leftovers in your pantry list.
            </p>
            <button
              onClick={onNavigateToScan}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
            >
              Scan Food with Camera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {activePantry.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              const days = calculateDaysLeft(item.expiresAt);
              const isUrgent = item.spoilageRisk === 'high' || days <= 1;

              return (
                <button
                  key={item.id}
                  onClick={() => toggleItemSelection(item.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? isUrgent
                        ? 'bg-rose-50/70 border-rose-300 text-stone-900'
                        : 'bg-stone-100 border-stone-300 text-stone-900'
                      : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 text-[10px] ${
                      isSelected
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-300 bg-white'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-stone-500 truncate">{item.quantity}</span>
                      <span className="text-stone-300">·</span>
                      <span
                        className={`font-medium ${
                          isUrgent ? 'text-rose-700 font-semibold' : 'text-stone-600'
                        }`}
                      >
                        {days <= 1 ? '1d left' : `${days}d left`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Dietary and Meal Preference */}
        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-stone-500 mr-1">Style:</span>
            {['Any style', 'Quick 15-min', 'One-Pan Skillet', 'Comfort Soup', 'Vegetarian'].map(
              (opt) => (
                <button
                  key={opt}
                  onClick={() => setDietary(opt)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    dietary === opt
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {opt}
                </button>
              )
            )}
          </div>

          <button
            onClick={generateRecipes}
            disabled={isLoading || selectedItemIds.size === 0}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Designing Zero-Waste Recipes...</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate Zero-Waste Recipes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          <p className="font-semibold">Recipe Generation Notice</p>
          <p className="mt-0.5">{errorMessage}</p>
        </div>
      )}

      {/* Recipe Results Section */}
      {recipes.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 font-display">
              Generated Zero-Waste Recipes ({recipes.length})
            </h2>
            <span className="text-xs text-stone-500">
              Ranked by spoilage risk rescue
            </span>
          </div>

          <div className="space-y-4">
            {recipes.map((recipe, index) => {
              const isExpanded = expandedRecipeId === recipe.id;

              return (
                <div
                  key={recipe.id || index}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs transition-shadow hover:border-stone-300"
                >
                  {/* Card Header (clickable) */}
                  <div
                    onClick={() =>
                      setExpandedRecipeId(isExpanded ? null : recipe.id)
                    }
                    className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 select-none hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          Option #{index + 1}
                        </span>
                        <h3 className="text-base font-bold text-stone-900">
                          {recipe.title}
                        </h3>
                      </div>

                      <p className="text-xs text-stone-600 font-medium">
                        {recipe.tagline}
                      </p>

                      {/* Unboxed Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 pt-1">
                        <span className="flex items-center gap-1 font-medium text-stone-700">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins total
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-stone-600">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                        </span>
                        <span>·</span>
                        <span className="text-stone-600">{recipe.difficulty}</span>
                        <span>·</span>
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Rescues {recipe.rescuedItems.length} leftover items
                        </span>
                      </div>

                      {/* Urgency Rationale */}
                      <div className="pt-2 text-xs text-rose-900/90 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                        <span className="font-semibold text-rose-900">
                          Waste Prevention Rationale:{' '}
                        </span>
                        {recipe.urgencyRationale}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecipeId(isExpanded ? null : recipe.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-stone-100 space-y-5">
                      {/* Ingredients Matrix */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Rescued leftovers */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-600" />
                            <span>Rescued Leftovers ({recipe.ingredients.filter((i) => i.isFromLeftovers).length})</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs">
                            {recipe.ingredients
                              .filter((i) => i.isFromLeftovers)
                              .map((ing, i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-200/60"
                                >
                                  <span className="font-medium text-stone-900">
                                    {ing.name}
                                  </span>
                                  <span className="text-stone-500 font-mono">
                                    {ing.amount}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* Standard pantry staples */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Common Staples Assumed</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs">
                            {recipe.ingredients
                              .filter((i) => !i.isFromLeftovers)
                              .map((ing, i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between p-2 bg-stone-50/60 rounded-lg border border-stone-100 text-stone-700"
                                >
                                  <span>{ing.name}</span>
                                  <span className="text-stone-400 font-mono">
                                    {ing.amount}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>

                      {/* Step by Step Instructions */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Step-by-Step Instructions
                        </h4>
                        <div className="space-y-2.5">
                          {recipe.steps.map((st) => (
                            <div
                              key={st.stepNumber}
                              className="flex items-start gap-3 text-xs leading-relaxed"
                            >
                              <div className="w-5 h-5 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                                {st.stepNumber}
                              </div>
                              <div className="flex-1 space-y-0.5">
                                {st.title && (
                                  <p className="font-bold text-stone-900">
                                    {st.title}
                                  </p>
                                )}
                                <p className="text-stone-700">{st.instruction}</p>
                                {st.proTip && (
                                  <p className="text-[11px] text-amber-800 italic pt-0.5">
                                    Chef Tip: {st.proTip}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sustainability tip */}
                      {recipe.wastePreventionTip && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                          <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Zero-Waste Tip: </span>
                            {recipe.wastePreventionTip}
                          </div>
                        </div>
                      )}

                      {/* Cooked Action */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-100">
                        <span className="text-xs text-stone-500">
                          Cooking this will mark rescued leftovers as completed in your pantry.
                        </span>
                        <button
                          onClick={() => handleCookThisRecipe(recipe)}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Cooked This Recipe</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

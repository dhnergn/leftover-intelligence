/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TopNav } from './components/TopNav';
import { CameraScanner } from './components/CameraScanner';
import { PantryList } from './components/PantryList';
import { RecipeView } from './components/RecipeView';
import { ManualAddModal } from './components/ManualAddModal';
import { PantryItem } from './types/pantry';
import { loadPantryItems, savePantryItems, calculateDaysLeft } from './utils/storage';
import { Sparkles, Leaf } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<PantryItem[]>(() => loadPantryItems());
  const [currentTab, setCurrentTab] = useState<'camera' | 'pantry' | 'recipes'>('pantry');
  const [preselectedRecipeItems, setPreselectedRecipeItems] = useState<PantryItem[]>([]);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save to localStorage whenever items change
  useEffect(() => {
    savePantryItems(items);
  }, [items]);

  // Urgent items count for navigation alert badge
  const urgentCount = useMemo(() => {
    return items.filter(
      (i) => i.status === 'active' && (i.spoilageRisk === 'high' || calculateDaysLeft(i.expiresAt) <= 1)
    ).length;
  }, [items]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const handleAddItems = (newItems: PantryItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
    showToast(`Added ${newItems.length} items to your pantry.`);
    setCurrentTab('pantry');
  };

  const handleUpdateItem = (updated: PantryItem) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    showToast('Item removed from pantry.');
  };

  const handleMarkItemsAsUsed = (ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((it) => (idSet.has(it.id) ? { ...it, status: 'used' as const } : it))
    );
    showToast(`Rescued & marked ${ids.length} ingredients as cooked!`);
  };

  const handleRescueItems = (itemsToRescue: PantryItem[]) => {
    setPreselectedRecipeItems(itemsToRescue);
    setCurrentTab('recipes');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        urgentCount={urgentCount}
        onOpenManualAdd={() => setIsManualAddOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'camera' && (
          <CameraScanner
            onAddItemsToPantry={handleAddItems}
            onOpenRecipesWithItems={(rescued) => {
              setPreselectedRecipeItems(rescued);
              setCurrentTab('recipes');
            }}
          />
        )}

        {currentTab === 'pantry' && (
          <PantryList
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onRescueItems={handleRescueItems}
            onNavigateToScan={() => setCurrentTab('camera')}
            onOpenManualAdd={() => setIsManualAddOpen(true)}
          />
        )}

        {currentTab === 'recipes' && (
          <RecipeView
            pantryItems={items}
            preselectedItems={preselectedRecipeItems}
            onMarkItemsAsUsed={handleMarkItemsAsUsed}
            onNavigateToScan={() => setCurrentTab('camera')}
          />
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-stone-200 bg-white/70 py-6 text-center text-xs text-stone-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium text-stone-700">
            <span>Leftover Intelligence</span>
            <span aria-hidden="true">·</span>
            <span className="text-stone-500 font-normal">
              Freshness & Spoilage Recognition
            </span>
          </p>
          <p className="text-stone-400">
            Designed for Zero Food Waste · Powered by Gemini Vision
          </p>
        </div>
      </footer>

      {/* Manual Add Modal */}
      <ManualAddModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAddItem={(newItem) => {
          handleAddItems([newItem]);
        }}
      />
    </div>
  );
}

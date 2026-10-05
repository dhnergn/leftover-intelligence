import React from 'react';
import { Camera, ListFilter, ChefHat, AlertTriangle, Plus } from 'lucide-react';

interface TopNavProps {
  currentTab: 'camera' | 'pantry' | 'recipes';
  onSelectTab: (tab: 'camera' | 'pantry' | 'recipes') => void;
  urgentCount: number;
  onOpenManualAdd: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  urgentCount,
  onOpenManualAdd,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('pantry')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center font-semibold text-sm tracking-tight transition-transform group-hover:scale-105">
              LI
            </div>
            <span className="text-lg font-bold tracking-tight text-stone-900 font-display">
              Leftover Intelligence
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Text with active underlines and clean styling) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('camera')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              currentTab === 'camera'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Camera</span>
          </button>

          <button
            onClick={() => onSelectTab('pantry')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 relative ${
              currentTab === 'pantry'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Pantry List</span>
            {urgentCount > 0 && (
              <span
                className={`ml-1 text-[11px] font-semibold tabular-nums px-1.5 py-0.2 rounded-full ${
                  currentTab === 'pantry'
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {urgentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('recipes')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              currentTab === 'recipes'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Zero-Waste Recipes</span>
          </button>
        </nav>

        {/* Zone 3: Primary Quick Actions */}
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <button
              onClick={() => onSelectTab('recipes')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
              title="Items expiring soon"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{urgentCount} urgent items</span>
            </button>
          )}

          <button
            onClick={onOpenManualAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>
    </header>
  );
};

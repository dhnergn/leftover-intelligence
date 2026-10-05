import React, { useState, useMemo } from 'react';
import {
  PantryItem,
  SpoilageRisk,
  ItemCategory,
} from '../types/pantry';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Edit2,
  ChefHat,
  Search,
  Filter,
  Plus,
  Camera,
  Check,
  Info,
} from 'lucide-react';
import { calculateDaysLeft, getCategoryLabel } from '../utils/storage';

interface PantryListProps {
  items: PantryItem[];
  onUpdateItem: (item: PantryItem) => void;
  onDeleteItem: (id: string) => void;
  onRescueItems: (items: PantryItem[]) => void;
  onNavigateToScan: () => void;
  onOpenManualAdd: () => void;
}

export const PantryList: React.FC<PantryListProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onRescueItems,
  onNavigateToScan,
  onOpenManualAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editDaysLeft, setEditDaysLeft] = useState<number>(1);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Active items (not used/discarded)
  const activeItems = useMemo(
    () => items.filter((i) => i.status === 'active'),
    [items]
  );

  // Urgent items needing rescue (high risk or <= 2 days left)
  const urgentItems = useMemo(
    () =>
      activeItems.filter(
        (i) => i.spoilageRisk === 'high' || calculateDaysLeft(i.expiresAt) <= 1
      ),
    [activeItems]
  );

  // Filtered and sorted items
  const displayItems = useMemo(() => {
    let filtered = activeItems.filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.quantity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.freshnessDescription.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'urgent') {
        return i.spoilageRisk === 'high' || calculateDaysLeft(i.expiresAt) <= 1;
      }
      if (selectedFilter === 'cooked_leftover') {
        return i.category === 'cooked_leftover';
      }
      if (selectedFilter === 'produce') {
        return i.category === 'produce';
      }
      if (selectedFilter === 'dairy_protein') {
        return i.category === 'dairy_protein';
      }
      return true;
    });

    // Sort by urgency first: fewest days left, then high spoilage risk
    return filtered.sort((a, b) => {
      const daysA = calculateDaysLeft(a.expiresAt);
      const daysB = calculateDaysLeft(b.expiresAt);
      if (daysA !== daysB) return daysA - daysB;
      const riskWeight: Record<SpoilageRisk, number> = { high: 0, medium: 1, low: 2 };
      return riskWeight[a.spoilageRisk] - riskWeight[b.spoilageRisk];
    });
  }, [activeItems, searchQuery, selectedFilter]);

  const handleStartEdit = (item: PantryItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity);
    setEditDaysLeft(calculateDaysLeft(item.expiresAt));
  };

  const handleSaveEdit = (item: PantryItem) => {
    const newExp = new Date();
    newExp.setDate(newExp.getDate() + Math.max(1, editDaysLeft));
    const updated: PantryItem = {
      ...item,
      quantity: editQuantity.trim() || item.quantity,
      estimatedDaysLeft: editDaysLeft,
      expiresAt: newExp.toISOString().split('T')[0],
      spoilageRisk: editDaysLeft <= 1 ? 'high' : editDaysLeft <= 3 ? 'medium' : 'low',
    };
    onUpdateItem(updated);
    setEditingItemId(null);
  };

  const handleMarkUsed = (item: PantryItem) => {
    onUpdateItem({
      ...item,
      status: 'used',
    });
  };

  const requestBrowserAlerts = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('Browser notifications not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotificationStatus('Daily expiration alerts enabled for your active items.');
      new Notification('Leftover Intelligence Alerts Active', {
        body: `${urgentItems.length} items currently need to be cooked or rescued soon.`,
      });
    } else {
      setNotificationStatus('Notification permission was declined.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Expiration Date Alerts Banner (High-Intent Spoilage Warning) */}
      {urgentItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-rose-900 tracking-tight">
                  Expiration Alert: {urgentItems.length}{' '}
                  {urgentItems.length === 1 ? 'item needs' : 'items need'} immediate rescue
                </h2>
              </div>
              <p className="text-xs text-rose-700/90 mt-0.5 max-w-xl">
                {urgentItems.map((i) => i.name).slice(0, 3).join(', ')}
                {urgentItems.length > 3 ? ` and ${urgentItems.length - 3} others` : ''} are within 24–48 hours of spoilage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onRescueItems(urgentItems)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Rescue With Recipe</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Pantry Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display">
            Pantry & Leftovers List
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            {activeItems.length} active items · tracked for freshness, portion, and shelf life
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={requestBrowserAlerts}
            className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg transition-colors hover:bg-stone-50 flex items-center gap-1.5"
            title="Enable Expiration Notifications"
          >
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Set Alerts</span>
          </button>

          <button
            onClick={onNavigateToScan}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Camera</span>
          </button>
        </div>
      </div>

      {notificationStatus && (
        <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-700 flex items-center justify-between">
          <span>{notificationStatus}</span>
          <button
            onClick={() => setNotificationStatus(null)}
            className="text-stone-500 hover:text-stone-800 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Segmented Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leftovers, ingredients, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-shadow"
          />
        </div>

        {/* Functional segmented control buttons */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Items ({activeItems.length})
          </button>
          <button
            onClick={() => setSelectedFilter('urgent')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedFilter === 'urgent'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Expiring First ({urgentItems.length})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('cooked_leftover')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedFilter === 'cooked_leftover'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Cooked Leftovers (
            {activeItems.filter((i) => i.category === 'cooked_leftover').length})
          </button>
          <button
            onClick={() => setSelectedFilter('produce')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedFilter === 'produce'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Produce (
            {activeItems.filter((i) => i.category === 'produce').length})
          </button>
          <button
            onClick={() => setSelectedFilter('dairy_protein')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedFilter === 'dairy_protein'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Dairy & Protein (
            {activeItems.filter((i) => i.category === 'dairy_protein').length})
          </button>
        </div>
      </div>

      {/* List Container */}
      {displayItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-500 mx-auto flex items-center justify-center">
            <Filter className="w-5 h-5 stroke-1" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              No matching leftovers found
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No items match "${searchQuery}". Clear your search or scan fresh leftovers.`
                : 'Your pantry is currently empty. Use the camera scanner to log leftovers in seconds.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={onNavigateToScan}
              className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Food Now</span>
            </button>
            <button
              onClick={onOpenManualAdd}
              className="px-4 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Add Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const daysLeft = calculateDaysLeft(item.expiresAt);
            const isEditing = editingItemId === item.id;
            const isHighRisk = item.spoilageRisk === 'high' || daysLeft <= 1;
            const isMediumRisk = item.spoilageRisk === 'medium' || (daysLeft > 1 && daysLeft <= 3);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-all p-4 ${
                  isHighRisk
                    ? 'border-rose-200/90 shadow-2xs hover:border-rose-300'
                    : isMediumRisk
                    ? 'border-amber-200/70 hover:border-amber-300'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">
                        Editing {item.name}
                      </span>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="text-xs text-stone-500 hover:text-stone-800"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-500 mb-1">Quantity / Portion</label>
                        <input
                          type="text"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-500 mb-1">
                          Days Remaining before spoilage
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editDaysLeft}
                          onChange={(e) => setEditDaysLeft(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-stone-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEdit(item)}
                        className="px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View */
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Title & Quantity */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h3 className="text-sm font-bold text-stone-900">
                          {item.name}
                        </h3>
                        <span className="text-xs font-medium text-stone-500">
                          · {item.quantity}
                        </span>
                        {item.imageUrl && (
                          <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                            Photo logged
                          </span>
                        )}
                      </div>

                      {/* Zero-Pill Unboxed Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-2 text-xs">
                        {/* Spoilage status */}
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isHighRisk
                              ? 'text-rose-700'
                              : isMediumRisk
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isHighRisk ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {isHighRisk
                            ? 'High Spoilage Risk'
                            : isMediumRisk
                            ? 'Medium Risk'
                            : 'Low Spoilage Risk'}
                        </span>

                        <span className="text-stone-300">·</span>

                        {/* Expiration estimation */}
                        <span className="text-stone-700 font-medium tabular-nums">
                          {daysLeft === 0
                            ? 'Expires today'
                            : daysLeft === 1
                            ? 'Expires tomorrow (1 day left)'
                            : `${daysLeft} days remaining`}
                        </span>

                        <span className="text-stone-300">·</span>

                        <span className="text-stone-500">
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>

                      {/* Freshness visual explanation */}
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {item.freshnessDescription}
                      </p>

                      {/* Storage advice tip */}
                      {item.storageTip && (
                        <p className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-0.5">
                          <Info className="w-3 h-3 text-stone-400 flex-shrink-0" />
                          <span>Storage: {item.storageTip}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-1.5 pt-2 sm:pt-0 self-end sm:self-start flex-shrink-0">
                      <button
                        onClick={() => onRescueItems([item])}
                        className="px-2.5 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Generate a recipe tailored to rescue this ingredient"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-stone-700" />
                        <span>Rescue</span>
                      </button>

                      <button
                        onClick={() => handleMarkUsed(item)}
                        className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 border border-emerald-200/60"
                        title="Mark item as cooked or used"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="hidden sm:inline">Used</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Edit quantity or expiration"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete from pantry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

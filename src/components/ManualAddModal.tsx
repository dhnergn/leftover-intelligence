import React, { useState } from 'react';
import { X, Plus, Clock, ShieldAlert } from 'lucide-react';
import { PantryItem, ItemCategory, FreshnessLevel, SpoilageRisk } from '../types/pantry';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: PantryItem) => void;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<ItemCategory>('cooked_leftover');
  const [freshness, setFreshness] = useState<FreshnessLevel>('moderate');
  const [freshnessDescription, setFreshnessDescription] = useState('');
  const [daysLeft, setDaysLeft] = useState<number>(2);
  const [storageTip, setStorageTip] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date();
    const expDate = new Date();
    expDate.setDate(now.getDate() + Math.max(1, daysLeft));

    const spoilageRisk: SpoilageRisk =
      daysLeft <= 1 ? 'high' : daysLeft <= 3 ? 'medium' : 'low';

    const newItem: PantryItem = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      quantity: quantity.trim() || '1 item',
      category,
      freshness,
      freshnessDescription:
        freshnessDescription.trim() ||
        (category === 'cooked_leftover'
          ? 'Cooked leftover stored in refrigerator.'
          : 'Added from kitchen pantry.'),
      spoilageRisk,
      estimatedDaysLeft: daysLeft,
      expiresAt: expDate.toISOString().split('T')[0],
      addedAt: now.toISOString(),
      storageTip: storageTip.trim() || 'Store sealed in refrigerator.',
      status: 'active',
      confidence: 100,
    };

    onAddItem(newItem);
    // Reset form
    setName('');
    setQuantity('');
    setFreshnessDescription('');
    setStorageTip('');
    setDaysLeft(2);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 font-display">
            Add Leftover or Pantry Item
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Leftover Chicken Curry, Ripe Avocados"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Portion / Quantity
              </label>
              <input
                type="text"
                placeholder="e.g. 2 cups, approx. 200g"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
              >
                <option value="cooked_leftover">Cooked Leftover</option>
                <option value="produce">Fresh Produce</option>
                <option value="dairy_protein">Dairy & Protein</option>
                <option value="bakery_grains">Bakery & Grains</option>
                <option value="pantry_condiments">Condiment & Pantry</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Freshness Level
              </label>
              <select
                value={freshness}
                onChange={(e) => setFreshness(e.target.value as FreshnessLevel)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
              >
                <option value="peak">Peak / Very Fresh</option>
                <option value="moderate">Moderate / Good</option>
                <option value="expiring_soon">Expiring Soon (1-2 days)</option>
                <option value="critical">Critical (Eat Today)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Days Until Spoilage
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={daysLeft}
                onChange={(e) => setDaysLeft(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Freshness & Appearance Note
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked yesterday night, still fragrant"
              value={freshnessDescription}
              onChange={(e) => setFreshnessDescription(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Storage Advice (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Keep tightly sealed in glass container"
              value={storageTip}
              onChange={(e) => setStorageTip(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Pantry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

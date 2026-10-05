import { PantryItem } from '../types/pantry';

const STORAGE_KEY = 'leftover_intelligence_pantry_v1';

function getFutureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getDefaultSeedItems(): PantryItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-1',
      name: 'Roasted Chicken Breast (Leftover)',
      quantity: 'approx. 180g',
      category: 'cooked_leftover',
      freshness: 'expiring_soon',
      freshnessDescription: 'Cooked 2 days ago; slightly dry surface, must be heated thoroughly and consumed today.',
      spoilageRisk: 'high',
      estimatedDaysLeft: 1,
      expiresAt: getFutureDate(1),
      addedAt: now,
      storageTip: 'Keep below 4°C in sealed glass container. Reheat once to 75°C core temp.',
      status: 'active',
      confidence: 96,
    },
    {
      id: 'seed-2',
      name: 'Cilantro / Coriander Bunch',
      quantity: 'Half bunch (~25g)',
      category: 'produce',
      freshness: 'critical',
      freshnessDescription: 'Lower stems wilting, outer leaves beginning to darken from excess condensation.',
      spoilageRisk: 'high',
      estimatedDaysLeft: 1,
      expiresAt: getFutureDate(1),
      addedAt: now,
      storageTip: 'Trim bottom stems and stand upright in a glass of water with loose plastic bag cover.',
      status: 'active',
      confidence: 94,
    },
    {
      id: 'seed-3',
      name: 'Half Red Bell Pepper',
      quantity: '1/2 pepper',
      category: 'produce',
      freshness: 'moderate',
      freshnessDescription: 'Cut edge drying slightly, flesh remains crisp and fragrant.',
      spoilageRisk: 'medium',
      estimatedDaysLeft: 2,
      expiresAt: getFutureDate(2),
      addedAt: now,
      storageTip: 'Wrap cut face in paper towel and seal in airtight silicone pouch.',
      status: 'active',
      confidence: 98,
    },
    {
      id: 'seed-4',
      name: 'Cooked Brown Rice Leftover',
      quantity: 'approx. 200g (1.5 cups)',
      category: 'cooked_leftover',
      freshness: 'expiring_soon',
      freshnessDescription: 'Refrigerated 48 hours; dry grains, ideal for quick stir-fry or fried rice rescue.',
      spoilageRisk: 'high',
      estimatedDaysLeft: 1,
      expiresAt: getFutureDate(1),
      addedAt: now,
      storageTip: 'Refrigerate immediately after cooling. Do not reheat more than once.',
      status: 'active',
      confidence: 92,
    },
    {
      id: 'seed-5',
      name: 'Plain Greek Yogurt (Opened)',
      quantity: 'approx. 160g (1/3 tub)',
      category: 'dairy_protein',
      freshness: 'moderate',
      freshnessDescription: 'Small clear whey separation on top; stir back in. Smells clean and fresh.',
      spoilageRisk: 'medium',
      estimatedDaysLeft: 3,
      expiresAt: getFutureDate(3),
      addedAt: now,
      storageTip: 'Keep on middle fridge shelf, smooth the top layer flat before replacing lid.',
      status: 'active',
      confidence: 95,
    },
    {
      id: 'seed-6',
      name: 'Carrots',
      quantity: '3 medium carrots',
      category: 'produce',
      freshness: 'peak',
      freshnessDescription: 'Firm root texture, bright orange, skin intact.',
      spoilageRisk: 'low',
      estimatedDaysLeft: 8,
      expiresAt: getFutureDate(8),
      addedAt: now,
      storageTip: 'Store in crisper drawer in breathable bag.',
      status: 'active',
      confidence: 99,
    },
  ];
}

export function loadPantryItems(): PantryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultSeedItems();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return getDefaultSeedItems();
  } catch (e) {
    console.error('Failed to read pantry from localStorage', e);
    return getDefaultSeedItems();
  }
}

export function savePantryItems(items: PantryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to write pantry to localStorage', e);
  }
}

export function calculateDaysLeft(expiresAt: string): number {
  try {
    const target = new Date(expiresAt + 'T23:59:59');
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'cooked_leftover':
      return 'Cooked Leftover';
    case 'produce':
      return 'Fresh Produce';
    case 'dairy_protein':
      return 'Dairy & Protein';
    case 'bakery_grains':
      return 'Bakery & Grains';
    case 'pantry_condiments':
      return 'Condiment & Pantry';
    default:
      return 'Pantry Item';
  }
}

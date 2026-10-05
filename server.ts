import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Scan leftover / pantry image endpoint
app.post('/api/scan', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Strip data URI header if present
    let cleanBase64 = image;
    let detectedMime = mimeType;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        cleanBase64 = match[2];
      }
    }

    const promptText = `Analyze this image of food leftovers, ingredients, or refrigerator contents.
Detect all visible individual food items, cooked leftovers, or produce.
For each item, carefully inspect visual cues of freshness (surface wilting, oxidation, browning, moisture, mold risk, packaging status, cooked condition).
Assess:
1. Exact recognizable name (e.g. "Leftover Roasted Chicken Breast", "Bell Pepper", "Cooked Pasta", "Greek Yogurt", "Fresh Cilantro").
2. Estimated quantity (e.g. "approx. 180g / 1 cup", "half a pepper", "2 portions").
3. Category: must be one of ["cooked_leftover", "produce", "dairy_protein", "bakery_grains", "pantry_condiments", "other"].
4. Freshness level: must be one of ["peak", "moderate", "expiring_soon", "critical"].
5. Detailed freshness description: factual explanation of visual state (e.g., "Slightly limp edges and minor surface browning, best cooked today", "Cooked protein, safe if consumed within 24 hours", "Plump and crisp with no discoloration").
6. Spoilage risk: must be one of ["high", "medium", "low"]. Use "high" for cooked leftovers older than 2 days, softening produce, open dairy, or items needing rescue within 24-48 hours.
7. Estimated days left: integer representing safe window before spoiling (e.g. 1 for critical/cooked leftover, 2-3 for moderate, 5-10 for robust produce/staples).
8. Actionable storage advice: immediate recommendation to preserve quality (e.g. "Airtight container at 3°C", "Wrap stems in damp paper towel", "Freeze in portions").
9. Confidence: integer 50-99.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: detectedMime,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: [
                      'cooked_leftover',
                      'produce',
                      'dairy_protein',
                      'bakery_grains',
                      'pantry_condiments',
                      'other',
                    ],
                  },
                  freshness: {
                    type: Type.STRING,
                    enum: ['peak', 'moderate', 'expiring_soon', 'critical'],
                  },
                  freshnessDescription: { type: Type.STRING },
                  spoilageRisk: {
                    type: Type.STRING,
                    enum: ['high', 'medium', 'low'],
                  },
                  estimatedDaysLeft: { type: Type.INTEGER },
                  storageTip: { type: Type.STRING },
                  confidence: { type: Type.INTEGER },
                },
                required: [
                  'name',
                  'quantity',
                  'category',
                  'freshness',
                  'freshnessDescription',
                  'spoilageRisk',
                  'estimatedDaysLeft',
                  'storageTip',
                ],
              },
            },
            overallSummary: { type: Type.STRING },
          },
          required: ['items'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    return res.json({
      success: true,
      items: parsed.items || [],
      summary: parsed.overallSummary || '',
    });
  } catch (error: any) {
    console.error('Scan API error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to scan image. Please try again.',
    });
  }
});

// Generate zero-waste recipes prioritizing high spoilage risk
app.post('/api/generate-recipes', async (req, res) => {
  try {
    const { items, preferences = '', mealType = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient or leftover is required' });
    }

    const itemsSummary = items
      .map(
        (it: any) =>
          `- ${it.name} (${it.quantity}, Category: ${it.category}, Freshness: ${it.freshness}, Spoilage Risk: ${it.spoilageRisk}, Days left: ${it.estimatedDaysLeft}d)`
      )
      .join('\n');

    const promptText = `You are an elite culinary expert specializing in food waste reduction and smart home cooking.
Here is the user's available pantry and leftover items:
${itemsSummary}

User Preferences / Dietary Notes: ${preferences || 'None specified'}
Target Meal Type: ${mealType || 'Any quick wholesome meal'}

TASK:
Generate 3 distinct, creative, and delicious recipes that PRIORITIZE rescuing the items with HIGH and MEDIUM spoilage risk and lowest days remaining.
Every recipe must:
1. Prominently feature as many expiring leftovers as sensible without compromising culinary harmony.
2. Clearly distinguish between "Rescued Leftovers" and "Standard Pantry Staples" (e.g. olive oil, salt, black pepper, garlic clove, splash of vinegar, water, butter).
3. Provide realistic preparation and cooking times, serving sizes, and step-by-step instructions.
4. Include an "urgencyRationale" explaining why this dish prevents waste and how it transforms the ingredients.
5. Provide a sustainability badge/quote describing the waste diverted.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  tagline: { type: Type.STRING },
                  difficulty: {
                    type: Type.STRING,
                    enum: ['Easy', 'Medium', 'Advanced'],
                  },
                  prepTimeMinutes: { type: Type.INTEGER },
                  cookTimeMinutes: { type: Type.INTEGER },
                  servings: { type: Type.INTEGER },
                  rescuedItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  urgencyRationale: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.STRING },
                        isFromLeftovers: { type: Type.BOOLEAN },
                        spoilageRisk: {
                          type: Type.STRING,
                          enum: ['high', 'medium', 'low', 'pantry'],
                        },
                      },
                      required: ['name', 'amount', 'isFromLeftovers'],
                    },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        instruction: { type: Type.STRING },
                        proTip: { type: Type.STRING },
                      },
                      required: ['stepNumber', 'instruction'],
                    },
                  },
                  wastePreventionTip: { type: Type.STRING },
                },
                required: [
                  'id',
                  'title',
                  'tagline',
                  'difficulty',
                  'prepTimeMinutes',
                  'cookTimeMinutes',
                  'servings',
                  'rescuedItems',
                  'urgencyRationale',
                  'ingredients',
                  'steps',
                  'wastePreventionTip',
                ],
              },
            },
          },
          required: ['recipes'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    return res.json({
      success: true,
      recipes: parsed.recipes || [],
    });
  } catch (error: any) {
    console.error('Recipes API error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate recipes. Please try again.',
    });
  }
});

// Vite middleware integration for full-stack dev / prod
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

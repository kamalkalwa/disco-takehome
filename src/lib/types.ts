export type Publisher = {
  id: string;
  name: string;
  category: string;
  subcategories: string[];
  monthly_impressions: number;
  avg_order_value_usd: number;
  audience: {
    age_skew: string;
    gender_split: { female: number; male: number; other: number };
    top_geos: string[];
    income_tier: string;
  };
  notes: string;
};

export type Persona = {
  id: string;
  name: string;
  age_range: string;
  gender_skew: string;
  description: string;
  category_affinities: string[];
  price_sensitivity: string;
  messaging_preferences: string[];
  disinterested_in: string[];
  typical_aov_usd: number;
};

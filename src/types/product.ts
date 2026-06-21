export interface Product {
  id: string;
  name: string;
  color_name: string;
  color_hex_codes: string[];
  image_url: string | null;
  gallery?: string[];
  action_text: string;
  description: string;
  care_instructions: string | null;
  material: string | null;
  category: string;
  sizes: string[];
  tags?: string[];
  is_featured?: boolean;
  customization_options?: string[];
  is_set?: boolean;
  included_products?: string[];
  created_at?: string;
  status?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface CategoryCardData {
  id: string;
  name: string;
  icon?: string | null;
  order_index?: number | null;
  featured_product_id?: string | null;
  image_url: string | null;
}

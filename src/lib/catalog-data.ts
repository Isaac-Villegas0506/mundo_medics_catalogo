import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { CategoryCardData, CategorySummary, Product } from '@/types/product';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const productColumns = [
  'id',
  'name',
  'color_name',
  'color_hex_codes',
  'image_url',
  'gallery',
  'action_text',
  'description',
  'care_instructions',
  'material',
  'category',
  'sizes',
  'tags',
  'is_featured',
  'customization_options',
  'is_set',
  'included_products',
  'created_at',
  'status',
].join(',');

function settingsArrayToMap(settings: { key: string; value: string }[] | null) {
  return (settings || []).reduce<Record<string, string>>((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
}

export const getCatalogData = unstable_cache(
  async () => {
    const [categoriesRes, productsRes, settingsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name')
        .order('order_index', { ascending: true }),
      supabase
        .from('products')
        .select(productColumns)
        .order('created_at', { ascending: false }),
      supabase.from('settings').select('key, value'),
    ]);

    return {
      categories: (categoriesRes.data || []) as unknown as CategorySummary[],
      products: (productsRes.data || []) as unknown as Product[],
      settings: settingsArrayToMap(settingsRes.data),
    };
  },
  ['catalog-data-v1'],
  { revalidate: 60 }
);

export const getCategoriesPageData = unstable_cache(
  async () => {
    const [categoriesRes, productsRes, settingsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true }),
      supabase.from('products').select('id, image_url'),
      supabase.from('settings').select('key, value'),
    ]);

    const products = productsRes.data || [];
    const categories = (categoriesRes.data || []).map((category) => {
      const product = products.find((item) => item.id === category.featured_product_id);
      return {
        ...category,
        image_url: product?.image_url || null,
      };
    }) as unknown as CategoryCardData[];

    return {
      categories,
      settings: settingsArrayToMap(settingsRes.data),
    };
  },
  ['categories-page-data-v1'],
  { revalidate: 60 }
);

export const getProductById = unstable_cache(
  async (id: string) => {
    if (!id) return null;

    const { data, error } = await supabase
      .from('products')
      .select(productColumns)
      .eq('id', id)
      .maybeSingle();

    if (error) return null;
    return data as unknown as Product | null;
  },
  ['product-by-id-v1'],
  { revalidate: 60 }
);

export const getProductsByIds = unstable_cache(
  async (ids: string[]) => {
    if (ids.length === 0) return [];

    const { data } = await supabase
      .from('products')
      .select('id, name, color_name, image_url')
      .in('id', ids);

    if (!data) return [];

    return [...data].sort(
      (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
    );
  },
  ['products-by-ids-v1'],
  { revalidate: 60 }
);

export const getWhatsappNumber = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_number')
      .maybeSingle();

    return data?.value || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890';
  },
  ['whatsapp-number-v1'],
  { revalidate: 60 }
);

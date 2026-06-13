import { createClient } from '@supabase/supabase-js';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

// Server-side Supabase client (uses public anon key, same as client-side in this project)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function getProduct(id: string) {
  if (!id) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// ✅ Dynamic Open Graph meta tags — WhatsApp will scrape these and show a rich preview
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ id?: string }> }
): Promise<Metadata> {
  const { id } = await searchParams;
  const product = id ? await getProduct(id) : null;

  if (!product) {
    return {
      title: 'Producto | Mundo Medics',
      description: 'Catálogo Digital de Indumentaria Médica',
    };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mundo-medics-catalogo.vercel.app').replace(/\/+$/, '');
  const productUrl = `${siteUrl}/product?id=${product.id}`;
  // Use the /api/og route which generates a proper PNG — WhatsApp doesn't support SVG
  const ogImageUrl = `${siteUrl}/api/og?id=${product.id}`;

  return {
    title: `${product.name} | Mundo Medics`,
    description: product.description || 'Indumentaria médica de calidad',
    openGraph: {
      title: `${product.name} | Mundo Medics`,
      description: product.description || 'Indumentaria médica de calidad',
      url: productUrl,
      siteName: 'Mundo Medics',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'es_PE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Mundo Medics`,
      description: product.description || 'Indumentaria médica de calidad',
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailPage(
  { searchParams }: { searchParams: Promise<{ id?: string }> }
) {
  const { id } = await searchParams;
  const product = id ? await getProduct(id) : null;

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8f8f6] px-5 text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Producto no encontrado</h1>
        <p className="text-[#888] mb-6">El producto que buscas ya no existe o fue ocultado.</p>
        <a href="/" className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-semibold">
          Volver al catálogo
        </a>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
        <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductDetailClient product={product} />
    </Suspense>
  );
}

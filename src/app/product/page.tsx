import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
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

  /* Fase 7 (11.5): un producto inexistente (o una URL sin `id`) responde 404.
     Antes se renderizaba el mensaje con estado 200.

     Nota sobre el status: cuando la ruta hace streaming (con <Suspense>) Next
     responde 200 e inyecta `<meta name="robots" content="noindex">`. Para tener
     el 404 real se renderiza sin Suspense: el producto ya viene resuelto del
     servidor, así que no había nada que esperar. */
  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}

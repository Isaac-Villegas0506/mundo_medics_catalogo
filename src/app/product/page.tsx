import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';
import { getProductById, getProductsByIds, getWhatsappNumber } from '@/lib/catalog-data';

export const revalidate = 60;

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ id?: string }> }
): Promise<Metadata> {
  const { id } = await searchParams;
  const product = id ? await getProductById(id) : null;

  if (!product) {
    return {
      title: 'Producto | Mundo Medics',
      description: 'Catalogo Digital de Indumentaria Medica',
    };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mundo-medics-catalogo.vercel.app').replace(/\/+$/, '');
  const productUrl = `${siteUrl}/product?id=${product.id}`;
  const ogImageUrl = `${siteUrl}/api/og?id=${product.id}`;

  return {
    title: `${product.name} | Mundo Medics`,
    description: product.description || 'Indumentaria medica de calidad',
    openGraph: {
      title: `${product.name} | Mundo Medics`,
      description: product.description || 'Indumentaria medica de calidad',
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
      description: product.description || 'Indumentaria medica de calidad',
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailPage(
  { searchParams }: { searchParams: Promise<{ id?: string }> }
) {
  const { id } = await searchParams;
  const product = id ? await getProductById(id) : null;

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8f8f6] px-5 text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Producto no encontrado</h1>
        <p className="text-[#888] mb-6">El producto que buscas ya no existe o fue ocultado.</p>
        <Link href="/" className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-semibold">
          Volver al cat&aacute;logo
        </Link>
      </div>
    );
  }

  const [whatsappNumber, includedProducts] = await Promise.all([
    getWhatsappNumber(),
    getProductsByIds(product.is_set ? product.included_products || [] : []),
  ]);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
        <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductDetailClient
        product={product}
        whatsappNumber={whatsappNumber}
        initialIncludedProducts={includedProducts}
      />
    </Suspense>
  );
}

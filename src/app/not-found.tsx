import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada | Mundo Medics',
  robots: { index: false, follow: false },
};

/**
 * 404 con la identidad del sitio. Fase 7 (11.5/11.8): un producto inexistente
 * o una URL inválida devuelve 404 real (antes devolvía 200).
 */
export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8f8f6] px-5 text-center">
      <span className="material-symbols-outlined text-[56px] text-[#ddd] mb-4" aria-hidden="true">
        search_off
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] mb-2">
        No encontramos esta página
      </h1>
      <p className="text-[#888] mb-8 max-w-sm text-sm leading-relaxed">
        El producto que buscas ya no existe, fue ocultado, o el enlace está mal escrito.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors active:scale-[0.98]"
        >
          Volver al catálogo
        </Link>
        <Link
          href="/categories"
          className="px-6 py-3 bg-white border border-black/10 text-[#1a1a1a] rounded-xl font-semibold text-sm hover:bg-[#f0f0ee] transition-colors active:scale-[0.98]"
        >
          Ver colecciones
        </Link>
      </div>
    </div>
  );
}

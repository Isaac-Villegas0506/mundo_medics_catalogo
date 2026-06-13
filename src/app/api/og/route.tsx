import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let name = 'Mundo Medics';
  let category = 'Indumentaria Médica';
  let description = 'Catálogo Digital de Indumentaria Médica';
  let imageUrl: string | null = null;

  if (id) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase
        .from('products')
        .select('name, category, description, image_url')
        .eq('id', id)
        .single();

      if (data) {
        name = data.name || name;
        category = data.category || category;
        description = data.description || description;
        // Only use image if it's a raster format (not SVG)
        const rawUrl = (data.image_url || '').trim().replace(/}$/, '');
        if (rawUrl && !rawUrl.toLowerCase().endsWith('.svg')) {
          imageUrl = rawUrl;
        } else if (rawUrl) {
          // SVG — we'll show it anyway; some crawlers handle it
          imageUrl = rawUrl;
        }
      }
    } catch (e) {
      // fallback to defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
            display: 'flex',
          }}
        />

        {/* Left: Image panel */}
        <div
          style={{
            display: 'flex',
            width: '420px',
            height: '100%',
            backgroundColor: '#eeecea',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: '32px',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                borderRadius: '60px',
                backgroundColor: '#d8d4ce',
              }}
            >
              <div style={{ fontSize: '48px', display: 'flex' }}>🩺</div>
            </div>
          )}
        </div>

        {/* Right: Text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 56px',
            flex: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top: Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#ffffff15',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🩺
            </div>
            <span
              style={{
                color: '#ffffff80',
                fontSize: '18px',
                fontWeight: '500',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Mundo Medics
            </span>
          </div>

          {/* Middle: Product info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Category pill */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#ffffff15',
                borderRadius: '100px',
                padding: '6px 18px',
                width: 'fit-content',
              }}
            >
              <span
                style={{
                  color: '#ffffffaa',
                  fontSize: '14px',
                  fontWeight: '600',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {category}
              </span>
            </div>

            {/* Product name */}
            <div
              style={{
                color: '#ffffff',
                fontSize: name.length > 25 ? '42px' : '52px',
                fontWeight: '700',
                lineHeight: '1.1',
                letterSpacing: '-0.02em',
              }}
            >
              {name}
            </div>

            {/* Description */}
            {description && description !== 'Catálogo Digital de Indumentaria Médica' && (
              <div
                style={{
                  color: '#ffffff80',
                  fontSize: '20px',
                  lineHeight: '1.5',
                  maxWidth: '520px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Bottom: CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#25D366',
                borderRadius: '12px',
                padding: '12px 24px',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '700' }}>
                Consultar por WhatsApp →
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

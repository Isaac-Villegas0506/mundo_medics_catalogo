import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let name = 'Mundo Medics';
  let imageUrl: string | null = null;

  if (id) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase
        .from('products')
        .select('name, image_url')
        .eq('id', id)
        .single();

      if (data) {
        name = data.name || name;
        const rawUrl = (data.image_url || '').trim().replace(/}$/, '');
        if (rawUrl) imageUrl = rawUrl;
      }
    } catch (e) {
      // fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#eeecea',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Product image — full bleed */}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          /* Fallback: just brand text */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '80px', display: 'flex' }}>🩺</div>
            <div
              style={{
                color: '#1a1a1a',
                fontSize: '48px',
                fontWeight: '700',
                letterSpacing: '-0.02em',
              }}
            >
              {name}
            </div>
          </div>
        )}

        {/* Subtle brand badge bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '100px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '600',
              letterSpacing: '0.02em',
            }}
          >
            Mundo Medics
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow public read and write for simplicity, or adjust based on your auth)
CREATE POLICY "Allow public read access on settings"
    ON public.settings FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert/update access on settings"
    ON public.settings FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert default values (optional, so it starts with data)
INSERT INTO public.settings (key, value) VALUES 
('whatsapp_number', ''),
('instagram_url', 'https://instagram.com/'),
('tiktok_url', 'https://tiktok.com/'),
('facebook_url', 'https://facebook.com/'),
('map_photo_url', 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800&auto=format&fit=crop'),
('map_iframe_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.9961485695762!2d-79.84318188922221!3d-6.770321293198234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x904cef0053e4ce5b%3A0xaf17958120503f79!2sMundo%20Medic''s!5e0!3m2!1ses-419!2spe!4v1781481821993!5m2!1ses-419!2spe'),
('map_directions_url', 'https://maps.app.goo.gl/ay9nCUgq9SYtcxGA7')
ON CONFLICT (key) DO NOTHING;

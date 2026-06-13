ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configurar RLS y Permisos para Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de settings"
ON settings FOR SELECT
USING (true);

CREATE POLICY "Permitir escritura de settings a todos"
ON settings FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO settings (key, value) VALUES ('whatsapp_number', '+1234567890') ON CONFLICT (key) DO NOTHING;

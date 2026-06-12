-- Tabla de Productos para Mundo Medics
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color_name text NOT NULL,
  color_hex_codes text[] DEFAULT '{}'::text[],
  image_url text,
  action_text text DEFAULT 'Ver detalles',
  description text,
  care_instructions text,
  material text,
  category text DEFAULT 'Todos',
  sizes text[] DEFAULT '{"S","M","L","XL"}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para permitir lectura pública
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de productos"
ON public.products FOR SELECT
USING (true);

-- Insertar los productos de prueba iniciales
INSERT INTO public.products (name, color_name, color_hex_codes, image_url, action_text, description, category) VALUES
(
  'Bata de Consulta Premium', 
  'Blanco Clásico', 
  '{"#FFFFFF", "#1E293B", "#93C5FD"}',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDrEPWpSwb_mkpUFJuJTaWkjDGKlMSEGLWiNI10MrNkZiSD8CWjHPGA7F5Cv74L0_ZhUFy5zJD54dEjhRTh2KvOf7ulYo-5VggElM4TOUjBzzTpysxIeoiPTKOqw9pSWtN1SSB4TZaehnwsVm1p9zNCnRXKo98Sp9kOCOHpveq_gClr6vONv3B2LVvCgHkpzN60J3FwTO8CvY3hHxCHxZ93andDjpH74xE6pagMWUU-9R_L9oTbEoPSEkN0InvM1gUBsUD61I27NKdq',
  'Consultar',
  'Tela premium antimicrobiana con tecnología stretch para máxima comodidad durante tu jornada.',
  'Batas'
),
(
  'Conjunto Quirúrgico Tech', 
  'Azul Marino', 
  '{"#1E293B", "#FFFFFF"}',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCuWCXffNVZubtTqfFwgN1KpTj4qVkXCJFB_zXaMFbdWKbxeE2QkN6fYFjsZUW5ah4e0EBy7A_Ic7XkArh7mE01Tgus3jc9I3UB5oOhggZaquZ1R0GHbI300g4gPElQlo1xbR_jgM5q6N1XWyY0B-W7gyuQanEA3iaLR48TFPjEs9hgW68d0u0o5RY1epy7JegKHMQLOloP4tT8fy4z_q4KS3RWcoeO05z9EyvWLFcTssiiTQudgs_6J5zQqNiOL2tzqMpkY_FxoxNZ',
  'Ver detalles',
  'Diseño de alto rendimiento, repele fluidos y cuenta con múltiples bolsillos utilitarios.',
  'Quirúrgicos'
),
(
  'Filipina Ergonómica', 
  'Celeste Pastel', 
  '{"#B2EBF2", "#F8BBD0", "#E8EAF6"}',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAVV_lC8RxXH8x73idI6ykgECMycj6h2f-ejpZFIsLRAU88DL3WTx6NSnvIdJaXjf6sUVb2slBlIS3eCXVCkQ0RaBzQ4GSIb_a2UQesQc18UNJsXf0W93ouXE64O5NzkKLHy_4UDKqT1HvfuDs75hlr3nD2TuGbpkgwCsBa9Geb-LwNGHucWcAAbSG0MO8b5K-z902Iz5xrckBrc7B6gc-vmjyDfSseebpwfF5YuptHucZOKYYHx5LUv0F4xEkGbpDVVOB5jA6-GF5q',
  'Consultar',
  'Pensada para largas guardias, esta filipina reduce la fatiga gracias a su corte y tejido.',
  'Quirúrgicos'
),
(
  'Kit Básico Consultorio', 
  'Instrumental', 
  '{"#94A3B8"}',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC5Ps3AYheEX_eDz6-DzDHCqlS7ncAPj5P7NeQhSZoGmZF34GXx8qJRbXV3ZPa-E9VEDnVpcHFrdyTZshGuUzCxyYGxs3EWNw5PaDVU-JfArpbd8kPDKpZGFR74sTtYCyF5_9yezFK4wHUPtJIKkMFkdyZg9LTlcFbkI12ySQkFDUZNnpVy9rtPBuirCXPhFwupvTNouzXLPvAhwD2mO0DfwqBorB6sWu7kk6fD5pb2cw4CyuJ4Vt3Z_3eiLaj8OjxyjLNQmmT9L-gL',
  'Ver detalles',
  'Todo lo esencial que necesitas para tu primera práctica en un solo lugar.',
  'Accesorios'
),
(
  'Bata Corte Princesa', 
  'Blanco Nieve', 
  '{"#FFFFFF"}',
  NULL,
  'Consultar',
  'Bata estilizada que se adapta perfectamente a la figura femenina sin sacrificar movilidad.',
  'Batas'
),
(
  'Bata Corta Estándar', 
  'Blanco Clásico', 
  '{"#FFFFFF", "#F1F5F9"}',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuArUWo7b7oS8fPauAKjsdqtJwFdMRjP3arTjef35wRKbCGZ5Ur83wOlBs-VX3z7W8bDfsEE-knx-0EeD3neytMrcj3XOC-WJqfzfuv1UU57WVANCoqGDQF6QRFo1Axu3m-xDfAGcZeoSmV659JZqUTeahfqUYCiIHclJHr7jrWBLNDqv5WXcCogXr-h7U5qbZ983iYc_qOI-VdqBEIaJhcWtbtNTRwUGr6L8bzgTbfBguOAtindey0M1iNcfCy06dlT_0mIjIa6CZUA',
  'Ver detalles',
  'El estándar clínico ideal para laboratorios y prácticas de estudiantes.',
  'Batas'
);

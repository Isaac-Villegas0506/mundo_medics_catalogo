'use client';

import React, { useState, useEffect } from 'react';
import { ReorderGroup, ReorderItem } from '@/components/admin/Reorder';
import { supabase } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { validateImageFile } from '@/utils/imageUpload';
import { uploadToImageKit } from '@/utils/imageUploadClient';
import { revalidateCatalog } from '@/app/admin/actions';
import AdminDialog from '@/components/admin/AdminDialog';
import { logActivity } from '@/utils/activityLog';

export default function ProductEditorPage() {
  const router = useRouter();
  const params = useParams();
  /* Fase 17: pasa a estado para poder cambiar a modo edición tras crear un
     producto, sin salir de la pestaña. */
  const [isNew, setIsNew] = useState(params.id === 'new');

  const [loading, setLoading] = useState(params.id !== 'new');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /* Fase 17: modal de éxito en lugar de navegar fuera de la pestaña. */
  const [successDialog, setSuccessDialog] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string, file: File, progress: number, url: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    internal_code: '',
    description: '',
    category: '',
    status: 'Disponible',
    action_text: 'Consultar',
    sizes: ['S', 'M', 'L', 'XL'],
    color_name: '',
    color_hex_codes: [] as string[],
    /* Fase 19: imagen por color. Mapa hex -> URL, para que el modal cambie la
       foto al elegir un color. */
    color_images: {} as Record<string, string>,
    /* Fase 33: variantes completas (hex + nombre + foto). */
    color_variants: [] as { hex: string; name: string; image: string }[],
    tags: [] as string[],
    gallery: [] as string[],
    image_url: '', // Main image, usually gallery[0]
    customization_options: [] as string[],
    is_set: false,
    included_products: [] as string[],
  });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [newColorHex, setNewColorHex] = useState('#000000');
  /* Fase 33: nombre que el dueño asigna al tono («Rojo vino»). */
  const [newColorName, setNewColorName] = useState('');
  const [newTag, setNewTag] = useState('');

  const fetchAllProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, image_url, color_name');
    if (data) setAllProducts(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('order_index');
    if (data) setCategories(data);
  };

  const fetchProduct = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', params.id).single();
    if (data) {
      setFormData({
        name: data.name || '',
        internal_code: data.internal_code || '',
        description: data.description || '',
        category: data.category || '',
        status: data.status || 'Disponible',
        action_text: data.action_text || 'Consultar',
        sizes: data.sizes || [],
        color_name: data.color_name || '',
        color_hex_codes: data.color_hex_codes || [],
        color_images: (data.color_images as Record<string, string>) || {},
        color_variants: (data.color_variants as { hex: string; name: string; image: string }[]) || [],
        tags: data.tags || [],
        gallery: data.gallery || (data.image_url ? [data.image_url] : []),
        image_url: data.image_url || '',
        customization_options: data.customization_options || [],
        is_set: data.is_set || false,
        included_products: data.included_products || [],
      });
    }
    setLoading(false);
  };

  /* Fase 11: el efecto va después de las funciones que invoca, para no
     referenciarlas antes de su declaración. */
  useEffect(() => {
    fetchCategories();
    fetchAllProducts();
    if (!isNew) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSize = (size: string) => {
    const newSizes = formData.sizes.includes(size) 
      ? formData.sizes.filter(s => s !== size)
      : [...formData.sizes, size];
    handleChange('sizes', newSizes);
  };

  /* ── Fase 33: VARIANTES DE COLOR ──────────────────────────────────────
     Flujo pedido por el dueño:
       1. elegir el tono con el selector de color,
       2. escribir el nombre («Rojo vino»),
       3. añadir la foto de ESE color,
       4. guardar la variante.

     La fuente de verdad es color_variants: [{ hex, name, image }].
     color_hex_codes y color_images se mantienen sincronizadas al guardar,
     para no romper el código que aún las lee. */

  const colorVariants = formData.color_variants;

  /** Añade una variante nueva con el hex y el nombre introducidos. */
  const addColorVariant = () => {
    const hex = newColorHex.trim().toLowerCase();
    const name = newColorName.trim();

    if (!hex) {
      setFormError('Elige un tono para la variante.');
      return;
    }
    if (!name) {
      setFormError('Escribe un nombre para el color (por ejemplo «Rojo vino»).');
      return;
    }
    if (colorVariants.some((v) => v.hex.toLowerCase() === hex)) {
      setFormError('Ese tono ya está añadido. Elige otro o edita el existente.');
      return;
    }

    handleChange('color_variants', [...colorVariants, { hex, name, image: '' }]);
    setFormError(null);
    setNewColorName('');
    setNewColorHex('#000000');
  };

  /** Quita una variante completa (nombre + hex + foto). */
  const removeColorVariant = (hex: string) => {
    handleChange('color_variants', colorVariants.filter((v) => v.hex !== hex));
  };

  /** Cambia el nombre de una variante ya creada. */
  const renameColorVariant = (hex: string, name: string) => {
    handleChange(
      'color_variants',
      colorVariants.map((v) => (v.hex === hex ? { ...v, name } : v))
    );
  };

  const [uploadingColorHex, setUploadingColorHex] = useState<string | null>(null);

  /** Sube (o reemplaza) la foto de una variante concreta. */
  const uploadColorImage = async (hex: string, file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setUploadingColorHex(hex);
    setFormError(null);

    try {
      const url = await uploadToImageKit(file);
      handleChange(
        'color_variants',
        colorVariants.map((v) => (v.hex === hex ? { ...v, image: url } : v))
      );
    } catch (err) {
      console.error('Error al subir la imagen del color:', err);
      setFormError(
        err instanceof Error
          ? 'No se pudo subir la imagen: ' + err.message
          : 'No se pudo subir la imagen del color.'
      );
    } finally {
      setUploadingColorHex(null);
    }
  };

  const removeColorImage = (hex: string) => {
    handleChange(
      'color_variants',
      colorVariants.map((v) => (v.hex === hex ? { ...v, image: '' } : v))
    );
  };

  const toggleTag = (tag: string) => {
    const newTags = formData.tags.includes(tag) 
      ? formData.tags.filter(t => t !== tag)
      : [...formData.tags, tag];
    handleChange('tags', newTags);
  };

  const toggleCustomization = (option: string) => {
    const newOptions = formData.customization_options.includes(option) 
      ? formData.customization_options.filter(o => o !== option)
      : [...formData.customization_options, option];
    handleChange('customization_options', newOptions);
  };

  // Image Upload via ImageKit
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files);

    // Validar tipo y tamaño antes de subir (S6). Detenemos todo si hay un archivo inválido.
    for (const file of selected) {
      const validationError = validateImageFile(file);
      if (validationError) {
        // Fase 7 (1.10): error visible en la interfaz, no un alert() bloqueante.
        setFormError(validationError);
        e.target.value = '';
        return;
      }
    }

    const newFiles = selected.map(file => ({
      id: Math.random().toString(36).substring(2, 15),
      file,
      progress: 0,
      url: URL.createObjectURL(file)
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);
    setSaving(true);

    const uploadedUrls: string[] = [];

    for (const item of newFiles) {
      const interval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: Math.min(f.progress + (Math.random() * 15 + 5), 90) } : f));
      }, 300);

      try {
        const secureUrl = await uploadToImageKit(item.file);
        uploadedUrls.push(secureUrl);
      } catch (err) {
        console.error('Error uploading:', err);
        // Fase 7 (1.10): error visible, sin alert() bloqueante.
        setFormError(
          `No se pudo subir "${item.file.name}". ${err instanceof Error ? err.message : 'Inténtalo de nuevo.'}`
        );
      }

      clearInterval(interval);
      setUploadingFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 100 } : f));

      await new Promise(r => setTimeout(r, 300));
      setUploadingFiles(prev => prev.filter(f => f.id !== item.id));
      URL.revokeObjectURL(item.url);
    }

    setSaving(false);
    if (uploadedUrls.length > 0) {
      handleChange('gallery', [...formData.gallery, ...uploadedUrls]);
    }
    
    // Clear input so same file can be selected again
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);

    /* Fase 16: validación básica antes de escribir. `products.name` y
       `color_name` son NOT NULL en la base: sin esto, el insert fallaba con un
       error de Postgres difícil de entender o guardaba un registro vacío. */
    if (!formData.name || !formData.name.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      setSaving(false);
      return;
    }

    /* Fase 33: si hay variantes, `color_name` puede derivarse de ellas.
       Se sigue exigiendo un nombre de color para cumplir el NOT NULL de la
       base, pero se toma de la primera variante si el campo está vacío. */
    const nombreColor = formData.color_name?.trim() || colorVariants[0]?.name || '';
    if (!nombreColor) {
      setFormError('Indica el color (o añade al menos una variante de color).');
      setSaving(false);
      return;
    }

    /* Fase 33: se sincronizan las tres representaciones del color para no
       romper nada que aún lea las columnas antiguas:
         - color_variants: fuente completa (hex + nombre + foto)
         - color_hex_codes: array de hex (lo usa la tarjeta y el modal)
         - color_images: mapa hex -> url (lo usa el modal para cambiar la foto)
       Además `color_name` pasa a ser la lista de nombres legible
       («Rojo vino, Negro, Blanco»). */
    const variantesLimpias = colorVariants
      .filter((v) => v.hex && v.name.trim())
      .map((v) => ({ hex: v.hex, name: v.name.trim(), image: v.image || '' }));

    const hexCodes = variantesLimpias.length > 0
      ? variantesLimpias.map((v) => v.hex)
      : formData.color_hex_codes;

    const colorImages: Record<string, string> = {};
    for (const v of variantesLimpias) {
      if (v.image) colorImages[v.hex] = v.image;
    }

    const payload = {
      ...formData,
      color_name: nombreColor,
      color_variants: variantesLimpias,
      color_hex_codes: hexCodes,
      color_images: colorImages,
      image_url: formData.gallery.length > 0 ? formData.gallery[0] : null,
    };

    /* Fase 16: antes NO se comprobaba el error. Si la escritura fallaba (RLS,
       red, dato inválido) la app navegaba igual a la lista, como si se hubiera
       guardado, y el producto no existía. Ahora se verifica y se avisa. */
    const { data: inserted, error } = isNew
      ? await supabase.from('products').insert([payload]).select('id').single()
      : await supabase.from('products').update(payload).eq('id', params.id).select('id').single();

    if (error) {
      console.error('Error al guardar el producto:', error);
      setFormError(
        error.code === '42501'
          ? 'No tienes permiso para guardar. Tu cuenta no está como administrador.'
          : `No se pudo guardar: ${error.message}`
      );
      setSaving(false);
      return; // No se navega: el usuario sigue en el formulario con sus datos.
    }

    // El catálogo público debe reflejar el cambio ya mismo.
    await revalidateCatalog();

    // Fase 33: registrar la acción para «Actividad reciente» del dashboard.
    logActivity({
      action: isNew ? 'create' : 'update',
      entity: 'product',
      entityName: formData.name,
      detail: isNew ? 'Producto nuevo' : 'Cambios guardados',
    });

    setSaving(false);

    // Fase 17: el modal informa del resultado sin salir de la pestaña.
    setSuccessDialog(true);

    // Si era un producto nuevo, la URL pasa a la de edición para que recargar
    // no cree otro producto duplicado.
    if (isNew && inserted?.id) {
      setIsNew(false);
      router.replace(`/admin/products/${inserted.id}`, { scroll: false });
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando producto...</div>;

  const availableTags = ['Nuevo', 'Tendencia', 'Oferta', 'Destacado', 'Varón', 'Mujer', 'Unisex'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única'];
  const availableCustomizations = ['Bordado personalizado', 'Estampado personalizado', 'Grabado láser'];

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      
      {/* Header del editor (Fase 33).
          ANTES: `sticky top-[80px] z-30` con fondo semitransparente. Tenía dos
          problemas:
            1. El header del shell mide 56px en móvil y 64px en escritorio, así
               que `top-[80px]` dejaba una franja muerta y, al hacer scroll, esta
               tarjeta flotaba SOBRE los campos y los tapaba.
            2. El `backdrop-blur` con z-30 se superponía al contenido del
               formulario que tiene campos con foco y desplegables.
          AHORA: no es sticky. Se queda arriba del formulario y se desplaza con
          la página, así nunca tapa nada. Las acciones principales están también
          duplicadas al final del formulario para no tener que subir. */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ece9e2] bg-white p-4 md:flex-row md:items-center md:p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            aria-label="Volver a productos"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#ece9e2] bg-white text-[#555] transition-colors hover:text-[#1a1a1a]"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold tracking-tight text-[#1a1a1a] md:text-[20px]">
              {isNew ? 'Nuevo Producto' : 'Editar Producto'}
            </h2>
            <span className="text-[11px] uppercase tracking-wider text-[#aaa]">
              {formData.internal_code || 'Borrador'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-[#555] transition-colors hover:bg-[#f4f2f0] md:flex-none"
          >
            Cancelar
          </Link>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#333] transition-colors shadow-md disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Fase 7 (1.10): errores del formulario visibles y descartables. */}
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-[#fdf3f3] px-4 py-3 text-sm text-[#a33]">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span className="flex-1">{formError}</span>
          <button
            onClick={() => setFormError(null)}
            aria-label="Cerrar aviso"
            className="shrink-0 text-[#a33]/70 hover:text-[#a33]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Info */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* SET COMPLETO TOGGLE AND UI */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex justify-between items-center cursor-pointer" onClick={() => handleChange('is_set', !formData.is_set)}>
            <div>
              <h3 className="font-semibold text-[#1a1a1a]">Este producto es un "Set Completo"</h3>
              <p className="text-sm text-[#888] mt-1">Agrupa varios productos en uno solo (ej. Uniforme completo).</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.is_set ? 'bg-[#1a1a1a]' : 'bg-[#e0e0e0]'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_set ? 'left-7' : 'left-1'}`} />
            </div>
          </div>

          {formData.is_set && (
            <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#1a1a1a]/10">
              <h3 className="font-semibold text-[#1a1a1a] mb-5">Productos Incluidos en el Set</h3>
              
              {/* Product Selector Dropdown */}
              <div className="relative mb-5 z-20">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-[#f8f8f6] border border-transparent hover:border-black/10 rounded-xl px-4 py-3 text-sm text-[#555] transition-all cursor-pointer flex justify-between items-center"
                >
                  <span>+ Añadir producto al set...</span>
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </div>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/5 z-50 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-black/5 relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#aaa]">search</span>
                        <input
                          type="text"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Buscar producto..."
                          className="w-full bg-[#f4f2f0] border-none outline-none rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-[#eceae6] transition-colors"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto no-scrollbar">
                        {allProducts
                          .filter(p => p.id !== params.id && !formData.included_products.includes(p.id))
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              handleChange('included_products', [...formData.included_products, p.id]);
                              setIsDropdownOpen(false);
                              setProductSearch('');
                            }}
                            className="px-4 py-3 hover:bg-[#f8f8f6] cursor-pointer transition-colors flex items-center gap-3 border-b border-black/5 last:border-0"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#e8e8e4] overflow-hidden flex-shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] text-[#aaa] w-full h-full flex items-center justify-center">image</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#1a1a1a]">{p.name}</span>
                              {p.color_name && <span className="text-[11px] text-[#888]">{p.color_name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Selected Products List */}
              <div className="flex flex-col gap-2">
                {formData.included_products.map(prodId => {
                  const prod = allProducts.find(p => p.id === prodId);
                  if (!prod) return null;
                  return (
                    <div key={prodId} className="flex items-center justify-between p-3 bg-[#f8f8f6] border border-[#ece9e2] rounded-xl group">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#e8e8e4] overflow-hidden flex-shrink-0 border border-black/5">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-[#aaa] w-full h-full flex items-center justify-center">image</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#1a1a1a]">{prod.name}</span>
                          {prod.color_name && <span className="text-[11px] text-[#888]">{prod.color_name}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleChange('included_products', formData.included_products.filter(id => id !== prodId))}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#e57373] hover:bg-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  );
                })}
                {formData.included_products.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-[#ece9e2] rounded-xl text-center text-[#aaa] text-sm">
                    No has añadido ningún producto al set todavía.
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <h3 className="font-semibold text-[#1a1a1a] mb-5">Información General</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Nombre del producto</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                  placeholder="Ej. Bata Premium Elite"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Código Interno (SKU)</label>
                  <input 
                    type="text" 
                    value={formData.internal_code} 
                    onChange={e => handleChange('internal_code', e.target.value)}
                    className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white font-mono"
                    placeholder="SKU-123"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Categoría</label>
                  <select 
                    value={formData.category} 
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Descripción</label>
                  <span className={`text-[10px] font-medium ${formData.description.length >= 70 ? 'text-red-400' : 'text-[#aaa]'}`}>
                    {formData.description.length}/70
                  </span>
                </div>
                <textarea 
                  value={formData.description} 
                  onChange={e => handleChange('description', e.target.value)}
                  maxLength={70}
                  rows={4}
                  className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white resize-none"
                  placeholder="Describe las características principales..."
                />
              </div>
            </div>
          </div>

          {/* Media / Gallery */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-[#1a1a1a]">Galería de Imágenes</h3>
              <label className="cursor-pointer bg-[#f4f2f0] hover:bg-[#eceae6] text-[#555] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Subir Fotos
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            
            {/* Galería (Fase 33).
                BUG CORREGIDO: cada tarjeta usaba `key={url}` y `value={url}`.
                La URL como key es frágil: si dos fotos comparten la misma URL
                (pasa al reemplazar una imagen por otra que ya estaba, o al
                duplicar), React colapsa ambas tarjetas y la imagen «desaparece»
                del contenedor al seleccionarla.
                Ahora se usa la POSICIÓN como identidad, que es estable y única.
                El reordenar actualiza el array, así que la posición se
                recalcula con él. */}
            <ReorderGroup
              axis="x"
              values={formData.gallery.map((url, i) => ({ url, i }))}
              onReorder={(next) => handleChange('gallery', next.map((x) => x.url))}
              className="flex flex-wrap gap-3 pb-2"
            >
              {formData.gallery.map((url, i) => (
                <ReorderItem
                  key={`${i}-${url}`}
                  value={{ url, i }}
                  className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-[#f4f2f0] sm:h-28 sm:w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`} className="size-full object-cover" />

                  {/* Acciones: borrar y marcar como principal */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleChange('gallery', formData.gallery.filter((_, idx) => idx !== i))}
                      aria-label={`Eliminar foto ${i + 1}`}
                      className="flex size-8 items-center justify-center rounded-full bg-[#c62828] text-white transition-colors hover:bg-[#a01f1f]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          // Mover al principio = marcar como principal.
                          const next = [...formData.gallery];
                          const [moved] = next.splice(i, 1);
                          next.unshift(moved);
                          handleChange('gallery', next);
                        }}
                        aria-label={`Usar foto ${i + 1} como principal`}
                        title="Usar como principal"
                        className="flex size-8 items-center justify-center rounded-full bg-white text-[#1a1a1a] transition-colors hover:bg-[#f0eeeb]"
                      >
                        <span className="material-symbols-outlined text-[16px]">star</span>
                      </button>
                    )}
                  </div>

                  {i === 0 && (
                    <div className="absolute left-1.5 top-1.5 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                      Principal
                    </div>
                  )}
                </ReorderItem>
              ))}

              {uploadingFiles.map(file => (
                <li key={file.id} className="w-28 h-28 flex-shrink-0 bg-[#f4f2f0] rounded-2xl overflow-hidden relative border border-black/5" style={{ listStyle: 'none' }}>
                  <img src={file.url} alt={`Uploading ${file.file.name}`} className="w-full h-full object-cover opacity-50 blur-[2px]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-16 h-1.5 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a1a1a] transition-all duration-300" style={{ width: `${file.progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#1a1a1a] bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm">{Math.round(file.progress)}%</span>
                  </div>
                </li>
              ))}

              <label className="w-28 h-28 flex-shrink-0 bg-[#f8f8f6] border-2 border-dashed border-[#ece9e2] rounded-2xl flex flex-col items-center justify-center text-[#aaa] hover:bg-[#f4f2f0] hover:border-[#ccc] transition-all cursor-pointer" style={{ listStyle: 'none' }}>
                <span className="material-symbols-outlined text-[24px] mb-1" style={{ fontVariationSettings: "'wght' 300" }}>add_photo_alternate</span>
                <span className="text-[10px] font-medium">Añadir</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </ReorderGroup>
          </div>

          {/* Variants */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <h3 className="font-semibold text-[#1a1a1a] mb-5">Variantes</h3>
            
            <div className="flex flex-col gap-6">
              {/* Sizes */}
              <div>
                <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-3">Tallas Disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => {
                    const active = formData.sizes.includes(size);
                    return (
                      <button 
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`w-12 h-10 rounded-xl text-sm font-semibold transition-all ${
                          active ? 'bg-[#1a1a1a] text-white shadow-sm' : 'bg-[#f4f2f0] text-[#555] hover:bg-[#eceae6]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Fase 33: VARIANTES DE COLOR ──────────────────────────
                   Cada variante tiene TONO + NOMBRE + FOTO propia.
                   En la tienda, al elegir «Rojo vino» se verá la foto de ese
                   color (no solo cambia el circulito). */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#aaa]">
                  Variantes de color
                </label>
                <p className="mb-3 text-[11px] leading-relaxed text-[#999]">
                  Añade un tono, ponle nombre y sube la foto de la prenda en ese color.
                </p>

                {/* Lista de variantes ya creadas */}
                {colorVariants.length > 0 && (
                  <div className="mb-4 flex flex-col gap-2">
                    {colorVariants.map((v) => {
                      const isUploading = uploadingColorHex === v.hex;
                      return (
                        <div
                          key={v.hex}
                          className="flex items-center gap-2.5 rounded-2xl border border-[#ece9e2] bg-white p-2.5"
                        >
                          {/* Tono */}
                          <span
                            className="size-9 shrink-0 rounded-full border border-black/10 shadow-sm"
                            style={{ background: v.hex }}
                            title={v.hex}
                          />

                          {/* Foto de la variante */}
                          {v.image ? (
                            <div className="relative shrink-0">
                              <div className="size-9 overflow-hidden rounded-lg border border-black/5 bg-[#f4f2f0]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={v.image} alt={`Color ${v.name}`} className="size-full object-cover" />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeColorImage(v.hex)}
                                aria-label={`Quitar la foto de ${v.name}`}
                                className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-black text-white"
                              >
                                <span className="material-symbols-outlined text-[10px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <label
                              className={`flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-[#f4f2f0] px-2 text-[11px] font-medium text-[#666] transition-colors hover:bg-[#eceae6] ${
                                isUploading ? 'pointer-events-none opacity-60' : ''
                              }`}
                              title="Añadir foto de este color"
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadColorImage(v.hex, file);
                                  e.target.value = '';
                                }}
                              />
                              {isUploading ? (
                                <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-[#bbb] border-t-[#555]" />
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
                              )}
                              {isUploading ? 'Subiendo' : 'Foto'}
                            </label>
                          )}

                          {/* Nombre editable */}
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => renameColorVariant(v.hex, e.target.value)}
                            placeholder="Nombre del color"
                            className="min-w-0 flex-1 rounded-lg border border-transparent bg-[#f8f8f6] px-2.5 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-black/10 focus:bg-white"
                          />

                          {/* Quitar variante */}
                          <button
                            type="button"
                            onClick={() => removeColorVariant(v.hex)}
                            aria-label={`Quitar ${v.name || v.hex}`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#bbb] transition-colors hover:bg-[#fdf3f3] hover:text-[#c62828]"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {colorVariants.length === 0 && (
                  <p className="mb-3 rounded-xl bg-[#f8f8f6] px-3 py-2.5 text-[12px] text-[#999]">
                    Aún no hay variantes. Añade la primera abajo.
                  </p>
                )}

                {/* Formulario para añadir una variante: tono → nombre → añadir */}
                <div className="rounded-2xl border border-dashed border-[#ddd8d0] bg-[#fcfcfb] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selector visual de color */}
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm">
                      <div className="absolute inset-0" style={{ backgroundColor: newColorHex }} />
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        aria-label="Elegir tono"
                        className="absolute inset-[-10px] size-16 cursor-pointer border-none opacity-0 outline-none"
                        title="Elegir tono"
                      />
                    </div>

                    {/* Hex manual */}
                    <input
                      type="text"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      maxLength={7}
                      aria-label="Código hexadecimal"
                      className="w-[92px] shrink-0 rounded-xl bg-white px-3 py-2.5 font-mono text-[13px] uppercase text-[#1a1a1a] outline-none ring-1 ring-[#ece9e2] transition-colors focus:ring-[#1a1a1a]"
                      placeholder="#000000"
                    />

                    {/* Nombre */}
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addColorVariant();
                        }
                      }}
                      placeholder="Nombre · ej. Rojo vino"
                      aria-label="Nombre del color"
                      className="min-w-[140px] flex-1 rounded-xl bg-white px-3 py-2.5 text-[13px] text-[#1a1a1a] outline-none ring-1 ring-[#ece9e2] transition-colors focus:ring-[#1a1a1a]"
                    />

                    <button
                      type="button"
                      onClick={addColorVariant}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Añadir
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] text-[#aaa]">
                    Después de añadirla podrás subir la foto de ese color.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <h3 className="font-semibold text-[#1a1a1a] mb-5">Estado</h3>
            <div className="flex flex-col gap-2">
              {['Disponible', 'Agotado', 'Próximamente', 'Oculto'].map(s => (
                <label key={s} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8f8f6] cursor-pointer transition-colors border border-transparent hover:border-black/5">
                  <input 
                    type="radio" 
                    name="status" 
                    value={s}
                    checked={formData.status === s}
                    onChange={() => handleChange('status', s)}
                    className="w-4 h-4 text-[#1a1a1a] focus:ring-[#1a1a1a]"
                  />
                  <span className="text-sm font-medium text-[#1a1a1a]">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <h3 className="font-semibold text-[#1a1a1a] mb-5">Etiquetas (Badges)</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const active = formData.tags.includes(tag);
                return (
                  <button 
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      active 
                      ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' 
                      : 'bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f8f8f6]'
                    }`}
                  >
                    {active && <span className="material-symbols-outlined text-[12px] mr-1 align-middle" style={{ fontVariationSettings: "'wght' 600" }}>check</span>}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
            <h3 className="font-semibold text-[#1a1a1a] mb-5">Personalización</h3>
            <p className="text-[11px] text-[#888] mb-4 leading-relaxed">
              Activa las opciones de personalización disponibles para este producto. Se mostrarán como etiqueta destacada en la tarjeta y vista de detalle.
            </p>
            <div className="flex flex-col gap-2">
              {availableCustomizations.map(option => {
                const active = formData.customization_options.includes(option);
                return (
                  <label 
                    key={option} 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                      active 
                        ? 'bg-[#e8f1ff] border-[#1f4ed8]/20' 
                        : 'bg-[#f8f8f6] border-transparent hover:border-black/5'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={active}
                      onChange={() => toggleCustomization(option)}
                      className="w-4 h-4 text-[#1f4ed8] focus:ring-[#1f4ed8] rounded"
                    />
                    <span className={`text-sm font-medium ${active ? 'text-[#1f4ed8]' : 'text-[#1a1a1a]'}`}>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#f8f8f6] to-[#f4f2f0] rounded-[24px] p-6 border border-[#ece9e2]">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#aaa] text-[20px]">info</span>
              <h3 className="font-semibold text-[#555] text-sm">Auditoría</h3>
            </div>
            <p className="text-[11px] text-[#888] leading-relaxed">
              Los cambios se guardarán en la base de datos central. Las imágenes se subirán y alojarán en ImageKit y se servirán optimizadas.
            </p>
          </div>
        </div>

      </div>

      {/* Fase 17: modal de éxito. Se cierra con ✕, Escape o «Ir a la lista».
          El usuario NO sale de la pestaña hasta que decide. */}
      <AdminDialog
        open={successDialog}
        variant="success"
        title={isNew ? 'Producto creado' : 'Cambios guardados'}
        confirmLabel="Seguir aquí"
        cancelLabel="Ir a la lista"
        onConfirm={() => setSuccessDialog(false)}
        onCancel={() => {
          setSuccessDialog(false);
          router.push('/admin/products');
        }}
      >
        {isNew
          ? 'El producto ya está disponible en el catálogo.'
          : 'Los datos del producto se actualizaron y el catálogo ya los muestra.'}
      </AdminDialog>
    </main>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'motion/react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { validateImageFile } from '@/utils/imageUpload';
import { uploadToCloudinary } from '@/utils/cloudinary';

export default function ProductEditorPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchAllProducts();
    if (!isNew) {
      fetchProduct();
    }
  }, [params.id]);

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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSize = (size: string) => {
    const newSizes = formData.sizes.includes(size) 
      ? formData.sizes.filter(s => s !== size)
      : [...formData.sizes, size];
    handleChange('sizes', newSizes);
  };

  const addColor = () => {
    if (!formData.color_hex_codes.includes(newColorHex)) {
      handleChange('color_hex_codes', [...formData.color_hex_codes, newColorHex]);
    }
  };

  const removeColor = (hex: string) => {
    handleChange('color_hex_codes', formData.color_hex_codes.filter(c => c !== hex));
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

  // Image Upload via Cloudinary
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
        const secureUrl = await uploadToCloudinary(item.file);
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
    const payload = {
      ...formData,
      image_url: formData.gallery.length > 0 ? formData.gallery[0] : null,
    };

    if (isNew) {
      await supabase.from('products').insert([payload]);
    } else {
      await supabase.from('products').update(payload).eq('id', params.id);
    }
    setSaving(false);
    router.push('/admin/products');
  };

  if (loading) return <div className="p-10 text-center">Cargando producto...</div>;

  const availableTags = ['Nuevo', 'Tendencia', 'Oferta', 'Destacado', 'Varón', 'Mujer', 'Unisex'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única'];
  const availableCustomizations = ['Bordado personalizado', 'Estampado personalizado', 'Grabado láser'];

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/50 backdrop-blur-md p-4 rounded-3xl sticky top-[80px] z-30 shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#ece9e2] text-[#555] hover:text-[#1a1a1a] transition-all">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
          </Link>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-[#1a1a1a]">
              {isNew ? 'Nuevo Producto' : 'Editar Producto'}
            </h2>
            <span className="text-[11px] text-[#aaa] uppercase tracking-wider">{formData.internal_code || 'Borrador'}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#555] hover:bg-white transition-colors">
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
            
            <Reorder.Group axis="x" values={formData.gallery} onReorder={(val) => handleChange('gallery', val)} className="flex flex-wrap gap-3 pb-2">
              {formData.gallery.map((url, i) => (
                <Reorder.Item key={url} value={url} className="w-28 h-28 flex-shrink-0 bg-[#f4f2f0] rounded-2xl overflow-hidden relative group cursor-grab active:cursor-grabbing border border-black/5">
                  <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <span className="material-symbols-outlined text-white text-[20px]">drag_indicator</span>
                    <button 
                      onClick={() => handleChange('gallery', formData.gallery.filter(u => u !== url))}
                      className="w-7 h-7 flex items-center justify-center bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase shadow-sm">
                      Principal
                    </div>
                  )}
                </Reorder.Item>
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
            </Reorder.Group>
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

              {/* Colors */}
              <div>
                <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-3">Colores y Familia</label>
                <input 
                  type="text" 
                  value={formData.color_name} 
                  onChange={e => handleChange('color_name', e.target.value)}
                  className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white mb-3"
                  placeholder="Ej. Blanco Nieve o Pack Mixto"
                />
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.color_hex_codes.map((hex, i) => (
                      <div key={i} className="relative group shrink-0">
                        <div 
                          className="w-10 h-10 rounded-full border border-black/10 shadow-sm flex items-center justify-center cursor-pointer"
                          style={{ background: hex }}
                        />
                        <button 
                          onClick={() => removeColor(hex)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[10px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 border-l border-[#ece9e2] pl-3">
                    <div className="relative w-10 h-10 shrink-0 rounded-full border border-black/10 shadow-sm overflow-hidden group cursor-pointer">
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundColor: newColorHex }}
                      />
                      <input 
                        type="color" 
                        value={newColorHex} 
                        onChange={e => setNewColorHex(e.target.value)}
                        className="absolute inset-[-10px] w-16 h-16 border-none outline-none cursor-pointer opacity-0"
                        title="Elegir color visualmente"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={newColorHex} 
                      onChange={e => setNewColorHex(e.target.value)}
                      maxLength={7}
                      className="w-24 bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] transition-all focus:bg-white font-mono uppercase"
                      placeholder="#000000"
                    />
                    <button onClick={addColor} className="text-sm font-medium text-[#555] bg-[#f4f2f0] hover:bg-[#eceae6] px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                      Añadir Color
                    </button>
                  </div>
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
              Los cambios se guardarán en la base de datos central. Las imágenes se subirán y alojarán en Supabase Storage (Bucket "products").
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}

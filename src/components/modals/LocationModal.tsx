import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sanitizeMapEmbedUrl } from '@/utils/mapUrl';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Record<string, string>;
}

export default function LocationModal({ isOpen, onClose, settings }: LocationModalProps) {
  const iframeUrl = sanitizeMapEmbedUrl(settings.map_iframe_url || '');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 pointer-events-none z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-[90vw] max-w-[420px] rounded-[24px] shadow-xl pointer-events-auto overflow-hidden flex flex-col max-h-[90dvh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-black/5">
                <h3 className="font-semibold text-lg text-[#1a1a1a]">Visítanos en Tienda</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center bg-[#f4f2f0] hover:bg-[#eceae6] rounded-full text-[#555] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="overflow-y-auto no-scrollbar p-5 flex flex-col gap-5">
                {/* Image Placeholder */}
                <div className="w-full h-48 bg-[#f4f2f0] rounded-2xl overflow-hidden relative">
                  <img 
                    src={settings.map_photo_url || "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800&auto=format&fit=crop"} 
                    alt="Mundo Medic's Local" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg shadow-sm text-xs font-semibold text-[#1a1a1a]">
                    Mundo Medic's
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-[#1a1a1a] flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#555]">location_on</span>
                    <span>Chiclayo, Perú</span>
                  </p>
                  <p className="text-xs text-[#888] pl-6">
                    Encuentra nuestro local principal con los mejores productos médicos.
                  </p>
                </div>

                {/* Map */}
                <div className="w-full h-64 rounded-2xl overflow-hidden border border-black/5 bg-[#f4f2f0]">
                  {iframeUrl ? (
                    <iframe 
                      src={iframeUrl} 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.9961485695762!2d-79.84318188922221!3d-6.770321293198234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x904cef0053e4ce5b%3A0xaf17958120503f79!2sMundo%20Medic&#39;s!5e0!3m2!1ses-419!2spe!4v1781481821993!5m2!1ses-419!2spe" 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="p-4 border-t border-black/5 bg-[#f8f8f6]">
                <a 
                  href={settings.map_directions_url || "https://maps.app.goo.gl/ay9nCUgq9SYtcxGA7"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-3.5 rounded-xl font-semibold hover:bg-[#333] transition-colors shadow-md"
                >
                  Ver ruta en Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

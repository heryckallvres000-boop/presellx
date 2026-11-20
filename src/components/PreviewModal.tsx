import { Download, ExternalLink, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { useState } from 'react';
import type { PageRecord } from '../types.ts';

interface PreviewModalProps {
  page: PageRecord | null;
  onClose: () => void;
}

export function PreviewModal({ page, onClose }: PreviewModalProps) {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0C0E]/90 backdrop-blur-md">
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[#121316] px-6 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#F4F4F6]">{page.title}</h3>
          <p className="font-mono text-xs text-[#9CA3AF]">/p/{page.slug}</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1C1E24] p-1">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewport === 'desktop'
                ? 'bg-[#262932] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewport === 'tablet'
                ? 'bg-[#262932] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewport === 'mobile'
                ? 'bg-[#262932] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href={`/api/pages/${page.id}/export`}
            download={`${page.slug}.html`}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1C1E24] px-3 py-2 text-xs font-medium text-[#F4F4F6] transition-colors hover:bg-[#262932] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar .HTML
          </a>
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-gradient flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir ao Vivo
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#1C1E24] text-[#9CA3AF] transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div
          className={`h-full overflow-hidden rounded-xl border border-white/[0.1] bg-black shadow-2xl transition-all duration-200 ${
            viewport === 'mobile'
              ? 'w-[390px] max-w-full'
              : viewport === 'tablet'
              ? 'w-[768px] max-w-full'
              : 'w-full max-w-[1280px]'
          }`}
        >
          <iframe
            key={`${page.id}-${viewport}`}
            src={`/api/pages/${page.id}/preview`}
            title={`Pré-visualização de ${page.title}`}
            className="h-full w-full border-0 bg-[#121316]"
          />
        </div>
      </div>
    </div>
  );
}

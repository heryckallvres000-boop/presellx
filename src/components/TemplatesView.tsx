import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PAGE_TYPE_LABELS, TEMPLATE_PRESETS, type TemplatePreset } from '../data/templates.ts';
import type { FolderRecord, PageRecord } from '../types.ts';

interface TemplatesViewProps {
  folders: FolderRecord[];
  onCreated: (page: PageRecord) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function TemplatesView({ folders, onCreated, onNotify }: TemplatesViewProps) {
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  async function handleUseTemplate(preset: TemplatePreset) {
    setCreatingKey(preset.key);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: preset.defaultTitle,
          slug: preset.defaultSlug,
          folder_id: folders[0]?.id || null,
          page_type: preset.page_type,
          status: 'published',
          language: 'PT',
          affiliate_url: preset.affiliate_url,
          blocks: preset.blocks,
          theme: preset.theme,
          cookie_config: preset.cookie_config,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Erro ao criar página.');
      onNotify(`Template "${preset.name}" criado!`);
      onCreated(created);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao usar template.', 'error');
    } finally {
      setCreatingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="border-b border-white/[0.08] pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
          Templates de Alta Conversão
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[#9CA3AF]">
          Crie novas páginas em 1 clique com estruturas pré-otimizadas para tráfego pago, captura de leads, bio social e conformidade com políticas de anúncios.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TEMPLATE_PRESETS.map((preset) => (
          <div
            key={preset.key}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1E24] transition-colors hover:border-white/[0.16]"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#121316]">
              <img
                src={preset.previewImage}
                alt={preset.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1E24] via-black/25 to-transparent" />
            </div>

            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#9CA3AF]">
                  {PAGE_TYPE_LABELS[preset.page_type]} · Pronto para publicar
                </p>
                <h3 className="text-lg font-bold text-[#F4F4F6]">{preset.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">{preset.subtitle}</p>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => handleUseTemplate(preset)}
                  disabled={creatingKey === preset.key}
                  className="cta-gradient flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {creatingKey === preset.key ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando Página...
                    </>
                  ) : (
                    <>
                      <span>Usar Template em 1 Clique</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

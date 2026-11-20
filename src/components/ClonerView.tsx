import { CheckCircle2, Copy, Globe, Languages, Loader2, ShieldCheck, Wand2 } from 'lucide-react';
import { useState } from 'react';
import type { FolderRecord, PageLanguage, PageRecord } from '../types.ts';

interface ClonerViewProps {
  folders: FolderRecord[];
  onCreated: (page: PageRecord) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function ClonerView({ folders, onCreated, onNotify }: ClonerViewProps) {
  const [url, setUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [folderId, setFolderId] = useState<string>(folders[0]?.id || '');
  const [stripTrackers, setStripTrackers] = useState(true);
  const [translateTo, setTranslateTo] = useState<PageLanguage | 'ORIGINAL'>('ORIGINAL');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloneResult, setCloneResult] = useState<{
    title: string;
    html: string;
    removedTrackers: string[];
    linksCount: number;
    imagesCount: number;
    translatedTo: PageLanguage | null;
  } | null>(null);

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      onNotify('Cole uma URL válida para iniciar a clonagem.', 'error');
      return;
    }
    setLoading(true);
    setCloneResult(null);
    try {
      const res = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          stripTrackers,
          translateTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao clonar página.');
      }
      setCloneResult(data);
      if (!pageTitle.trim()) {
        setPageTitle(data.title || 'Página Clonada');
      }
      onNotify('Página clonada e higienizada com sucesso!');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao clonar URL.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAndOpen() {
    if (!cloneResult) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pageTitle.trim() || cloneResult.title,
          folder_id: folderId || null,
          page_type: 'cloned',
          status: 'published',
          language: cloneResult.translatedTo || 'PT',
          source_url: url.trim(),
          affiliate_url: affiliateUrl.trim(),
          html_content: cloneResult.html,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Falha ao salvar página.');
      onNotify('Página salva! Abrindo Editor Visual...');
      onCreated(created);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao salvar página.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
          Clonador Inteligente &amp; Tradutor Multi-Idiomas
        </h2>
        <p className="max-w-2xl text-sm text-[#9CA3AF]">
          Importe qualquer página de vendas ou presell sem bloqueio de CORS, converta caminhos de mídia e CSS para URLs absolutas, remova pixels antigos e traduza automaticamente mantendo o layout original.
        </p>
      </div>

      <form
        onSubmit={handleClone}
        className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-6 space-y-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <label className="mb-2 block text-xs font-semibold text-[#9CA3AF]">
              URL de Origem (Página de Vendas ou Presell)
            </label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/pagina-de-vendas"
                className="w-full rounded-xl border border-white/[0.08] bg-[#262932] py-3 pl-10 pr-4 text-sm text-[#F4F4F6] placeholder-[#6B7280] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-xs font-semibold text-[#9CA3AF]">
              Tradução Automática (Gemini)
            </label>
            <div className="relative">
              <Languages className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <select
                value={translateTo}
                onChange={(e) => setTranslateTo(e.target.value as PageLanguage | 'ORIGINAL')}
                className="w-full appearance-none rounded-xl border border-white/[0.08] bg-[#262932] py-3 pl-10 pr-4 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
              >
                <option value="ORIGINAL">Manter Idioma Original</option>
                <option value="PT">Português (PT-BR)</option>
                <option value="EN">Inglês (EN-US)</option>
                <option value="ES">Espanhol (ES)</option>
                <option value="FR">Francês (FR)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#9CA3AF]">
              Nome do Projeto no Painel
            </label>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="Ex: Oferta Principal — Clonada"
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2.5 text-sm text-[#F4F4F6] placeholder-[#6B7280] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#9CA3AF]">
              Pasta / Campanha
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2.5 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
            >
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#9CA3AF]">
              Link de Checkout / Afiliado (Opcional)
            </label>
            <input
              type="text"
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              placeholder="https://checkout.suaentrega.com"
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2.5 text-sm text-[#F4F4F6] placeholder-[#6B7280] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-[#F4F4F6]">
            <input
              type="checkbox"
              checked={stripTrackers}
              onChange={(e) => setStripTrackers(e.target.checked)}
              className="h-4 w-4 accent-[#FF6B00]"
            />
            <span>
              Higienização automática: remover Meta Pixel, GTM, Analytics, Hotjar e scripts de cloaking antigos
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="cta-gradient flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Clonando e Higienizando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Clonar Página Agora
              </>
            )}
          </button>
        </div>
      </form>

      {cloneResult && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-6 space-y-5">
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>HTML capturado e pronto para edição</span>
              </div>
              <p className="text-xs text-[#9CA3AF] tabular-nums">
                {cloneResult.linksCount} links mapeados · {cloneResult.imagesCount} imagens absolutizadas ·{' '}
                {cloneResult.removedTrackers.length} rastreadores removidos
                {cloneResult.translatedTo ? ` · Traduzido para ${cloneResult.translatedTo}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAndOpen}
              disabled={saving}
              className="cta-gradient flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Abrir no Editor Visual
            </button>
          </div>

          {cloneResult.removedTrackers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
              <span className="flex items-center gap-1.5 font-semibold text-[#F4F4F6]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#FF6B00]" />
                Rastreadores removidos:
              </span>
              <span>{cloneResult.removedTrackers.join(' · ')}</span>
            </div>
          )}

          <div className="h-[460px] overflow-hidden rounded-xl border border-white/[0.08] bg-white">
            <iframe
              srcDoc={cloneResult.html}
              title="Preview da página clonada"
              sandbox="allow-same-origin"
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

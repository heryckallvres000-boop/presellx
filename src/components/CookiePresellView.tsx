import { Cookie, ExternalLink, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { CookiePresellConfig, FolderRecord, PageLanguage, PageRecord } from '../types.ts';

interface CookiePresellViewProps {
  folders: FolderRecord[];
  onCreated: (page: PageRecord) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function CookiePresellView({ folders, onCreated, onNotify }: CookiePresellViewProps) {
  const [title, setTitle] = useState('Presell Cookies — Nova Oferta');
  const [affiliateUrl, setAffiliateUrl] = useState('https://go.hotmart.com/sua-oferta');
  const [folderId, setFolderId] = useState(folders[0]?.id || '');
  const [language, setLanguage] = useState<PageLanguage>('PT');
  const [saving, setSaving] = useState(false);
  const [simulatedQuery, setSimulatedQuery] = useState(
    'utm_source=meta_ads&utm_campaign=escala_01&fbclid=IwAR3x9Demo'
  );

  const [config, setConfig] = useState<CookiePresellConfig>({
    targetPreviewUrl: 'https://siteoficialdoprodutor.com',
    backgroundMode: 'preview_card',
    customImageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
    blurIntensity: 10,
    modalPosition: 'center',
    modalTheme: 'dark',
    headline: 'Preferências de Cookies e Privacidade',
    description:
      'Utilizamos cookies essenciais para garantir a melhor experiência de navegação e personalizar ofertas relevantes. Ao continuar, você concorda com nossa Política de Privacidade.',
    acceptButtonText: 'Aceitar e Continuar',
    rejectButtonText: 'Gerenciar Preferências',
    accentColor: '#FF6B00',
    redirectOnClose: true,
    previewBrandName: 'Portal Oficial da Oferta',
    previewHeadline: 'Apresentação Exclusiva do Produto e Condições Especiais',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!affiliateUrl.trim()) {
      onNotify('Informe o link de afiliado ou destino final.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Presell de Cookies',
          folder_id: folderId || null,
          page_type: 'presell_cookies',
          status: 'published',
          language,
          source_url: config.targetPreviewUrl,
          affiliate_url: affiliateUrl.trim(),
          cookie_config: config,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Erro ao criar presell.');
      onNotify('Presell de Cookies publicada e pronta para tráfego!');
      onCreated(created);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao criar presell.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const isLight = config.modalTheme === 'light';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B00]">
          <ShieldCheck className="h-4 w-4" />
          <span>100% em conformidade com Google Ads, Meta Ads, Hotmart, Kiwify e ClickBank</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
          Gerador de Presell com Popup de Cookies
        </h2>
        <p className="max-w-2xl text-sm text-[#9CA3AF]">
          Sem iframes invisíveis ou cookie stuffing. O visitante interage de forma legítima com o aviso de cookies e é redirecionado preservando todas as UTMs, gclid e fbclid.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-6 lg:col-span-5"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
              Nome da Presell
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2.5 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
              Link de Afiliado / Destino Final (com repasse automático de UTMs)
            </label>
            <input
              type="url"
              required
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              placeholder="https://go.hotmart.com/..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2.5 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as PageLanguage)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2.5 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
              >
                <option value="PT">Português (PT)</option>
                <option value="EN">English (EN)</option>
                <option value="ES">Español (ES)</option>
                <option value="FR">Français (FR)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">Pasta</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2.5 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
              >
                <option value="">Sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                  Estilo de Fundo
                </label>
                <select
                  value={config.backgroundMode}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      backgroundMode: e.target.value as CookiePresellConfig['backgroundMode'],
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                >
                  <option value="preview_card">Preview Desfocado</option>
                  <option value="custom_image">Imagem Desfocada</option>
                  <option value="gradient_blur">Gradiente Limpo</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                  Posição do Modal
                </label>
                <select
                  value={config.modalPosition}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      modalPosition: e.target.value as CookiePresellConfig['modalPosition'],
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                >
                  <option value="center">Centro</option>
                  <option value="bottom">Rodapé</option>
                  <option value="top">Topo</option>
                </select>
              </div>
            </div>

            {config.backgroundMode === 'preview_card' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                    Nome da Oferta (Fundo)
                  </label>
                  <input
                    type="text"
                    value={config.previewBrandName}
                    onChange={(e) => setConfig({ ...config, previewBrandName: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                    Desfoque ({config.blurIntensity}px)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={config.blurIntensity}
                    onChange={(e) =>
                      setConfig({ ...config, blurIntensity: Number(e.target.value) })
                    }
                    className="mt-2.5 w-full accent-[#FF6B00]"
                  />
                </div>
              </div>
            )}

            {config.backgroundMode === 'custom_image' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                  URL da Imagem de Fundo
                </label>
                <input
                  type="text"
                  value={config.customImageUrl}
                  onChange={(e) => setConfig({ ...config, customImageUrl: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Título do Popup de Cookies
              </label>
              <input
                type="text"
                value={config.headline}
                onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                Texto de Consentimento
              </label>
              <textarea
                rows={3}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                  Botão Principal
                </label>
                <input
                  type="text"
                  value={config.acceptButtonText}
                  onChange={(e) => setConfig({ ...config, acceptButtonText: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
                  Tema do Modal
                </label>
                <select
                  value={config.modalTheme}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      modalTheme: e.target.value as CookiePresellConfig['modalTheme'],
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
                >
                  <option value="dark">Grafite Escuro</option>
                  <option value="light">Branco Limpo</option>
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-[#D1D5DB]">
              <input
                type="checkbox"
                checked={config.redirectOnClose}
                onChange={(e) => setConfig({ ...config, redirectOnClose: e.target.checked })}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              <span>Redirecionar ao clicar no botão de fechar (&times;) ou preferências</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="cta-gradient flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Criar e Publicar Presell
          </button>
        </form>

        {/* Live Interactive Preview */}
        <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5 lg:col-span-7">
          <div className="mb-3 flex flex-col gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F6]">
                <Cookie className="h-4 w-4 text-[#FF6B00]" />
                <span>Simulação Interativa (Flow Tracking)</span>
              </div>
              <span className="font-mono text-xs text-[#9CA3AF]">
                {(() => {
                  try {
                    const u = new URL(affiliateUrl || 'https://exemplo.com');
                    const q = new URLSearchParams(simulatedQuery.replace(/^\?/, ''));
                    q.forEach((v, k) => {
                      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
                    });
                    return `Destino: ${u.toString().slice(0, 44)}...`;
                  } catch {
                    return `Destino: ${affiliateUrl.slice(0, 36)}`;
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9CA3AF] shrink-0">Testar parâmetros:</span>
              <input
                type="text"
                value={simulatedQuery}
                onChange={(e) => setSimulatedQuery(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-1 font-mono text-[11px] text-[#D1D5DB] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>

          <div
            className={`relative flex flex-1 min-h-[480px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#121316] p-6 ${
              config.modalPosition === 'bottom'
                ? 'items-end'
                : config.modalPosition === 'top'
                ? 'items-start'
                : 'items-center'
            } justify-center`}
          >
            {/* Background simulation */}
            {config.backgroundMode === 'custom_image' ? (
              <div
                className="absolute inset-0 bg-cover bg-center brightness-50"
                style={{
                  backgroundImage: `url(${config.customImageUrl})`,
                  filter: `blur(${config.blurIntensity}px) brightness(0.45)`,
                  transform: 'scale(1.06)',
                }}
              />
            ) : config.backgroundMode === 'gradient_blur' ? (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 25% 20%, rgba(255,107,0,0.22), transparent 50%), radial-gradient(circle at 80% 75%, rgba(230,25,25,0.18), transparent 45%), #121316',
                }}
              />
            ) : (
              <div
                className="pointer-events-none absolute inset-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-8 opacity-60"
                style={{ filter: `blur(${config.blurIntensity}px)` }}
              >
                <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <span className="text-base font-bold text-white">{config.previewBrandName}</span>
                  <span className="text-xs text-[#9CA3AF]">{config.targetPreviewUrl}</span>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-white">{config.previewHeadline}</h3>
                <p className="max-w-md text-sm text-[#9CA3AF]">
                  Página oficial do produto com especificações completas e garantia de satisfação.
                </p>
                <div className="mt-6 h-44 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#121316]" />
              </div>
            )}

            {/* Cookie Modal */}
            <div
              className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl backdrop-blur-xl ${
                isLight
                  ? 'border-black/10 bg-white/95 text-gray-900'
                  : 'border-white/[0.12] bg-[#1C1E24]/92 text-[#F4F4F6]'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <h4 className="text-base font-bold leading-snug">{config.headline}</h4>
                <button
                  type="button"
                  onClick={() =>
                    onNotify(
                      config.redirectOnClose
                        ? 'Em produção: redirecionaria para o link de afiliado com UTMs.'
                        : 'Modal fechado sem redirecionar.'
                    )
                  }
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm ${
                    isLight
                      ? 'border-gray-200 text-gray-500 hover:text-gray-900'
                      : 'border-white/10 text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  &times;
                </button>
              </div>
              <p
                className={`mb-5 text-xs leading-relaxed ${
                  isLight ? 'text-gray-600' : 'text-[#9CA3AF]'
                }`}
              >
                {config.description}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onNotify('Em produção: clique registrado e visitante enviado com UTMs!')
                  }
                  className="cta-gradient flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap"
                >
                  <span>{config.acceptButtonText}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onNotify('Em produção: redirecionamento seguro acionado com UTMs!')
                  }
                  className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium whitespace-nowrap ${
                    isLight
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'border-white/10 text-[#9CA3AF] hover:bg-white/5'
                  }`}
                >
                  {config.rejectButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

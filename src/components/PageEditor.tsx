import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Code2,
  Download,
  ExternalLink,
  GripVertical,
  Image as ImageIcon,
  Languages,
  Link2,
  Loader2,
  Monitor,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGE_LABELS } from '../data/templates.ts';
import type {
  BlockType,
  ComplianceAuditResult,
  CopyVariation,
  DomainRecord,
  FolderRecord,
  PageBlock,
  PageLanguage,
  PageRecord,
  ParsedImageAsset,
  ParsedLinkAsset,
} from '../types.ts';

interface PageEditorProps {
  initialPage: PageRecord;
  folders: FolderRecord[];
  domains: DomainRecord[];
  onBack: () => void;
  onSaved: (updated: PageRecord) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

type EditorMode = 'visual' | 'blocks' | 'code' | 'presell';
type InspectorTab = 'assets' | 'ai' | 'scripts' | 'conversion';

const BLOCK_PALETTE: Array<{ type: BlockType; label: string }> = [
  { type: 'hero', label: 'Hero / Título' },
  { type: 'text', label: 'Bloco de Texto' },
  { type: 'image', label: 'Imagem' },
  { type: 'video', label: 'Vídeo (YT/Vimeo)' },
  { type: 'cta', label: 'Botão / Caixa CTA' },
  { type: 'lead_form', label: 'Formulário de Captura' },
  { type: 'countdown', label: 'Cronômetro' },
  { type: 'link_list', label: 'Lista de Links (Bio)' },
  { type: 'divider', label: 'Divisor' },
];

function createEmptyBlock(type: BlockType): PageBlock {
  const id = Math.random().toString(36).slice(2, 10);
  switch (type) {
    case 'hero':
      return {
        id,
        type,
        data: {
          eyebrow: 'Destaque',
          title: 'Sua Headline Principal Aqui',
          subtitle: 'Subtítulo claro explicando o benefício central da sua oferta.',
          buttonText: 'Quero Saber Mais',
          buttonUrl: 'https://checkout.exemplo.com',
          align: 'center',
          isCheckoutLink: true,
        },
      };
    case 'text':
      return {
        id,
        type,
        data: {
          title: 'Título da Seção',
          content: 'Escreva aqui os argumentos principais, prova social ou detalhes da solução.',
        },
      };
    case 'image':
      return {
        id,
        type,
        data: {
          imageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
          imageAlt: 'Imagem ilustrativa',
        },
      };
    case 'video':
      return {
        id,
        type,
        data: { videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      };
    case 'cta':
      return {
        id,
        type,
        data: {
          title: 'Pronto para começar?',
          subtitle: 'Garantia total e acesso imediato.',
          buttonText: 'Garantir Agora',
          buttonUrl: 'https://checkout.exemplo.com',
          isCheckoutLink: true,
        },
      };
    case 'lead_form':
      return {
        id,
        type,
        data: {
          title: 'Cadastre-se Gratuitamente',
          subtitle: 'Receba os detalhes diretamente no seu e-mail.',
          submitText: 'Enviar Cadastro',
          successMessage: 'Cadastro realizado com sucesso!',
          collectPhone: true,
        },
      };
    case 'link_list':
      return {
        id,
        type,
        data: {
          links: [
            {
              id: Math.random().toString(36).slice(2, 8),
              label: 'Acessar Oferta Oficial',
              sublabel: 'Condição promocional',
              url: 'https://checkout.exemplo.com',
              highlight: true,
            },
          ],
        },
      };
    case 'countdown':
      return {
        id,
        type,
        data: {
          countdownMinutes: 15,
          countdownLabel: 'Esta condição especial expira em:',
          countdownExpiredText: 'Últimos minutos disponíveis!',
        },
      };
    case 'divider':
      return { id, type, data: {} };
  }
}

function buildInlineEditableHtml(rawHtml: string): string {
  const bridgeScript = `
<style>
  [data-ff-editable="1"]:hover { outline: 1px dashed rgba(255,107,0,0.65); outline-offset: 3px; cursor: text; }
  [data-ff-editable="1"]:focus { outline: 2px solid #FF6B00; outline-offset: 3px; border-radius: 4px; }
</style>
<script data-ff-editor-bridge="1">
(function() {
  function initInline() {
    var selectors = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,a,button,span';
    document.querySelectorAll(selectors).forEach(function(el) {
      if (el.closest('script,style,svg')) return;
      var hasDirectText = Array.from(el.childNodes).some(function(n) {
        return n.nodeType === 3 && n.textContent && n.textContent.trim().length > 0;
      });
      if (!hasDirectText) return;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('data-ff-editable', '1');
      el.addEventListener('click', function(e) {
        if (el.tagName === 'A' || el.tagName === 'BUTTON') {
          e.preventDefault();
        }
      });
      el.addEventListener('blur', function() {
        var clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('[data-ff-editor-bridge]').forEach(function(s) { s.remove(); });
        clone.querySelectorAll('[data-ff-editable]').forEach(function(node) {
          node.removeAttribute('contenteditable');
          node.removeAttribute('data-ff-editable');
        });
        window.parent.postMessage({ type: 'FF_INLINE_HTML_SYNC', html: '<!doctype html>\\n' + clone.outerHTML }, '*');
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInline);
  } else {
    initInline();
  }
})();
</script>`;

  if (/<\/body>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/body>/i, `${bridgeScript}\n</body>`);
  }
  return `${rawHtml}\n${bridgeScript}`;
}

export function PageEditor({
  initialPage,
  folders,
  domains,
  onBack,
  onSaved,
  onNotify,
}: PageEditorProps) {
  const [page, setPage] = useState<PageRecord>(initialPage);
  const [mode, setMode] = useState<EditorMode>(() => {
    if (initialPage.page_type === 'presell_cookies') return 'presell';
    if (initialPage.page_type === 'cloned' || (initialPage.html_content && initialPage.blocks.length === 0)) {
      return 'visual';
    }
    return 'blocks';
  });
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('assets');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Drag & Drop state for blocks
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Assets Inspector state
  const [links, setLinks] = useState<ParsedLinkAsset[]>([]);
  const [images, setImages] = useState<ParsedImageAsset[]>([]);
  const [plainText, setPlainText] = useState('');
  const [bulkCheckoutUrl, setBulkCheckoutUrl] = useState(initialPage.affiliate_url || '');
  const [linkEdits, setLinkEdits] = useState<Record<number, string>>({});
  const [imageEdits, setImageEdits] = useState<Record<number, string>>({});
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Gemini AI state
  const [aiProductContext, setAiProductContext] = useState(initialPage.title);
  const [aiHeadline, setAiHeadline] = useState('');
  const [aiSubheadline, setAiSubheadline] = useState('');
  const [aiCta, setAiCta] = useState('Garantir Agora');
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceAuditResult | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [translating, setTranslating] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Listen to inline edits inside iframe
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === 'FF_INLINE_HTML_SYNC' && typeof ev.data.html === 'string') {
        setPage((prev) => ({ ...prev, html_content: ev.data.html }));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Load extracted assets & prefill AI headline from page
  async function loadAssets(targetPageId = page.id) {
    setLoadingAssets(true);
    try {
      const res = await fetch(`/api/pages/${targetPageId}/assets`);
      const data = await res.json();
      if (res.ok) {
        setLinks(data.links || []);
        setImages(data.images || []);
        setPlainText(data.plainText || '');
        const lMap: Record<number, string> = {};
        (data.links || []).forEach((l: ParsedLinkAsset) => {
          lMap[l.index] = l.href;
        });
        setLinkEdits(lMap);
        const iMap: Record<number, string> = {};
        (data.images || []).forEach((img: ParsedImageAsset) => {
          iMap[img.index] = img.src;
        });
        setImageEdits(iMap);
      }
    } catch {
      // ignore initial parse error
    } finally {
      setLoadingAssets(false);
    }
  }

  useEffect(() => {
    loadAssets(page.id);
    const heroBlock = page.blocks.find((b) => b.type === 'hero');
    if (heroBlock) {
      setAiHeadline(heroBlock.data.title || '');
      setAiSubheadline(heroBlock.data.subtitle || '');
      setAiCta(heroBlock.data.buttonText || 'Garantir Agora');
    } else if (page.page_type === 'presell_cookies') {
      setAiHeadline(page.cookie_config.headline);
      setAiSubheadline(page.cookie_config.description);
      setAiCta(page.cookie_config.acceptButtonText);
    }
  }, [page.id]);

  async function persistPage(nextPage: PageRecord, silent = false): Promise<PageRecord | null> {
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${nextPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nextPage.title,
          slug: nextPage.slug,
          folder_id: nextPage.folder_id,
          domain_id: nextPage.domain_id,
          status: nextPage.status,
          language: nextPage.language,
          affiliate_url: nextPage.affiliate_url,
          source_url: nextPage.source_url,
          html_content: nextPage.html_content,
          blocks: nextPage.blocks,
          theme: nextPage.theme,
          cookie_config: nextPage.cookie_config,
          scripts: nextPage.scripts,
          conversion_tools: nextPage.conversion_tools,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Erro ao salvar página.');
      setPage(saved);
      onSaved(saved);
      setPreviewKey((k) => k + 1);
      if (!silent) onNotify('Alterações salvas e publicadas!');
      await loadAssets(saved.id);
      return saved;
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Falha ao salvar.', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyAssetReplacements(useBulk = false) {
    // First save any pending edits
    await persistPage(page, true);
    try {
      const res = await fetch(`/api/pages/${page.id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkReplacements: useBulk ? undefined : linkEdits,
          imageReplacements: useBulk ? undefined : imageEdits,
          bulkCheckoutUrl: useBulk ? bulkCheckoutUrl.trim() : undefined,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Erro ao atualizar links/imagens.');
      setPage(updated);
      onSaved(updated);
      setPreviewKey((k) => k + 1);
      await loadAssets(updated.id);
      onNotify(
        useBulk
          ? 'Links de checkout atualizados em massa!'
          : 'Links e imagens atualizados na página!'
      );
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao atualizar.', 'error');
    }
  }

  async function handleTranslatePage(targetLang: PageLanguage) {
    setPage((prev) => ({ ...prev, language: targetLang }));
    if (page.blocks.length === 0 && !page.html_content) return;

    setTranslating(true);
    try {
      if (page.blocks.length > 0 && page.page_type !== 'cloned') {
        const res = await fetch('/api/ai/translate-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks: page.blocks, targetLanguage: targetLang }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na tradução.');
        const next = { ...page, language: targetLang, blocks: data.blocks };
        await persistPage(next, true);
        onNotify(`Blocos traduzidos para ${LANGUAGE_LABELS[targetLang]}!`);
      } else if (page.source_url) {
        const res = await fetch('/api/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: page.source_url,
            stripTrackers: true,
            translateTo: targetLang,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao traduzir página clonada.');
        const next = { ...page, language: targetLang, html_content: data.html };
        await persistPage(next, true);
        onNotify(`Página traduzida para ${LANGUAGE_LABELS[targetLang]}!`);
      }
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao traduzir.', 'error');
    } finally {
      setTranslating(false);
    }
  }

  async function handleGenerateVariations() {
    setLoadingVariations(true);
    try {
      const res = await fetch('/api/ai/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: aiHeadline,
          subheadline: aiSubheadline,
          cta: aiCta,
          productContext: aiProductContext || page.title,
          language: page.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar variações.');
      setVariations(data.variations || []);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao gerar variações.', 'error');
    } finally {
      setLoadingVariations(false);
    }
  }

  async function handleApplyVariation(v: CopyVariation) {
    if (page.page_type === 'presell_cookies') {
      const next = {
        ...page,
        cookie_config: {
          ...page.cookie_config,
          headline: v.headline,
          description: v.subheadline,
          acceptButtonText: v.cta,
        },
      };
      await persistPage(next, true);
      onNotify('Variação aplicada na Presell!');
      return;
    }

    if (page.blocks.length > 0 && page.page_type !== 'cloned') {
      const updatedBlocks = page.blocks.map((b, idx) => {
        if (b.type === 'hero' || (idx === 0 && b.data.title !== undefined)) {
          return {
            ...b,
            data: {
              ...b.data,
              title: v.headline,
              subtitle: v.subheadline,
              buttonText: b.data.buttonText !== undefined ? v.cta : b.data.buttonText,
            },
          };
        }
        return b;
      });
      const next = { ...page, blocks: updatedBlocks };
      await persistPage(next, true);
      onNotify('Variação aplicada no Hero da página!');
    } else if (page.html_content) {
      const replacements: Array<{ find: string; replace: string }> = [];
      if (aiHeadline.trim()) replacements.push({ find: aiHeadline.trim(), replace: v.headline });
      if (aiSubheadline.trim())
        replacements.push({ find: aiSubheadline.trim(), replace: v.subheadline });
      if (replacements.length > 0) {
        const res = await fetch(`/api/pages/${page.id}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textReplacements: replacements }),
        });
        const updated = await res.json();
        if (res.ok) {
          setPage(updated);
          onSaved(updated);
          setPreviewKey((k) => k + 1);
          onNotify('Variação aplicada no HTML!');
        }
      } else {
        onNotify('Informe a headline atual no campo acima para substituição direta.', 'error');
      }
    }
  }

  async function handleRunComplianceAudit() {
    setLoadingCompliance(true);
    try {
      const textToAudit =
        page.page_type === 'presell_cookies'
          ? `${page.cookie_config.headline}\n${page.cookie_config.description}\n${page.cookie_config.previewHeadline}`
          : page.blocks.length > 0
          ? page.blocks
              .map((b) =>
                [b.data.eyebrow, b.data.title, b.data.subtitle, b.data.content, b.data.buttonText]
                  .filter(Boolean)
                  .join('\n')
              )
              .join('\n\n')
          : plainText;

      const res = await fetch('/api/ai/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageText: textToAudit,
          language: page.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na auditoria.');
      setComplianceResult(data);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro na auditoria de compliance.', 'error');
    } finally {
      setLoadingCompliance(false);
    }
  }

  async function handleReplaceUnsafePhrase(find: string, replace: string) {
    try {
      const res = await fetch(`/api/pages/${page.id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textReplacements: [{ find, replace }] }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Erro ao substituir.');
      setPage(updated);
      onSaved(updated);
      setPreviewKey((k) => k + 1);
      onNotify('Texto substituído por alternativa segura!');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao substituir trecho.', 'error');
    }
  }

  // Block editor helpers
  function updateBlock(index: number, patch: Partial<PageBlock['data']>) {
    setPage((prev) => {
      const nextBlocks = [...prev.blocks];
      nextBlocks[index] = { ...nextBlocks[index], data: { ...nextBlocks[index].data, ...patch } };
      return { ...prev, blocks: nextBlocks };
    });
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= page.blocks.length) return;
    setPage((prev) => {
      const next = [...prev.blocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, blocks: next };
    });
  }

  function removeBlock(index: number) {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  }

  function addBlock(type: BlockType) {
    setPage((prev) => ({
      ...prev,
      blocks: [...prev.blocks, createEmptyBlock(type)],
    }));
  }

  const inlineVisualSrcDoc = useMemo(() => {
    if (page.html_content) {
      return buildInlineEditableHtml(page.html_content);
    }
    return '';
  }, [page.html_content, previewKey]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#121316]">
      {/* Studio Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#1C1E24]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>

          <div className="min-w-0">
            <input
              type="text"
              value={page.title}
              onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
              className="w-56 sm:w-72 truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-bold text-[#F4F4F6] hover:border-white/[0.08] focus:border-[#FF6B00] focus:bg-[#262932] focus:outline-none"
            />
            <div className="flex items-center gap-1.5 px-1.5 font-mono text-[11px] text-[#9CA3AF]">
              <span>/p/</span>
              <input
                type="text"
                value={page.slug}
                onChange={(e) => setPage((p) => ({ ...p, slug: e.target.value }))}
                className="w-40 bg-transparent text-[#F4F4F6] focus:text-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#121316] p-1">
          {page.page_type === 'presell_cookies' ? (
            <button
              type="button"
              onClick={() => setMode('presell')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === 'presell' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Configurador Presell
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode('visual')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'visual' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Visual Inline
              </button>
              <button
                type="button"
                onClick={() => setMode('blocks')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'blocks' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Blocos
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'code' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#121316] p-1">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              title="Desktop"
              className={`rounded-md p-1.5 ${
                viewport === 'desktop' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF]'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              title="Tablet"
              className={`rounded-md p-1.5 ${
                viewport === 'tablet' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF]'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              title="Mobile"
              className={`rounded-md p-1.5 ${
                viewport === 'mobile' ? 'bg-[#262932] text-white' : 'text-[#9CA3AF]'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <select
            value={page.status}
            onChange={(e) =>
              setPage((p) => ({ ...p, status: e.target.value as 'published' | 'draft' }))
            }
            className="rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-2 text-xs font-medium text-[#F4F4F6] focus:outline-none"
          >
            <option value="published">Publicada</option>
            <option value="draft">Rascunho</option>
          </select>

          <a
            href={`/api/pages/${page.id}/export`}
            download={`${page.slug}.html`}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            .HTML
          </a>

          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ao Vivo
          </a>

          <button
            type="button"
            onClick={() => persistPage(page)}
            disabled={saving}
            className="cta-gradient flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#0D0E11] p-5">
          {mode === 'visual' && (
            <div className="mx-auto flex h-full flex-col items-center">
              {page.html_content ? (
                <>
                  <div className="mb-3 flex w-full max-w-[1100px] items-center justify-between text-xs text-[#9CA3AF]">
                    <span>
                      Modo Edição Inline ativo: clique diretamente em qualquer título, texto ou botão abaixo para editar. Clique em Salvar ao concluir.
                    </span>
                  </div>
                  <div
                    className={`flex-1 min-h-[640px] overflow-hidden rounded-xl border border-white/[0.1] bg-white shadow-2xl transition-all ${
                      viewport === 'mobile'
                        ? 'w-[390px] max-w-full'
                        : viewport === 'tablet'
                        ? 'w-[768px] max-w-full'
                        : 'w-full max-w-[1100px]'
                    }`}
                  >
                    <iframe
                      ref={iframeRef}
                      srcDoc={inlineVisualSrcDoc}
                      title="Editor Visual Inline"
                      sandbox="allow-same-origin allow-scripts"
                      className="h-full min-h-[640px] w-full border-0"
                    />
                  </div>
                </>
              ) : (
                <div
                  className={`flex-1 min-h-[640px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#121316] shadow-2xl transition-all ${
                    viewport === 'mobile'
                      ? 'w-[390px] max-w-full'
                      : viewport === 'tablet'
                      ? 'w-[768px] max-w-full'
                      : 'w-full max-w-[1100px]'
                  }`}
                >
                  <iframe
                    key={previewKey}
                    src={`/api/pages/${page.id}/preview?t=${previewKey}`}
                    title="Pré-visualização ao vivo"
                    className="h-full min-h-[640px] w-full border-0"
                  />
                </div>
              )}
            </div>
          )}

          {mode === 'presell' && (
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5 lg:col-span-5">
                <h3 className="text-sm font-bold text-[#F4F4F6]">Configuração da Presell de Cookies</h3>
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Link de Afiliado / Destino</label>
                  <input
                    type="text"
                    value={page.affiliate_url}
                    onChange={(e) => setPage({ ...page, affiliate_url: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Título do Modal</label>
                  <input
                    type="text"
                    value={page.cookie_config.headline}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        cookie_config: { ...page.cookie_config, headline: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Texto Explicativo</label>
                  <textarea
                    rows={3}
                    value={page.cookie_config.description}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        cookie_config: { ...page.cookie_config, description: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#9CA3AF]">Botão Aceitar</label>
                    <input
                      type="text"
                      value={page.cookie_config.acceptButtonText}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          cookie_config: {
                            ...page.cookie_config,
                            acceptButtonText: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#9CA3AF]">Posição</label>
                    <select
                      value={page.cookie_config.modalPosition}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          cookie_config: {
                            ...page.cookie_config,
                            modalPosition: e.target.value as 'center' | 'bottom' | 'top',
                          },
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="center">Centro</option>
                      <option value="bottom">Rodapé</option>
                      <option value="top">Topo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#9CA3AF]">Marca de Fundo</label>
                    <input
                      type="text"
                      value={page.cookie_config.previewBrandName}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          cookie_config: {
                            ...page.cookie_config,
                            previewBrandName: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#9CA3AF]">
                      Desfoque ({page.cookie_config.blurIntensity}px)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={page.cookie_config.blurIntensity}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          cookie_config: {
                            ...page.cookie_config,
                            blurIntensity: Number(e.target.value),
                          },
                        })
                      }
                      className="mt-2 w-full accent-[#FF6B00]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => persistPage(page)}
                  className="cta-gradient w-full rounded-xl py-2.5 text-xs font-semibold"
                >
                  Atualizar Pré-visualização e Salvar
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121316] lg:col-span-7 min-h-[540px]">
                <iframe
                  key={previewKey}
                  src={`/api/pages/${page.id}/preview?t=${previewKey}`}
                  title="Preview Presell"
                  className="h-full min-h-[540px] w-full border-0"
                />
              </div>
            </div>
          )}

          {mode === 'blocks' && (
            <div className="mx-auto max-w-3xl space-y-5">
              {/* Theme & Language quick bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Fonte</label>
                    <select
                      value={page.theme.fontFamily}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: {
                            ...page.theme,
                            fontFamily: e.target.value as PageRecord['theme']['fontFamily'],
                          },
                        })
                      }
                      className="mt-1 rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Outfit">Outfit</option>
                      <option value="DM Sans">DM Sans</option>
                      <option value="Playfair Display">Playfair Display</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Largura</label>
                    <select
                      value={page.theme.maxWidth}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: {
                            ...page.theme,
                            maxWidth: e.target.value as 'sm' | 'md' | 'lg',
                          },
                        })
                      }
                      className="mt-1 rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="sm">Estreita (Bio / Mobile)</option>
                      <option value="md">Média (Presell / Captura)</option>
                      <option value="lg">Larga (Oferta / Vendas)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Fundo</label>
                    <input
                      type="color"
                      value={page.theme.backgroundColor}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: { ...page.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="mt-1 h-8 w-10 cursor-pointer rounded border border-white/[0.1] bg-[#262932]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Cartão</label>
                    <input
                      type="color"
                      value={page.theme.surfaceColor}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: { ...page.theme, surfaceColor: e.target.value },
                        })
                      }
                      className="mt-1 h-8 w-10 cursor-pointer rounded border border-white/[0.1] bg-[#262932]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Margem Y (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={page.theme.paddingY ?? 32}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: { ...page.theme, paddingY: Number(e.target.value) },
                        })
                      }
                      className="mt-1 w-16 rounded-lg border border-white/[0.08] bg-[#262932] px-2 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF]">Gap (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={page.theme.blockGap ?? 16}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          theme: { ...page.theme, blockGap: Number(e.target.value) },
                        })
                      }
                      className="mt-1 w-16 rounded-lg border border-white/[0.08] bg-[#262932] px-2 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={page.language}
                    onChange={(e) => handleTranslatePage(e.target.value as PageLanguage)}
                    disabled={translating}
                    className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="PT">Idioma: PT</option>
                    <option value="EN">Traduzir: EN</option>
                    <option value="ES">Traduzir: ES</option>
                    <option value="FR">Traduzir: FR</option>
                  </select>
                  {translating && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B00]" />}
                </div>
              </div>

              {/* Draggable Block List */}
              <div className="space-y-3">
                {page.blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== idx) {
                        moveBlock(dragIndex, idx);
                      }
                      setDragIndex(null);
                    }}
                    className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-4 transition-colors hover:border-white/[0.16]"
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
                        <GripVertical className="h-4 w-4 cursor-grab text-[#9CA3AF]" />
                        <span>
                          {BLOCK_PALETTE.find((b) => b.type === block.type)?.label || block.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx - 1)}
                          disabled={idx === 0}
                          className="rounded p-1 text-[#9CA3AF] hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx + 1)}
                          disabled={idx === page.blocks.length - 1}
                          className="rounded p-1 text-[#9CA3AF] hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(idx)}
                          className="rounded p-1 text-[#9CA3AF] hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {block.type === 'hero' && (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={block.data.eyebrow || ''}
                          onChange={(e) => updateBlock(idx, { eyebrow: e.target.value })}
                          placeholder="Chamada curta superior (opcional)"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-[#FF6B00] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          placeholder="Headline principal"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm font-bold text-white focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={block.data.subtitle || ''}
                          onChange={(e) => updateBlock(idx, { subtitle: e.target.value })}
                          placeholder="Subheadline"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-[#D1D5DB] focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            value={block.data.buttonText || ''}
                            onChange={(e) => updateBlock(idx, { buttonText: e.target.value })}
                            placeholder="Texto do botão (opcional)"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={block.data.buttonUrl || ''}
                            onChange={(e) => updateBlock(idx, { buttonUrl: e.target.value })}
                            placeholder="URL de destino"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'text' && (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          placeholder="Título do bloco"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm font-semibold text-white focus:outline-none"
                        />
                        <textarea
                          rows={4}
                          value={block.data.content || ''}
                          onChange={(e) => updateBlock(idx, { content: e.target.value })}
                          placeholder="Conteúdo do parágrafo"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs leading-relaxed text-[#D1D5DB] focus:outline-none"
                        />
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <input
                          type="text"
                          value={block.data.imageUrl || ''}
                          onChange={(e) => updateBlock(idx, { imageUrl: e.target.value })}
                          placeholder="URL da imagem"
                          className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          value={block.data.imageAlt || ''}
                          onChange={(e) => updateBlock(idx, { imageAlt: e.target.value })}
                          placeholder="Texto alternativo (alt)"
                          className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    )}

                    {block.type === 'video' && (
                      <input
                        type="text"
                        value={block.data.videoUrl || ''}
                        onChange={(e) => updateBlock(idx, { videoUrl: e.target.value })}
                        placeholder="Link do YouTube ou Vimeo"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    )}

                    {block.type === 'cta' && (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          placeholder="Título do CTA"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm font-semibold text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          value={block.data.subtitle || ''}
                          onChange={(e) => updateBlock(idx, { subtitle: e.target.value })}
                          placeholder="Subtítulo"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-[#D1D5DB] focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            value={block.data.buttonText || ''}
                            onChange={(e) => updateBlock(idx, { buttonText: e.target.value })}
                            placeholder="Texto do botão"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={block.data.buttonUrl || ''}
                            onChange={(e) => updateBlock(idx, { buttonUrl: e.target.value })}
                            placeholder="URL do checkout"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'lead_form' && (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={block.data.title || ''}
                          onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          placeholder="Título do formulário"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-sm font-semibold text-white focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            value={block.data.submitText || ''}
                            onChange={(e) => updateBlock(idx, { submitText: e.target.value })}
                            placeholder="Texto do botão"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={block.data.successMessage || ''}
                            onChange={(e) => updateBlock(idx, { successMessage: e.target.value })}
                            placeholder="Mensagem de sucesso"
                            className="rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                          <input
                            type="checkbox"
                            checked={Boolean(block.data.collectPhone)}
                            onChange={(e) => updateBlock(idx, { collectPhone: e.target.checked })}
                            className="h-4 w-4 accent-[#FF6B00]"
                          />
                          Solicitar WhatsApp / Telefone
                        </label>
                      </div>
                    )}

                    {block.type === 'countdown' && (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[10px] text-[#9CA3AF]">
                            Minutos
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={block.data.countdownMinutes ?? 15}
                            onChange={(e) =>
                              updateBlock(idx, { countdownMinutes: Number(e.target.value) })
                            }
                            className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-[#9CA3AF]">
                            Chamada acima
                          </label>
                          <input
                            type="text"
                            value={block.data.countdownLabel || ''}
                            onChange={(e) => updateBlock(idx, { countdownLabel: e.target.value })}
                            placeholder="Esta oferta expira em:"
                            className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-[#9CA3AF]">
                            Texto após expirar
                          </label>
                          <input
                            type="text"
                            value={block.data.countdownExpiredText || ''}
                            onChange={(e) =>
                              updateBlock(idx, { countdownExpiredText: e.target.value })
                            }
                            placeholder="Últimos minutos!"
                            className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'link_list' && (
                      <div className="space-y-2">
                        {(block.data.links || []).map((lnk, lIdx) => (
                          <div
                            key={lnk.id}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-white/[0.06] bg-[#262932] p-2.5 sm:grid-cols-12"
                          >
                            <input
                              type="text"
                              value={lnk.label}
                              onChange={(e) => {
                                const linksCopy = [...(block.data.links || [])];
                                linksCopy[lIdx] = { ...lnk, label: e.target.value };
                                updateBlock(idx, { links: linksCopy });
                              }}
                              placeholder="Título do link"
                              className="rounded bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white sm:col-span-5"
                            />
                            <input
                              type="text"
                              value={lnk.url}
                              onChange={(e) => {
                                const linksCopy = [...(block.data.links || [])];
                                linksCopy[lIdx] = { ...lnk, url: e.target.value };
                                updateBlock(idx, { links: linksCopy });
                              }}
                              placeholder="https://..."
                              className="rounded bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white sm:col-span-5"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const linksCopy = (block.data.links || []).filter(
                                  (_, i) => i !== lIdx
                                );
                                updateBlock(idx, { links: linksCopy });
                              }}
                              className="rounded bg-[#1C1E24] px-2 py-1.5 text-xs text-red-400 sm:col-span-2"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextLinks = [
                              ...(block.data.links || []),
                              {
                                id: Math.random().toString(36).slice(2, 8),
                                label: 'Novo Link',
                                url: 'https://exemplo.com',
                                highlight: false,
                              },
                            ];
                            updateBlock(idx, { links: nextLinks });
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar Link
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Block Palette */}
              <div className="rounded-2xl border border-dashed border-white/[0.14] bg-[#1C1E24]/50 p-4">
                <p className="mb-3 text-xs font-semibold text-[#9CA3AF]">Adicionar Novo Bloco</p>
                <div className="flex flex-wrap gap-2">
                  {BLOCK_PALETTE.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addBlock(item.type)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:border-[#FF6B00]/50 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#FF6B00]" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'code' && (
            <div className="mx-auto flex h-full max-w-5xl flex-col space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>Edição direta do código HTML da página</span>
                {page.html_content && (
                  <span className="font-mono">{page.html_content.length} caracteres</span>
                )}
              </div>
              <textarea
                value={page.html_content}
                onChange={(e) => setPage((p) => ({ ...p, html_content: e.target.value }))}
                placeholder="Cole ou edite o código HTML completo aqui..."
                className="flex-1 min-h-[560px] w-full rounded-xl border border-white/[0.08] bg-[#1C1E24] p-4 font-mono text-xs leading-relaxed text-[#E5E7EB] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Right Inspector Drawer */}
        <aside className="w-[380px] shrink-0 overflow-y-auto border-l border-white/[0.08] bg-[#1C1E24] flex flex-col">
          <div className="grid grid-cols-4 border-b border-white/[0.08] bg-[#121316]/60 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setInspectorTab('assets')}
              className={`rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                inspectorTab === 'assets'
                  ? 'bg-[#262932] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Links/Imgs
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('ai')}
              className={`rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                inspectorTab === 'ai'
                  ? 'bg-[#262932] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              IA &amp; CRO
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('scripts')}
              className={`rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                inspectorTab === 'scripts'
                  ? 'bg-[#262932] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Pixels
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('conversion')}
              className={`rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                inspectorTab === 'conversion'
                  ? 'bg-[#262932] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Conversão
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {inspectorTab === 'assets' && (
              <div className="space-y-5">
                <div className="space-y-2.5 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
                    <Link2 className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span>Substituir Links de Checkout em Massa</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#9CA3AF]">
                    Troque todos os botões de compra/checkout de uma vez mantendo o repasse automático de UTMs.
                  </p>
                  <input
                    type="text"
                    value={bulkCheckoutUrl}
                    onChange={(e) => setBulkCheckoutUrl(e.target.value)}
                    placeholder="https://pay.hotmart.com/seu-link"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyAssetReplacements(true)}
                    className="cta-gradient w-full rounded-lg py-2 text-xs font-semibold"
                  >
                    Substituir Todos os Checkouts
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F4F4F6]">
                      Links Mapeados ({links.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => loadAssets(page.id)}
                      className="text-[11px] text-[#FF6B00] hover:underline"
                    >
                      {loadingAssets ? 'Lendo...' : 'Reescanear'}
                    </button>
                  </div>
                  {links.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF]">Nenhum link &lt;a&gt; detectado.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {links.map((lnk) => (
                        <div
                          key={lnk.index}
                          className="rounded-lg border border-white/[0.06] bg-[#262932] p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] font-medium text-[#F4F4F6]">
                              {lnk.text}
                            </span>
                            {lnk.isCheckoutCandidate && (
                              <span className="text-[10px] font-semibold text-[#FF6B00]">
                                Checkout
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={linkEdits[lnk.index] ?? lnk.href}
                            onChange={(e) =>
                              setLinkEdits((prev) => ({ ...prev, [lnk.index]: e.target.value }))
                            }
                            className="w-full rounded bg-[#1C1E24] px-2 py-1 font-mono text-[11px] text-[#D1D5DB] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
                    <ImageIcon className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span>Imagens da Página ({images.length})</span>
                  </div>
                  {images.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF]">Nenhuma tag &lt;img&gt; detectada.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {images.map((img) => (
                        <div
                          key={img.index}
                          className="rounded-lg border border-white/[0.06] bg-[#262932] p-2.5 space-y-1.5"
                        >
                          <div className="truncate text-[11px] font-medium text-[#D1D5DB]">
                            {img.alt}
                          </div>
                          <input
                            type="text"
                            value={imageEdits[img.index] ?? img.src}
                            onChange={(e) =>
                              setImageEdits((prev) => ({ ...prev, [img.index]: e.target.value }))
                            }
                            className="w-full rounded bg-[#1C1E24] px-2 py-1 font-mono text-[11px] text-[#D1D5DB] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(links.length > 0 || images.length > 0) && (
                  <button
                    type="button"
                    onClick={() => handleApplyAssetReplacements(false)}
                    className="w-full rounded-lg border border-white/[0.12] bg-[#262932] py-2 text-xs font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Aplicar Troca de Links e Imagens
                  </button>
                )}
              </div>
            )}

            {inspectorTab === 'ai' && (
              <div className="space-y-6">
                {/* A/B Copy Generator */}
                <div className="space-y-3 border-b border-white/[0.06] pb-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F4F4F6]">
                    <Sparkles className="h-4 w-4 text-[#FF6B00]" />
                    <span>Gerador de Variações A/B (Gemini)</span>
                  </div>
                  <input
                    type="text"
                    value={aiProductContext}
                    onChange={(e) => setAiProductContext(e.target.value)}
                    placeholder="Produto / Nicho da oferta"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={aiHeadline}
                    onChange={(e) => setAiHeadline(e.target.value)}
                    placeholder="Headline atual"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={aiSubheadline}
                    onChange={(e) => setAiSubheadline(e.target.value)}
                    placeholder="Subheadline atual"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateVariations}
                    disabled={loadingVariations}
                    className="cta-gradient flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {loadingVariations ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Gerando Variações...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Gerar 5 Headlines &amp; CTAs A/B
                      </>
                    )}
                  </button>

                  {variations.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      {variations.map((v, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-white/[0.08] bg-[#262932] p-3 space-y-1.5"
                        >
                          <div className="text-[11px] font-semibold text-[#FF6B00]">{v.angle}</div>
                          <div className="text-xs font-bold text-[#F4F4F6]">{v.headline}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{v.subheadline}</div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-[11px] text-[#D1D5DB]">
                              CTA: {v.cta}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyVariation(v)}
                              className="flex items-center gap-1 rounded-md bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#FF6B00]"
                            >
                              <Check className="h-3 w-3" />
                              Aplicar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Anti-Block Compliance Scanner */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F4F4F6]">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Scanner Anti-Bloqueio (Meta &amp; Google Ads)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#9CA3AF]">
                    Audita o texto da página em busca de promessas agressivas ou termos proibidos e sugere substituições seguras.
                  </p>
                  <button
                    type="button"
                    onClick={handleRunComplianceAudit}
                    disabled={loadingCompliance}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-[#262932] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08] disabled:opacity-60"
                  >
                    {loadingCompliance ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Auditando Políticas...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-[#FF6B00]" />
                        Auditar Compliance Agora
                      </>
                    )}
                  </button>

                  {complianceResult && (
                    <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#121316] p-3.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Risco Geral:</span>
                        <span
                          className={
                            complianceResult.overallRisk === 'high'
                              ? 'text-red-400'
                              : complianceResult.overallRisk === 'medium'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {complianceResult.overallRisk === 'high'
                            ? 'Alto Risco'
                            : complianceResult.overallRisk === 'medium'
                            ? 'Risco Moderado'
                            : 'Baixo Risco (Seguro)'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#9CA3AF]">
                        {complianceResult.summary}
                      </p>

                      {complianceResult.flags.map((flag, fIdx) => (
                        <div
                          key={fIdx}
                          className="rounded-lg border border-white/[0.06] bg-[#1C1E24] p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-amber-400">{flag.platform}</span>
                            <span className="text-[#9CA3AF]">{flag.risk}</span>
                          </div>
                          <p className="text-[11px] text-red-300">&ldquo;{flag.phrase}&rdquo;</p>
                          <p className="text-[11px] text-[#9CA3AF]">{flag.reason}</p>
                          <p className="text-[11px] text-emerald-300">
                            Sugestão: &ldquo;{flag.safeAlternative}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleReplaceUnsafePhrase(flag.phrase, flag.safeAlternative)
                            }
                            className="mt-1 w-full rounded bg-[#262932] py-1.5 text-[11px] font-semibold text-white hover:bg-[#FF6B00]"
                          >
                            Aplicar Substituição Segura
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Translation */}
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
                    <Languages className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span>Traduzir Página Completa</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['PT', 'EN', 'ES', 'FR'] as PageLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        disabled={translating}
                        onClick={() => handleTranslatePage(lang)}
                        className={`rounded-lg border py-1.5 text-xs font-semibold ${
                          page.language === lang
                            ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF6B00]'
                            : 'border-white/[0.08] bg-[#262932] text-[#D1D5DB] hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'scripts' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                    Meta Pixel ID (Facebook)
                  </label>
                  <input
                    type="text"
                    value={page.scripts.metaPixelId}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        scripts: { ...page.scripts, metaPixelId: e.target.value },
                      })
                    }
                    placeholder="Ex: 123456789012345"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                    Google Analytics 4 (G-...)
                  </label>
                  <input
                    type="text"
                    value={page.scripts.ga4Id}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        scripts: { ...page.scripts, ga4Id: e.target.value },
                      })
                    }
                    placeholder="Ex: G-XXXXXXXXXX"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                    Google Tag Manager (GTM-...)
                  </label>
                  <input
                    type="text"
                    value={page.scripts.gtmId}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        scripts: { ...page.scripts, gtmId: e.target.value },
                      })
                    }
                    placeholder="Ex: GTM-XXXXXXX"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                    TikTok Pixel ID
                  </label>
                  <input
                    type="text"
                    value={page.scripts.tiktokPixelId}
                    onChange={(e) =>
                      setPage({
                        ...page,
                        scripts: { ...page.scripts, tiktokPixelId: e.target.value },
                      })
                    }
                    placeholder="Ex: CXXXXXXXXXXXXXXXX"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 font-mono text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>

                <div className="border-t border-white/[0.06] pt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                      Scripts no &lt;head&gt;
                    </label>
                    <textarea
                      rows={3}
                      value={page.scripts.headHtml}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          scripts: { ...page.scripts, headHtml: e.target.value },
                        })
                      }
                      placeholder="<!-- Cole tags ou verificações -->"
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] p-2.5 font-mono text-[11px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                      Abertura do &lt;body&gt;
                    </label>
                    <textarea
                      rows={2}
                      value={page.scripts.bodyStartHtml}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          scripts: { ...page.scripts, bodyStartHtml: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] p-2.5 font-mono text-[11px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">
                      Fechamento do &lt;/body&gt;
                    </label>
                    <textarea
                      rows={2}
                      value={page.scripts.bodyEndHtml}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          scripts: { ...page.scripts, bodyEndHtml: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] p-2.5 font-mono text-[11px] text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'conversion' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#9CA3AF]">
                      Pasta / Campanha
                    </label>
                    <select
                      value={page.folder_id || ''}
                      onChange={(e) =>
                        setPage({ ...page, folder_id: e.target.value || null })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-2 text-xs text-white focus:outline-none"
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
                    <label className="mb-1 block text-[11px] font-semibold text-[#9CA3AF]">
                      Domínio Próprio
                    </label>
                    <select
                      value={page.domain_id || ''}
                      onChange={(e) =>
                        setPage({ ...page, domain_id: e.target.value || null })
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#262932] px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="">Domínio padrão</option>
                      {domains.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.hostname}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Flow Tracking Toggle */}
                <div className="rounded-xl border border-white/[0.08] bg-[#262932] p-3.5 space-y-2">
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>Repasse de UTMs (Flow Tracking)</span>
                    <input
                      type="checkbox"
                      checked={page.conversion_tools.utmPassthroughEnabled}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          conversion_tools: {
                            ...page.conversion_tools,
                            utmPassthroughEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                  </label>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Captura e repassa utm_source, utm_campaign, gclid, fbclid, src e sck para todos os botões e formulários.
                  </p>
                </div>

                {/* Back-Redirect Toggle */}
                <div className="rounded-xl border border-white/[0.08] bg-[#262932] p-3.5 space-y-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>Back-Redirect (Botão Voltar)</span>
                    <input
                      type="checkbox"
                      checked={page.conversion_tools.backRedirectEnabled}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          conversion_tools: {
                            ...page.conversion_tools,
                            backRedirectEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                  </label>
                  {page.conversion_tools.backRedirectEnabled && (
                    <input
                      type="text"
                      value={page.conversion_tools.backRedirectUrl}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          conversion_tools: {
                            ...page.conversion_tools,
                            backRedirectUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://oferta-desconto.com"
                      className="w-full rounded-lg border border-white/[0.08] bg-[#1C1E24] px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  )}
                </div>

                {/* Delay Button Toggle */}
                <div className="rounded-xl border border-white/[0.08] bg-[#262932] p-3.5 space-y-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>Delay de Botão / Checkout</span>
                    <input
                      type="checkbox"
                      checked={page.conversion_tools.delayEnabled}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          conversion_tools: {
                            ...page.conversion_tools,
                            delayEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                  </label>
                  {page.conversion_tools.delayEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-[#9CA3AF]">Segundos</label>
                        <input
                          type="number"
                          min={1}
                          value={page.conversion_tools.delaySeconds}
                          onChange={(e) =>
                            setPage({
                              ...page,
                              conversion_tools: {
                                ...page.conversion_tools,
                                delaySeconds: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/[0.08] bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-[#9CA3AF]">Seletor CSS</label>
                        <input
                          type="text"
                          value={page.conversion_tools.delaySelector}
                          onChange={(e) =>
                            setPage({
                              ...page,
                              conversion_tools: {
                                ...page.conversion_tools,
                                delaySelector: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/[0.08] bg-[#1C1E24] px-2.5 py-1.5 font-mono text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Legal Footer Toggle */}
                <div className="rounded-xl border border-white/[0.08] bg-[#262932] p-3.5 space-y-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>Rodapé Legal Automático</span>
                    <input
                      type="checkbox"
                      checked={page.conversion_tools.legalFooterEnabled}
                      onChange={(e) =>
                        setPage({
                          ...page,
                          conversion_tools: {
                            ...page.conversion_tools,
                            legalFooterEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                  </label>
                  {page.conversion_tools.legalFooterEnabled && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={page.conversion_tools.companyName}
                        onChange={(e) =>
                          setPage({
                            ...page,
                            conversion_tools: {
                              ...page.conversion_tools,
                              companyName: e.target.value,
                            },
                          })
                        }
                        placeholder="Razão social ou marca"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="email"
                        value={page.conversion_tools.contactEmail}
                        onChange={(e) =>
                          setPage({
                            ...page,
                            conversion_tools: {
                              ...page.conversion_tools,
                              contactEmail: e.target.value,
                            },
                          })
                        }
                        placeholder="E-mail de suporte"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

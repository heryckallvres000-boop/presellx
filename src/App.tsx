import {
  BarChart3,
  Copy,
  CopyPlus,
  Cookie,
  Download,
  ExternalLink,
  Eye,
  FolderPlus,
  Globe,
  Layers,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { ClonerView } from './components/ClonerView.tsx';
import { CookiePresellView } from './components/CookiePresellView.tsx';
import { DomainsView } from './components/DomainsView.tsx';
import { PageEditor } from './components/PageEditor.tsx';
import { PreviewModal } from './components/PreviewModal.tsx';
import { TemplatesView } from './components/TemplatesView.tsx';
import { PAGE_TYPE_LABELS } from './data/templates.ts';
import type { DomainRecord, FolderRecord, PageRecord, PageType } from './types.ts';

type ActiveSection = 'pages' | 'cloner' | 'cookies' | 'templates' | 'analytics' | 'domains';

export default function App() {
  const [section, setSection] = useState<ActiveSection>('pages');
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PageType>('ALL');

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [editingPage, setEditingPage] = useState<PageRecord | null>(null);
  const [previewPage, setPreviewPage] = useState<PageRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 3600);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, fRes, dRes] = await Promise.all([
        fetch('/api/pages'),
        fetch('/api/folders'),
        fetch('/api/domains'),
      ]);
      const [pData, fData, dData] = await Promise.all([pRes.json(), fRes.json(), dRes.json()]);
      setPages(Array.isArray(pData) ? pData : []);
      setFolders(Array.isArray(fData) ? fData : []);
      setDomains(Array.isArray(dData) ? dData : []);
    } catch {
      notify('Erro ao carregar dados do workspace.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateBlankPage() {
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nova Página em Blocos',
          folder_id: selectedFolderId !== 'ALL' ? selectedFolderId : folders[0]?.id || null,
          page_type: 'blocks',
          status: 'published',
          language: 'PT',
          blocks: [
            {
              id: Math.random().toString(36).slice(2, 10),
              type: 'hero',
              data: {
                eyebrow: 'Nova Campanha',
                title: 'Headline Clara e Orientada para Conversão',
                subtitle: 'Edite os blocos ou peça variações de copy ao Gemini na barra lateral.',
                buttonText: 'Continuar Agora',
                buttonUrl: 'https://checkout.exemplo.com',
                align: 'center',
                isCheckoutLink: true,
              },
            },
          ],
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Falha ao criar página.');
      setPages((prev) => [created, ...prev]);
      setEditingPage(created);
      notify('Nova página criada!');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Erro ao criar página.', 'error');
    }
  }

  async function handleDuplicatePage(id: string) {
    try {
      const res = await fetch(`/api/pages/${id}/duplicate`, { method: 'POST' });
      const copy = await res.json();
      if (!res.ok) throw new Error(copy.error || 'Falha ao duplicar página.');
      setPages((prev) => [copy, ...prev]);
      notify('Variação A/B duplicada com 1 clique!');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Erro ao duplicar página.', 'error');
    }
  }

  async function handleDeletePage(id: string) {
    try {
      await fetch(`/api/pages/${id}`, { method: 'DELETE' });
      setPages((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
      notify('Página excluída.');
    } catch {
      notify('Erro ao excluir página.', 'error');
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), color: '#FF6B00' }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Erro ao criar pasta.');
      setFolders((prev) => [...prev, created]);
      setNewFolderName('');
      setNewFolderOpen(false);
      notify('Pasta criada!');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Erro ao criar pasta.', 'error');
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId('ALL');
      notify('Pasta removida.');
    } catch {
      notify('Erro ao remover pasta.', 'error');
    }
  }

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (selectedFolderId !== 'ALL' && p.folder_id !== selectedFolderId) return false;
      if (typeFilter !== 'ALL' && p.page_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.slug.toLowerCase().includes(q) &&
          !p.affiliate_url.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [pages, selectedFolderId, typeFilter, searchQuery]);

  const navItems: Array<{ id: ActiveSection; label: string; icon: typeof LayoutGrid }> = [
    { id: 'pages', label: 'Páginas & Projetos', icon: LayoutGrid },
    { id: 'cloner', label: 'Clonador Inteligente', icon: Copy },
    { id: 'cookies', label: 'Presell de Cookies', icon: Cookie },
    { id: 'templates', label: 'Templates Prontos', icon: Layers },
    { id: 'analytics', label: 'Analytics & Leads', icon: BarChart3 },
    { id: 'domains', label: 'Domínios Próprios', icon: Globe },
  ];

  const sectionTitles: Record<ActiveSection, string> = {
    pages: 'Workspace / Páginas Ilimitadas',
    cloner: 'Workspace / Clonador & Tradutor',
    cookies: 'Workspace / Presell de Cookies',
    templates: 'Workspace / Templates Prontos',
    analytics: 'Workspace / Flow Tracking & Leads',
    domains: 'Workspace / Domínios Próprios',
  };

  return (
    <div className="flex min-h-screen bg-[#121316] text-[#F4F4F6]">
      {/* Left Sidebar */}
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-white/[0.08] bg-[#17191E] md:flex">
        <div className="flex h-16 items-center border-b border-white/[0.08] px-6">
          <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
            CODEXPAGES
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#262932] text-white'
                    : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#F4F4F6]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#FF6B00]' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Folders / Campaigns */}
          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-[#9CA3AF]">Pastas &amp; Campanhas</span>
              <button
                type="button"
                onClick={() => setNewFolderOpen((v) => !v)}
                aria-label="Criar nova pasta"
                className="rounded p-1 text-[#9CA3AF] hover:bg-white/[0.06] hover:text-white"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>

            {newFolderOpen && (
              <form onSubmit={handleCreateFolder} className="mb-2 flex gap-1.5 px-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta..."
                  className="w-full rounded-lg border border-white/[0.1] bg-[#262932] px-2.5 py-1.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                />
                <button
                  type="submit"
                  className="cta-gradient rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0"
                >
                  Ok
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedFolderId('ALL');
                setSection('pages');
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                selectedFolderId === 'ALL' && section === 'pages'
                  ? 'bg-white/[0.06] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <span>Todas as Páginas</span>
              <span className="font-mono tabular-nums">{pages.length}</span>
            </button>

            {folders.map((folder) => {
              const count = pages.filter((p) => p.folder_id === folder.id).length;
              return (
                <div
                  key={folder.id}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    selectedFolderId === folder.id && section === 'pages'
                      ? 'bg-white/[0.06] text-white'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setSection('pages');
                    }}
                    className="flex-1 truncate text-left"
                  >
                    {folder.name}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums">{count}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder.id)}
                      aria-label={`Excluir pasta ${folder.name}`}
                      className="hidden text-[#9CA3AF] hover:text-red-400 group-hover:inline-flex"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/[0.06] p-4 text-xs text-[#9CA3AF]">
          <p className="font-medium text-[#F4F4F6]">Uso Self-Hosted Ilimitado</p>
          <p className="mt-0.5 tabular-nums">
            {pages.length} páginas · {domains.length} domínios
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#121316]/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4 min-w-0">
            <span className="md:hidden text-base font-extrabold text-white whitespace-nowrap">
              CODEXPAGES
            </span>
            <h1 className="hidden md:block truncate text-sm font-semibold text-[#9CA3AF]">
              {sectionTitles[section]}
            </h1>
          </div>

          {/* Mobile quick nav */}
          <div className="flex items-center gap-2 md:hidden">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as ActiveSection)}
              className="rounded-lg border border-white/[0.08] bg-[#1C1E24] px-2.5 py-1.5 text-xs text-white"
            >
              {navItems.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCreateBlankPage}
              className="cta-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nova Página
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {section === 'pages' && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
                    Suas Páginas &amp; Presells
                  </h2>
                  <p className="mt-1 text-sm text-[#9CA3AF]">
                    Gerencie, edite inline, duplique para testes A/B ou exporte em HTML puro sem limites.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por título ou slug..."
                      className="w-64 rounded-xl border border-white/[0.08] bg-[#1C1E24] py-2 pl-9 pr-3 text-xs text-[#F4F4F6] placeholder-[#6B7280] focus:border-[#FF6B00] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Type filter bar */}
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-[#1C1E24] p-1 w-fit">
                {(
                  [
                    ['ALL', 'Todas'],
                    ['presell_cookies', 'Presell Cookies'],
                    ['cloned', 'Clonadas'],
                    ['offer', 'Oferta'],
                    ['lead_capture', 'Captura'],
                    ['bio', 'Link na Bio'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      typeFilter === key
                        ? 'bg-[#262932] text-white'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-sm text-[#9CA3AF]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando projetos...
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-12 text-center">
                  <p className="text-base font-semibold text-[#F4F4F6]">
                    Nenhuma página encontrada neste filtro
                  </p>
                  <p className="mt-1 text-sm text-[#9CA3AF]">
                    Crie uma nova página a partir dos templates prontos ou clone qualquer URL externa.
                  </p>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSection('templates')}
                      className="cta-gradient rounded-xl px-5 py-2.5 text-xs font-semibold"
                    >
                      Explorar Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => setSection('cloner')}
                      className="rounded-xl border border-white/[0.08] bg-[#262932] px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
                    >
                      Clonar URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {filteredPages.map((page) => {
                    const ctr =
                      page.views_count > 0
                        ? ((page.clicks_count / page.views_count) * 100).toFixed(1)
                        : '0.0';
                    const folderName = folders.find((f) => f.id === page.folder_id)?.name;
                    const domainName = domains.find((d) => d.id === page.domain_id)?.hostname;

                    return (
                      <div
                        key={page.id}
                        className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5 transition-colors hover:border-white/[0.16]"
                      >
                        <div>
                          <p className="text-xs text-[#9CA3AF]">
                            {PAGE_TYPE_LABELS[page.page_type]} · {page.language} ·{' '}
                            <span
                              className={
                                page.status === 'published' ? 'text-emerald-400' : 'text-amber-400'
                              }
                            >
                              {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                            </span>
                            {folderName ? ` · ${folderName}` : ''}
                          </p>

                          <h3 className="mt-1.5 text-lg font-bold text-[#F4F4F6] leading-snug">
                            {page.title}
                          </h3>

                          <p className="mt-1 truncate font-mono text-xs text-[#9CA3AF]">
                            {domainName ? `https://${domainName}` : ''}/p/{page.slug}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-white/[0.06] pt-4">
                          <div className="mb-4 flex items-center justify-between text-xs text-[#9CA3AF] tabular-nums">
                            <span>
                              <strong className="font-mono text-[#F4F4F6]">{page.views_count}</strong>{' '}
                              visitas ·{' '}
                              <strong className="font-mono text-[#F4F4F6]">{page.clicks_count}</strong>{' '}
                              cliques ·{' '}
                              <strong className="font-mono text-[#FF6B00]">{ctr}%</strong> CTR
                              {page.leads_count > 0
                                ? ` · ${page.leads_count} leads`
                                : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPage(page)}
                              className="cta-gradient flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewPage(page)}
                              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicatePage(page.id)}
                              title="Duplicar para Teste A/B"
                              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap"
                            >
                              <CopyPlus className="h-3.5 w-3.5" />
                              Duplicar A/B
                            </button>

                            <a
                              href={`/api/pages/${page.id}/export`}
                              download={`${page.slug}.html`}
                              title="Exportar HTML puro"
                              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-white/[0.08] whitespace-nowrap"
                            >
                              <Download className="h-3.5 w-3.5" />
                              .HTML
                            </a>

                            <a
                              href={`/p/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir URL ao vivo"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#262932] text-[#9CA3AF] hover:text-white"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            {confirmDeleteId === page.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePage(page.id)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(page.id)}
                                aria-label={`Excluir ${page.title}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#262932] text-[#9CA3AF] hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === 'cloner' && (
            <ClonerView
              folders={folders}
              onCreated={(created) => {
                setPages((prev) => [created, ...prev]);
                setEditingPage(created);
              }}
              onNotify={notify}
            />
          )}

          {section === 'cookies' && (
            <CookiePresellView
              folders={folders}
              onCreated={(created) => {
                setPages((prev) => [created, ...prev]);
                setEditingPage(created);
              }}
              onNotify={notify}
            />
          )}

          {section === 'templates' && (
            <TemplatesView
              folders={folders}
              onCreated={(created) => {
                setPages((prev) => [created, ...prev]);
                setEditingPage(created);
              }}
              onNotify={notify}
            />
          )}

          {section === 'analytics' && <AnalyticsView pages={pages} onNotify={notify} />}

          {section === 'domains' && (
            <DomainsView domains={domains} onRefresh={loadAll} onNotify={notify} />
          )}
        </main>
      </div>

      {/* Full-Screen Visual & Code Studio */}
      {editingPage && (
        <PageEditor
          initialPage={editingPage}
          folders={folders}
          domains={domains}
          onBack={() => {
            setEditingPage(null);
            loadAll();
          }}
          onSaved={(updated) => {
            setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
          onNotify={notify}
        />
      )}

      {/* Responsive Desktop/Mobile Preview Modal */}
      <PreviewModal page={previewPage} onClose={() => setPreviewPage(null)} />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`frosted-panel fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl ${
            toast.type === 'error'
              ? 'border-red-500/40 text-red-300'
              : 'border-white/15 text-[#F4F4F6]'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

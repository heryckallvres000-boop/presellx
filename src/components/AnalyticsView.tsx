import { Download, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PAGE_TYPE_LABELS } from '../data/templates.ts';
import type { AnalyticsOverview, LeadRecord, PageRecord } from '../types.ts';

interface AnalyticsViewProps {
  pages: PageRecord[];
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function AnalyticsView({ pages, onNotify }: AnalyticsViewProps) {
  const [selectedPageId, setSelectedPageId] = useState('');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubtab, setActiveSubtab] = useState<'overview' | 'leads'>('overview');

  async function loadData(pageId = selectedPageId) {
    setLoading(true);
    try {
      const [analyticsRes, leadsRes] = await Promise.all([
        fetch(`/api/analytics${pageId ? `?pageId=${encodeURIComponent(pageId)}` : ''}`),
        fetch('/api/leads'),
      ]);
      const analyticsData = await analyticsRes.json();
      const leadsData = await leadsRes.json();
      setOverview(analyticsData);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch {
      onNotify('Erro ao carregar estatísticas.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(selectedPageId);
  }, [selectedPageId]);

  async function handleDeleteLead(id: string) {
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      setLeads((prev) => prev.filter((l) => l.id !== id));
      onNotify('Lead removido.');
    } catch {
      onNotify('Erro ao remover lead.', 'error');
    }
  }

  const filteredLeads = selectedPageId
    ? leads.filter((l) => l.page_id === selectedPageId)
    : leads;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
            Flow Tracking, Métricas &amp; Leads
          </h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Atribuição nativa em tempo real de visualizações únicas, cliques nos botões, origem de tráfego e leads capturados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2 text-xs font-medium text-[#F4F4F6] focus:border-[#FF6B00] focus:outline-none"
          >
            <option value="">Todas as Páginas</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadData(selectedPageId)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1C1E24] px-3.5 py-2 text-xs font-medium text-[#F4F4F6] hover:bg-[#262932]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <a
            href="/api/leads/export"
            download="codexpages-leads.csv"
            className="cta-gradient flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Leads CSV
          </a>
        </div>
      </div>

      {/* Segmented subtabs */}
      <div className="flex items-center gap-1 self-start rounded-xl border border-white/[0.08] bg-[#1C1E24] p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubtab('overview')}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
            activeSubtab === 'overview'
              ? 'bg-[#262932] text-white'
              : 'text-[#9CA3AF] hover:text-white'
          }`}
        >
          Desempenho &amp; Origens
        </button>
        <button
          type="button"
          onClick={() => setActiveSubtab('leads')}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
            activeSubtab === 'leads'
              ? 'bg-[#262932] text-white'
              : 'text-[#9CA3AF] hover:text-white'
          }`}
        >
          Leads Capturados ({filteredLeads.length})
        </button>
      </div>

      {/* 4-column KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5">
          <p className="text-xs font-medium text-[#9CA3AF]">Visualizações Totais</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#F4F4F6] tabular-nums">
            {overview?.totalViews ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF] tabular-nums">
            {overview?.uniqueViews ?? 0} visitantes únicos
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5">
          <p className="text-xs font-medium text-[#9CA3AF]">Cliques em CTAs</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#F4F4F6] tabular-nums">
            {overview?.totalClicks ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Saídas rastreadas com UTM</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5">
          <p className="text-xs font-medium text-[#9CA3AF]">CTR Médio</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#FF6B00] tabular-nums">
            {overview?.ctr ?? 0}%
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Taxa de clique por visita</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5">
          <p className="text-xs font-medium text-[#9CA3AF]">Leads Capturados</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {overview?.totalLeads ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF] tabular-nums">
            Conversão de {overview?.conversionRate ?? 0}%
          </p>
        </div>
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-16 text-sm text-[#9CA3AF]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando métricas...
        </div>
      ) : activeSubtab === 'overview' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Page Performance */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] overflow-hidden lg:col-span-7">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-semibold text-[#F4F4F6]">Desempenho por Página</h3>
            </div>
            {!overview || overview.pages.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#9CA3AF]">
                Nenhuma visualização registrada ainda. Abra suas páginas publicadas para registrar visitas e cliques em tempo real.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[#9CA3AF]">
                      <th className="px-5 py-3 font-medium">Página</th>
                      <th className="px-3 py-3 text-right font-medium">Visitas</th>
                      <th className="px-3 py-3 text-right font-medium">Cliques</th>
                      <th className="px-3 py-3 text-right font-medium">CTR</th>
                      <th className="px-5 py-3 text-right font-medium">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {overview.pages.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <div className="font-medium text-[#F4F4F6]">{row.title}</div>
                          <div className="font-mono text-[11px] text-[#9CA3AF]">
                            /p/{row.slug} · {PAGE_TYPE_LABELS[row.page_type]}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#F4F4F6]">
                          {row.views}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#F4F4F6]">
                          {row.clicks}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#FF6B00]">
                          {row.ctr}%
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-emerald-400">
                          {row.leads}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Traffic Sources */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] overflow-hidden lg:col-span-5">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-semibold text-[#F4F4F6]">
                Origens de Tráfego (utm_source / Click IDs)
              </h3>
            </div>
            {!overview || overview.sources.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#9CA3AF]">
                Os parâmetros <span className="font-mono text-[#F4F4F6]">utm_source</span>,{' '}
                <span className="font-mono text-[#F4F4F6]">fbclid</span> e{' '}
                <span className="font-mono text-[#F4F4F6]">gclid</span> aparecerão aqui assim que o tráfego chegar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[#9CA3AF]">
                      <th className="px-5 py-3 font-medium">Origem</th>
                      <th className="px-3 py-3 text-right font-medium">Visitas</th>
                      <th className="px-3 py-3 text-right font-medium">Cliques</th>
                      <th className="px-5 py-3 text-right font-medium">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {overview.sources.map((src) => (
                      <tr key={src.source} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3 font-mono font-medium text-[#F4F4F6]">
                          {src.source}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#F4F4F6]">
                          {src.views}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#F4F4F6]">
                          {src.clicks}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-emerald-400">
                          {src.leads}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-4">
            <h3 className="text-sm font-semibold text-[#F4F4F6]">
              Base de Leads Capturados ({filteredLeads.length})
            </h3>
          </div>
          {filteredLeads.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#9CA3AF]">
              Nenhum lead capturado ainda. Utilize o template &ldquo;Página de Captura de Leads&rdquo; ou adicione um bloco de Formulário de Captura em qualquer página.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[#9CA3AF]">
                    <th className="px-5 py-3 font-medium">Contato</th>
                    <th className="px-4 py-3 font-medium">Página</th>
                    <th className="px-4 py-3 font-medium">Atribuição (UTM / Click ID)</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[#F4F4F6]">{lead.name || 'Sem nome'}</div>
                        <div className="text-[#9CA3AF]">
                          {lead.email}
                          {lead.phone ? ` · ${lead.phone}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#D1D5DB]">{lead.page_title || lead.page_id}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9CA3AF]">
                        {lead.utm_source || 'direct'}
                        {lead.utm_campaign ? ` / ${lead.utm_campaign}` : ''}
                        {lead.fbclid ? ' · fbclid' : ''}
                        {lead.gclid ? ' · gclid' : ''}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-[#9CA3AF]">
                        {new Date(lead.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          aria-label="Excluir lead"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-[#262932] text-[#9CA3AF] hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

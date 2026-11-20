import { CheckCircle2, Globe, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { DomainRecord } from '../types.ts';

interface DomainsViewProps {
  domains: DomainRecord[];
  onRefresh: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function DomainsView({ domains, onRefresh, onNotify }: DomainsViewProps) {
  const [hostname, setHostname] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!hostname.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: hostname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar domínio.');
      setHostname('');
      onNotify('Domínio adicionado! Siga as instruções de apontamento DNS abaixo.');
      onRefresh();
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao adicionar domínio.', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na verificação.');
      onNotify(
        data.verified ? `DNS verificado: ${data.details}` : data.details,
        data.verified ? 'success' : 'error'
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Erro ao verificar DNS.', 'error');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      onNotify('Domínio removido.');
      onRefresh();
    } catch {
      onNotify('Erro ao remover domínio.', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-white/[0.08] pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F6]">
          Domínios Próprios Ilimitados
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[#9CA3AF]">
          Conecte quantos domínios e subdomínios desejar sem travas de plano. Utilize apontamento CNAME ou Proxy Reverso para servir suas presells sob sua própria marca.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-[#9CA3AF]">
            Novo Domínio ou Subdomínio
          </label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="Ex: ofertas.suamarca.com.br"
              className="w-full rounded-xl border border-white/[0.08] bg-[#262932] py-2.5 pl-10 pr-4 font-mono text-sm text-[#F4F4F6] placeholder-[#6B7280] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="cta-gradient flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Vincular Domínio
        </button>
      </form>

      <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-sm font-semibold text-[#F4F4F6]">
            Domínios Configurados ({domains.length})
          </h3>
        </div>

        {domains.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#9CA3AF]">
            Nenhum domínio próprio cadastrado ainda. Adicione um subdomínio acima para gerar o registro CNAME.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-semibold text-[#F4F4F6]">
                      {domain.hostname}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        domain.verified ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {domain.verified ? '· DNS Verificado · SSL Ativo' : '· Aguardando Apontamento'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-[#9CA3AF]">
                    CNAME: <span className="text-[#F4F4F6]">{domain.hostname}</span> &rarr;{' '}
                    <span className="text-[#FF6B00]">{domain.cname_target}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleVerify(domain.id)}
                    disabled={verifyingId === domain.id}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#262932] px-3 py-2 text-xs font-medium text-[#F4F4F6] transition-colors hover:bg-white/[0.08]"
                  >
                    {verifyingId === domain.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : domain.verified ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Verificar DNS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(domain.id)}
                    aria-label="Remover domínio"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#262932] text-[#9CA3AF] transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-6 space-y-3">
        <h3 className="text-sm font-semibold text-[#F4F4F6]">
          Configuração Recomendada de Proxy Reverso (Cloudflare / Nginx Self-Hosted)
        </h3>
        <p className="text-xs leading-relaxed text-[#9CA3AF]">
          Para publicar suas páginas no caminho raiz do seu domínio próprio em hospedagem VPS, aponte o registro A/CNAME para o seu servidor e utilize o bloco Nginx abaixo encaminhando para esta instância:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#121316] p-4 font-mono text-xs leading-relaxed text-[#D1D5DB]">
{`server {
  listen 80;
  server_name ofertas.suamarca.com.br;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}`}
        </pre>
      </div>
    </div>
  );
}

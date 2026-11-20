import { Download, Loader2, MonitorDown } from 'lucide-react';
import { useState } from 'react';

interface DownloadAppButtonsProps {
  onNotify?: (msg: string, type?: 'success' | 'error') => void;
}

export function DownloadAppButtons({ onNotify }: DownloadAppButtonsProps) {
  const [downloadingWin, setDownloadingWin] = useState(false);
  const [downloadingWeb, setDownloadingWeb] = useState(false);

  async function triggerDownload(endpoint: string, fallbackName: string, setBusy: (v: boolean) => void) {
    setBusy(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error('Falha ao gerar pacote para download.');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || fallbackName;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      onNotify?.(`Download de ${filename} iniciado.`);
    } catch (err: unknown) {
      onNotify?.(
        err instanceof Error ? err.message : 'Erro ao exportar aplicativo.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-3.5">
      <span className="text-xs font-semibold text-[#9CA3AF]">Exportar Aplicativo</span>

      <button
        type="button"
        onClick={() =>
          triggerDownload(
            '/api/download/windows-portable',
            'CODEXPAGES-Portable-Win64.zip',
            setDownloadingWin
          )
        }
        disabled={downloadingWin}
        className="cta-gradient flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold whitespace-nowrap disabled:opacity-60"
      >
        {downloadingWin ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Gerando Pacote...</span>
          </>
        ) : (
          <>
            <MonitorDown className="h-4 w-4 shrink-0" />
            <span>Baixar Portable (Windows)</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() =>
          triggerDownload('/api/download/webapp', 'CODEXPAGES-WebApp.zip', setDownloadingWeb)
        }
        disabled={downloadingWeb}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2 text-xs font-semibold text-[#F4F4F6] transition-colors hover:bg-white/[0.08] whitespace-nowrap disabled:opacity-60"
      >
        {downloadingWeb ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Compactando .ZIP...</span>
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Baixar Web App (.ZIP)</span>
          </>
        )}
      </button>
    </div>
  );
}

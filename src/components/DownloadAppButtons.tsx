import { Download, Globe, MonitorDown } from 'lucide-react';

interface DownloadAppButtonsProps {
  onNotify?: (msg: string, type?: 'success' | 'error') => void;
}

export function DownloadAppButtons({ onNotify }: DownloadAppButtonsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#1C1E24] p-3.5">
      <span className="text-xs font-semibold text-[#9CA3AF]">Exportar Aplicativo</span>

      <a
        href="/api/download/windows-portable"
        download="CODEXPAGES-Portable-Win64.zip"
        onClick={() =>
          onNotify?.('Download de CODEXPAGES-Portable-Win64.zip iniciado.')
        }
        className="cta-gradient flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold whitespace-nowrap"
      >
        <MonitorDown className="h-4 w-4 shrink-0" />
        <span>Baixar Portable (Windows)</span>
      </a>

      <a
        href="/api/download/webapp-html"
        download="CODEXPAGES-WebApp.html"
        onClick={() =>
          onNotify?.('Download de CODEXPAGES-WebApp.html iniciado (abre direto no navegador).')
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF6B00]/35 bg-[#262932] px-3.5 py-2 text-xs font-semibold text-[#F4F4F6] transition-colors hover:bg-white/[0.08] whitespace-nowrap"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
        <span>Baixar Web App (.HTML)</span>
      </a>

      <a
        href="/api/download/webapp"
        download="CODEXPAGES-WebApp.zip"
        onClick={() => onNotify?.('Download de CODEXPAGES-WebApp.zip iniciado.')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#262932] px-3.5 py-2 text-xs font-semibold text-[#F4F4F6] transition-colors hover:bg-white/[0.08] whitespace-nowrap"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>Baixar Código / Servidor (.ZIP)</span>
      </a>
    </div>
  );
}

/**
 * Generates a 100% self-contained, zero-dependency HTML Web App ("CODEXPAGES-WebApp.html")
 * that opens directly in any browser (even via file://) using localStorage persistence.
 */
export function generateStandaloneWebAppHtml(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CODEXPAGES — Web App Offline Self-Hosted</title>
  <style>
    :root {
      --bg: #121316;
      --surface: #1C1E24;
      --elevated: #262932;
      --border: rgba(255, 255, 255, 0.08);
      --text: #F4F4F6;
      --muted: #9CA3AF;
      --accent-start: #FF6B00;
      --accent-end: #E61919;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      -webkit-font-smoothing: antialiased;
    }
    button, input, textarea, select { font-family: inherit; }
    .app-shell { display: flex; width: 100%; min-height: 100vh; }
    .sidebar {
      width: 264px;
      flex-shrink: 0;
      background: #17191E;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px 18px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 14px;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
      font-size: 15px;
    }
    .brand-title { font-weight: 800; font-size: 15px; letter-spacing: -0.01em; }
    .brand-sub { font-size: 11px; color: var(--muted); }
    .nav-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      margin-bottom: 4px;
    }
    .nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--text); }
    .nav-btn.active { background: var(--elevated); color: #fff; }
    .cta-btn {
      background: linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%);
      color: #fff;
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 8px 20px -6px rgba(255, 107, 0, 0.4);
    }
    .cta-btn:hover { filter: brightness(1.08); }
    .sec-btn {
      background: var(--elevated);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 13px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .sec-btn:hover { background: rgba(255,255,255,0.08); }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      height: 62px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: rgba(18, 19, 22, 0.92);
      gap: 12px;
    }
    .content { flex: 1; padding: 28px; overflow-y: auto; max-width: 1120px; width: 100%; margin: 0 auto; }
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; margin-top: 18px; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
    }
    .card-meta { font-size: 11px; color: var(--muted); }
    .card-title { font-size: 16px; font-weight: 700; margin: 4px 0; }
    .card-slug { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--muted); }
    .editor-grid { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    label.field-label { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 5px; }
    input.field, textarea.field, select.field {
      width: 100%;
      background: var(--elevated);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 11px;
      color: var(--text);
      font-size: 13px;
      outline: none;
    }
    input.field:focus, textarea.field:focus, select.field:focus { border-color: var(--accent-start); }
    .preview-stage {
      background: #0B0C0E;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      min-height: 460px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .preview-frame {
      width: 100%;
      max-width: 680px;
      border-radius: 14px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #121316;
      transition: max-width 200ms ease;
    }
    .preview-frame.mobile { max-width: 375px; }
    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      background: rgba(28, 30, 36, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 11px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      z-index: 999;
    }
    @media (max-width: 900px) {
      .sidebar { display: none; }
      .editor-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div>
        <div class="brand">
          <div class="brand-mark">C</div>
          <div>
            <div class="brand-title">CODEXPAGES</div>
            <div class="brand-sub">Web App Offline</div>
          </div>
        </div>
        <button class="nav-btn active" id="nav-pages" onclick="setView('pages')">Minhas Páginas</button>
        <button class="nav-btn" id="nav-cookies" onclick="createPage('presell_cookies')">+ Nova Presell Cookies</button>
        <button class="nav-btn" id="nav-blocks" onclick="createPage('offer')">+ Nova Página em Blocos</button>
      </div>
      <div class="panel" style="padding:14px; background:#121316;">
        <div style="font-size:12px; font-weight:700;">Modo Navegador Ilimitado</div>
        <div style="font-size:11px; color:var(--muted); line-height:1.45;">
          Os dados ficam salvos no seu navegador (localStorage) e você pode exportar qualquer página em .HTML pronto com Flow Tracking.
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div style="font-size:13px; font-weight:700; color:var(--muted);">CODEXPAGES · Web App Autônomo</div>
        <div style="display:flex; gap:8px;">
          <button class="sec-btn" onclick="createPage('presell_cookies')">+ Presell Cookies</button>
          <button class="cta-btn" onclick="createPage('offer')">+ Nova Página</button>
        </div>
      </header>
      <main class="content" id="app-root"></main>
    </div>
  </div>
  <div id="toast" class="toast" style="display:none;"></div>

  <script>
    const STORAGE_KEY = 'codexpages_webapp_pages_v1';
    const DEFAULT_PAGES = [
      {
        id: 'presell-1',
        title: 'Presell Cookies — Oferta Principal',
        slug: 'presell-oferta-principal',
        page_type: 'presell_cookies',
        status: 'published',
        language: 'PT',
        affiliate_url: 'https://checkout.exemplo.com/oferta',
        cookie_config: {
          headline: 'Preferências de Cookies e Privacidade',
          description: 'Utilizamos cookies essenciais para garantir a melhor experiência de navegação e liberar o acesso ao site oficial.',
          acceptButtonText: 'Aceitar e Continuar',
          rejectButtonText: 'Gerenciar Preferências',
          previewBrandName: 'Oferta Oficial Verificada',
          previewHeadline: 'Tecnologia de Alta Performance para Sua Rotina'
        },
        hero: {
          eyebrow: 'Acesso Exclusivo',
          title: 'Descubra a Solução Completa com Condição Especial',
          subtitle: 'Personalize seus textos e links de checkout com repasse automático de UTMs (Flow Tracking).',
          buttonText: 'Ir para o Checkout Seguro',
          buttonUrl: 'https://checkout.exemplo.com/oferta'
        },
        updated_at: new Date().toISOString()
      }
    ];

    let state = {
      view: 'pages',
      selectedId: null,
      previewDevice: 'desktop',
      confirmDeleteId: null,
      pages: loadPages()
    };

    function loadPages() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return DEFAULT_PAGES;
    }

    function savePages() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pages));
    }

    function notify(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
    }

    function esc(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function setView(view, id) {
      state.view = view;
      if (id !== undefined) state.selectedId = id;
      render();
    }

    function createPage(type) {
      const id = 'pg-' + Math.random().toString(36).slice(2, 9);
      const isCookie = type === 'presell_cookies';
      const next = {
        id,
        title: isCookie ? 'Nova Presell de Cookies' : 'Nova Landing Page',
        slug: (isCookie ? 'presell-' : 'pagina-') + Math.random().toString(36).slice(2, 6),
        page_type: type,
        status: 'published',
        language: 'PT',
        affiliate_url: 'https://checkout.exemplo.com',
        cookie_config: {
          headline: 'Preferências de Cookies e Privacidade',
          description: 'Clique abaixo para aceitar os cookies essenciais e prosseguir para a página oficial.',
          acceptButtonText: 'Aceitar e Continuar',
          rejectButtonText: 'Fechar e Continuar',
          previewBrandName: 'Página Oficial',
          previewHeadline: 'Oferta Exclusiva com Garantia Total'
        },
        hero: {
          eyebrow: 'Nova Campanha',
          title: 'Headline Clara e Orientada para Conversão',
          subtitle: 'Edite os textos ao lado e exporte o arquivo HTML puro pronto para hospedagem.',
          buttonText: 'Acessar Oferta Agora',
          buttonUrl: 'https://checkout.exemplo.com'
        },
        updated_at: new Date().toISOString()
      };
      state.pages.unshift(next);
      savePages();
      setView('editor', id);
      notify('Página criada!');
    }

    function duplicatePage(id) {
      const orig = state.pages.find(p => p.id === id);
      if (!orig) return;
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = 'pg-' + Math.random().toString(36).slice(2, 9);
      copy.title = orig.title + ' (Variação A/B)';
      copy.slug = orig.slug + '-ab';
      copy.updated_at = new Date().toISOString();
      state.pages.unshift(copy);
      savePages();
      render();
      notify('Variação A/B duplicada!');
    }

    function deletePage(id) {
      if (state.confirmDeleteId !== id) {
        state.confirmDeleteId = id;
        render();
        return;
      }
      state.pages = state.pages.filter(p => p.id !== id);
      state.confirmDeleteId = null;
      if (state.selectedId === id) state.view = 'pages';
      savePages();
      render();
      notify('Página excluída.');
    }

    function compileHtml(page) {
      const trackingScript = '<script data-flow-tracking="1">(function(){document.addEventListener("DOMContentLoaded",function(){var s=window.location.search;if(!s)return;document.querySelectorAll("a[href]").forEach(function(a){var h=a.getAttribute("href");if(!h||h.startsWith("#")||h.startsWith("javascript:"))return;try{var u=new URL(h,window.location.origin);if(u.origin!==window.location.origin||a.hasAttribute("data-checkout")){var sep=u.search?"&":"?";a.setAttribute("href",u.toString()+sep+(s.startsWith("?")?s.slice(1):s));}}catch(e){}});});})();<\\/script>';
      if (page.page_type === 'presell_cookies') {
        const c = page.cookie_config;
        return '<!doctype html><html lang="' + esc(page.language.toLowerCase()) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(page.title) + '</title><style>body{margin:0;min-height:100vh;background:#121316;color:#F4F4F6;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}.bg-blur{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;filter:blur(10px);opacity:.35;pointer-events:none}.card{position:relative;z-index:2;max-width:440px;width:100%;background:#1C1E24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:28px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.6)}.btn{display:block;width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#FF6B00,#E61919);color:#fff;font-weight:700;text-decoration:none;margin-top:18px}.sec{display:block;width:100%;padding:11px;border-radius:10px;background:#262932;color:#9CA3AF;font-weight:600;text-decoration:none;margin-top:10px;font-size:13px}</style></head><body><div class="bg-blur"><h1>' + esc(c.previewBrandName) + ' — ' + esc(c.previewHeadline) + '</h1></div><div class="card"><h2>' + esc(c.headline) + '</h2><p style="color:#9CA3AF;font-size:14px;line-height:1.6">' + esc(c.description) + '</p><a href="' + esc(page.affiliate_url) + '" data-checkout="1" class="btn">' + esc(c.acceptButtonText) + '</a><a href="' + esc(page.affiliate_url) + '" data-checkout="1" class="sec">' + esc(c.rejectButtonText) + '</a></div>' + trackingScript + '</body></html>';
      }
      const h = page.hero;
      return '<!doctype html><html lang="' + esc(page.language.toLowerCase()) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(page.title) + '</title><style>body{margin:0;min-height:100vh;background:#121316;color:#F4F4F6;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}.wrap{max-width:680px;width:100%;background:#1C1E24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 28px;text-align:center}.btn{display:inline-block;padding:15px 28px;border-radius:12px;background:linear-gradient(135deg,#FF6B00,#E61919);color:#fff;font-weight:700;text-decoration:none;margin-top:22px}</style></head><body><div class="wrap"><div style="color:#FF6B00;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">' + esc(h.eyebrow) + '</div><h1 style="font-size:32px;line-height:1.15;margin:12px 0">' + esc(h.title) + '</h1><p style="color:#9CA3AF;font-size:16px;line-height:1.6">' + esc(h.subtitle) + '</p><a href="' + esc(h.buttonUrl || page.affiliate_url) + '" data-checkout="1" class="btn">' + esc(h.buttonText) + '</a></div>' + trackingScript + '</body></html>';
    }

    function downloadHtml(id) {
      const page = state.pages.find(p => p.id === id);
      if (!page) return;
      const html = compileHtml(page);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (page.slug || 'pagina') + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      notify('Arquivo ' + page.slug + '.html baixado!');
    }

    function updateCurrent(patchFn) {
      const idx = state.pages.findIndex(p => p.id === state.selectedId);
      if (idx === -1) return;
      patchFn(state.pages[idx]);
      state.pages[idx].updated_at = new Date().toISOString();
      savePages();
    }

    function render() {
      const root = document.getElementById('app-root');
      if (state.view === 'editor') {
        const page = state.pages.find(p => p.id === state.selectedId);
        if (!page) { state.view = 'pages'; return render(); }
        const isCookie = page.page_type === 'presell_cookies';
        root.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<button class="sec-btn" onclick="setView(\\'pages\\')">Voltar</button>' +
              '<h2 style="margin:0;font-size:18px;">' + esc(page.title) + '</h2>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button class="sec-btn" onclick="state.previewDevice=\\'desktop\\';render()">Desktop</button>' +
              '<button class="sec-btn" onclick="state.previewDevice=\\'mobile\\';render()">Mobile</button>' +
              '<button class="cta-btn" onclick="downloadHtml(\\'' + page.id + '\\')">Baixar .HTML</button>' +
            '</div>' +
          '</div>' +
          '<div class="editor-grid">' +
            '<div class="panel">' +
              '<div><label class="field-label">Título da Página</label><input class="field" value="' + esc(page.title) + '" oninput="updateCurrent(p=>{p.title=this.value});document.querySelector(\\'h2\\').textContent=this.value" /></div>' +
              '<div><label class="field-label">Slug</label><input class="field" value="' + esc(page.slug) + '" oninput="updateCurrent(p=>{p.slug=this.value})" /></div>' +
              '<div><label class="field-label">Link de Afiliado / Checkout (com Flow Tracking)</label><input class="field" value="' + esc(page.affiliate_url) + '" oninput="updateCurrent(p=>{p.affiliate_url=this.value;p.hero.buttonUrl=this.value})" /></div>' +
              (isCookie
                ? '<div><label class="field-label">Headline do Popup</label><input class="field" value="' + esc(page.cookie_config.headline) + '" oninput="updateCurrent(p=>{p.cookie_config.headline=this.value});updatePreview()" /></div>' +
                  '<div><label class="field-label">Descrição do Popup</label><textarea class="field" rows="3" oninput="updateCurrent(p=>{p.cookie_config.description=this.value});updatePreview()">' + esc(page.cookie_config.description) + '</textarea></div>' +
                  '<div><label class="field-label">Texto do Botão Principal</label><input class="field" value="' + esc(page.cookie_config.acceptButtonText) + '" oninput="updateCurrent(p=>{p.cookie_config.acceptButtonText=this.value});updatePreview()" /></div>'
                : '<div><label class="field-label">Eyebrow</label><input class="field" value="' + esc(page.hero.eyebrow) + '" oninput="updateCurrent(p=>{p.hero.eyebrow=this.value});updatePreview()" /></div>' +
                  '<div><label class="field-label">Headline Principal</label><input class="field" value="' + esc(page.hero.title) + '" oninput="updateCurrent(p=>{p.hero.title=this.value});updatePreview()" /></div>' +
                  '<div><label class="field-label">Subheadline</label><textarea class="field" rows="3" oninput="updateCurrent(p=>{p.hero.subtitle=this.value});updatePreview()">' + esc(page.hero.subtitle) + '</textarea></div>' +
                  '<div><label class="field-label">Texto do CTA</label><input class="field" value="' + esc(page.hero.buttonText) + '" oninput="updateCurrent(p=>{p.hero.buttonText=this.value});updatePreview()" /></div>'
              ) +
              '<button class="cta-btn" onclick="notify(\\'Alterações salvas localmente!\\')">Salvar Alterações</button>' +
            '</div>' +
            '<div class="preview-stage">' +
              '<div class="preview-frame ' + (state.previewDevice === 'mobile' ? 'mobile' : '') + '">' +
                '<iframe id="live-preview-frame" style="width:100%;height:480px;border:0;background:#121316;"></iframe>' +
              '</div>' +
            '</div>' +
          '</div>';
        updatePreview();
        return;
      }

      root.innerHTML =
        '<div>' +
          '<h2 style="margin:0;font-size:24px;font-weight:800;">Suas Páginas & Presells (Web App Offline)</h2>' +
          '<p style="margin:6px 0 0;color:var(--muted);font-size:13px;">Crie, edite, duplique e exporte páginas em .HTML puro diretamente pelo navegador.</p>' +
          '<div class="grid-cards">' +
            state.pages.map(p => (
              '<div class="card">' +
                '<div>' +
                  '<div class="card-meta">' + (p.page_type === 'presell_cookies' ? 'Presell Cookies' : 'Página em Blocos') + ' · ' + esc(p.language) + '</div>' +
                  '<div class="card-title">' + esc(p.title) + '</div>' +
                  '<div class="card-slug">/p/' + esc(p.slug) + '</div>' +
                '</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--border);padding-top:12px;">' +
                  '<button class="cta-btn" onclick="setView(\\'editor\\',\\'' + p.id + '\\')">Editar</button>' +
                  '<button class="sec-btn" onclick="duplicatePage(\\'' + p.id + '\\')">Duplicar A/B</button>' +
                  '<button class="sec-btn" onclick="downloadHtml(\\'' + p.id + '\\')">Baixar .HTML</button>' +
                  (state.confirmDeleteId === p.id
                    ? '<button class="sec-btn" style="background:#dc2626;color:#fff;border-color:#dc2626;" onclick="deletePage(\\'' + p.id + '\\')">Confirmar</button>'
                    : '<button class="sec-btn" onclick="deletePage(\\'' + p.id + '\\')">Excluir</button>') +
                '</div>' +
              '</div>'
            )).join('') +
          '</div>' +
        '</div>';
    }

    function updatePreview() {
      const page = state.pages.find(p => p.id === state.selectedId);
      const frame = document.getElementById('live-preview-frame');
      if (page && frame) {
        frame.srcdoc = compileHtml(page);
      }
    }

    render();
  </script>
</body>
</html>`;
}

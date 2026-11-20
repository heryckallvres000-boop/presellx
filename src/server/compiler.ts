import * as cheerio from 'cheerio';
import type { PageBlock, PageRecord } from '../types.ts';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPixelsHeadHtml(page: PageRecord): string {
  const s = page.scripts;
  const parts: string[] = [];

  if (s.metaPixelId.trim()) {
    const id = escapeHtml(s.metaPixelId.trim());
    parts.push(`<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>`);
  }

  if (s.ga4Id.trim()) {
    const id = escapeHtml(s.ga4Id.trim());
    parts.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');
</script>`);
  }

  if (s.gtmId.trim()) {
    const id = escapeHtml(s.gtmId.trim());
    parts.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>`);
  }

  if (s.tiktokPixelId.trim()) {
    const id = escapeHtml(s.tiktokPixelId.trim());
    parts.push(`<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
  ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${id}');
  ttq.page();
}(window, document, 'ttq');
</script>`);
  }

  if (s.headHtml.trim()) {
    parts.push(s.headHtml);
  }

  return parts.join('\n');
}

export function generateFlowTrackingScript(pageId: string): string {
  return `
<script data-flow-tracking="1" data-page-id="${escapeHtml(pageId)}">
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('preview');
    var cleanSearch = currentParams.toString();
    if (!cleanSearch) return;

    var links = document.querySelectorAll('a[href]');
    links.forEach(function(link) {
      if (link.hasAttribute('data-ff-legal')) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      try {
        var url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin || link.hasAttribute('data-checkout')) {
          currentParams.forEach(function(val, key) {
            if (!url.searchParams.has(key)) {
              url.searchParams.set(key, val);
            }
          });
          link.setAttribute('href', url.toString());
        }
      } catch (e) {}
    });
  });
})();
</script>
`;
}

function buildFlowTrackingAndConversionScript(page: PageRecord, baseOrigin: string, isPreview: boolean): string {
  const tools = page.conversion_tools;
  const pageIdJson = JSON.stringify(page.id);
  const trackEndpoint = JSON.stringify(baseOrigin ? `${baseOrigin}/api/public/track` : '/api/public/track');
  const utmEnabled = Boolean(tools.utmPassthroughEnabled);
  const backRedirectEnabled = Boolean(tools.backRedirectEnabled && tools.backRedirectUrl.trim());
  const backRedirectUrl = JSON.stringify(tools.backRedirectUrl.trim());
  const delayEnabled = Boolean(tools.delayEnabled && tools.delaySeconds > 0 && tools.delaySelector.trim());
  const delaySeconds = Number(tools.delaySeconds || 0);
  const delaySelector = JSON.stringify(tools.delaySelector.trim());

  const delayStyle = delayEnabled
    ? `<style>${tools.delaySelector.trim()} { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.4s ease; }</style>`
    : '';

  return `${delayStyle}
<script>
(function() {
  var PAGE_ID = ${pageIdJson};
  var TRACK_URL = ${trackEndpoint};
  var IS_PREVIEW = ${isPreview ? 'true' : 'false'};
  var UTM_ENABLED = ${utmEnabled ? 'true' : 'false'};

  function getSearchParams() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    params.forEach(function(value, key) {
      if (key !== 'preview' && value) {
        out[key] = value;
      }
    });
    return out;
  }

  var capturedParams = getSearchParams();

  function appendParamsToUrl(rawUrl) {
    if (!UTM_ENABLED || !rawUrl) return rawUrl;
    if (rawUrl.indexOf('#') === 0 || rawUrl.indexOf('javascript:') === 0 || rawUrl.indexOf('mailto:') === 0 || rawUrl.indexOf('tel:') === 0) {
      return rawUrl;
    }
    try {
      var u = new URL(rawUrl, window.location.origin);
      Object.keys(capturedParams).forEach(function(k) {
        if (!u.searchParams.has(k)) {
          u.searchParams.set(k, capturedParams[k]);
        }
      });
      return u.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  function getVisitorId() {
    try {
      var key = 'ff_vid';
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var next = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, next);
      return next;
    } catch (e) {
      return 'v_anon';
    }
  }

  function sendTrack(eventType, targetUrl) {
    if (IS_PREVIEW) return;
    var payload = JSON.stringify({
      pageId: PAGE_ID,
      eventType: eventType,
      visitorHash: getVisitorId(),
      utm_source: capturedParams.utm_source || (capturedParams.fbclid ? 'meta_ads' : capturedParams.gclid ? 'google_ads' : 'direct'),
      utm_medium: capturedParams.utm_medium || '',
      utm_campaign: capturedParams.utm_campaign || '',
      referrer: document.referrer || '',
      targetUrl: targetUrl || ''
    });
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(TRACK_URL, blob);
    } else {
      fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){});
    }
  }

  window.__flowForgeTrackClick = function(url) {
    var finalUrl = appendParamsToUrl(url);
    sendTrack('click', finalUrl);
    return finalUrl;
  };

  window.__flowForgeParams = capturedParams;

  document.addEventListener('DOMContentLoaded', function() {
    sendTrack('view', window.location.href);

    if (UTM_ENABLED) {
      var anchors = document.querySelectorAll('a[href]');
      anchors.forEach(function(a) {
        var href = a.getAttribute('href');
        if (href && !a.hasAttribute('data-ff-legal')) {
          try {
            var targetU = new URL(href, window.location.origin);
            if (targetU.origin !== window.location.origin || a.hasAttribute('data-checkout')) {
              a.setAttribute('href', appendParamsToUrl(href));
            }
          } catch (e) {}
        }
        a.addEventListener('click', function() {
          if (!a.hasAttribute('data-ff-legal')) {
            sendTrack('click', a.getAttribute('href') || '');
          }
        });
      });

      var forms = document.querySelectorAll('form');
      forms.forEach(function(form) {
        Object.keys(capturedParams).forEach(function(k) {
          if (!form.querySelector('input[name="' + k + '"]')) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = capturedParams[k];
            form.appendChild(input);
          }
        });
      });
    }

    if (${delayEnabled ? 'true' : 'false'}) {
      setTimeout(function() {
        var els = document.querySelectorAll(${delaySelector});
        els.forEach(function(el) {
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('pointer-events', 'auto', 'important');
        });
      }, ${delaySeconds * 1000});
    }

    if (${backRedirectEnabled ? 'true' : 'false'}) {
      var targetBack = appendParamsToUrl(${backRedirectUrl});
      try {
        history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', function() {
          window.location.replace(targetBack);
        });
      } catch (e) {}
    }
  });
})();
</script>`;
}

function buildLegalFooterHtml(page: PageRecord): string {
  if (!page.conversion_tools.legalFooterEnabled) return '';
  const company = escapeHtml(page.conversion_tools.companyName || 'CODEXPAGES Digital');
  const email = escapeHtml(page.conversion_tools.contactEmail || 'contato@seudominio.com');

  return `
<footer style="margin-top:48px;padding:28px 16px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;font-size:12px;color:#9CA3AF;font-family:inherit;">
  <div style="max-width:760px;margin:0 auto;line-height:1.6;">
    <p style="margin:0 0 10px;">&copy; ${new Date().getFullYear()} ${company}. Todos os direitos reservados.</p>
    <div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-bottom:12px;">
      <a href="#ff-privacidade" data-ff-legal="1" onclick="event.preventDefault();document.getElementById('ff-legal-modal').style.display='flex';document.getElementById('ff-legal-title').textContent='Política de Privacidade';document.getElementById('ff-legal-body').innerHTML='Coletamos apenas os dados fornecidos voluntariamente e identificadores estritamente necessários para mensuração de campanhas e funcionamento da página. Para solicitar exclusão de dados, entre em contato pelo e-mail ${email}.';" style="color:#D1D5DB;text-decoration:underline;">Política de Privacidade</a>
      <a href="#ff-termos" data-ff-legal="1" onclick="event.preventDefault();document.getElementById('ff-legal-modal').style.display='flex';document.getElementById('ff-legal-title').textContent='Termos de Uso';document.getElementById('ff-legal-body').innerHTML='Ao acessar esta página, você concorda em utilizar o conteúdo apenas para fins informativos e legítimos. Preços, disponibilidade e condições finais são confirmados exclusivamente na página oficial do produtor ou checkout.';" style="color:#D1D5DB;text-decoration:underline;">Termos de Uso</a>
      <a href="#ff-aviso" data-ff-legal="1" onclick="event.preventDefault();document.getElementById('ff-legal-modal').style.display='flex';document.getElementById('ff-legal-title').textContent='Aviso Legal';document.getElementById('ff-legal-body').innerHTML='Este site não é afiliado ao Facebook, Google ou qualquer plataforma de anúncios. Os resultados podem variar de acordo com o uso individual. Dúvidas: ${email}.';" style="color:#D1D5DB;text-decoration:underline;">Aviso Legal</a>
    </div>
    <p style="margin:0;opacity:0.75;font-size:11px;">Este conteúdo tem caráter informativo e não substitui orientação profissional especializada. Contato: ${email}</p>
  </div>
</footer>
<div id="ff-legal-modal" style="display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;">
  <div style="background:#1C1E24;color:#F4F4F6;border:1px solid rgba(255,255,255,0.12);border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 24px 48px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 id="ff-legal-title" style="margin:0;font-size:17px;font-weight:700;">Política</h3>
      <button type="button" onclick="document.getElementById('ff-legal-modal').style.display='none'" style="background:#262932;border:1px solid rgba(255,255,255,0.1);color:#F4F4F6;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">Fechar</button>
    </div>
    <p id="ff-legal-body" style="margin:0;font-size:14px;line-height:1.6;color:#D1D5DB;"></p>
  </div>
</div>`;
}

function renderPresellCookiesHtml(page: PageRecord, baseOrigin: string): string {
  const c = page.cookie_config;
  const theme = page.theme;
  const targetAffiliate = escapeHtml(page.affiliate_url || 'https://exemplo.com');
  const isLightModal = c.modalTheme === 'light';

  const modalBg = isLightModal ? '#FFFFFF' : 'rgba(28, 30, 36, 0.94)';
  const modalText = isLightModal ? '#111827' : '#F4F4F6';
  const modalMuted = isLightModal ? '#4B5563' : '#9CA3AF';
  const modalBorder = isLightModal ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';

  const positionStyle =
    c.modalPosition === 'bottom'
      ? 'align-items:flex-end;padding-bottom:28px;'
      : c.modalPosition === 'top'
      ? 'align-items:flex-start;padding-top:28px;'
      : 'align-items:center;';

  const blurPx = Math.max(0, Math.min(24, Number(c.blurIntensity ?? 10)));

  const backdropContent =
    c.backgroundMode === 'custom_image' && c.customImageUrl
      ? `<div style="position:fixed;inset:0;background:url('${escapeHtml(
          c.customImageUrl
        )}') center/cover no-repeat;filter:blur(${blurPx}px) brightness(0.42);transform:scale(1.06);"></div>`
      : c.backgroundMode === 'gradient_blur'
      ? `<div style="position:fixed;inset:0;background:radial-gradient(circle at 25% 20%, rgba(255,107,0,0.22), transparent 50%), radial-gradient(circle at 80% 75%, rgba(230,25,25,0.18), transparent 45%), #121316;"></div>`
      : `<div style="position:fixed;inset:0;padding:40px 24px;filter:blur(${blurPx}px);opacity:0.55;pointer-events:none;overflow:hidden;display:flex;justify-content:center;">
          <div style="max-width:960px;width:100%;background:#1C1E24;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:40px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:20px;margin-bottom:32px;">
              <strong style="font-size:20px;color:#F4F4F6;">${escapeHtml(c.previewBrandName || page.title)}</strong>
              <span style="font-size:13px;color:#9CA3AF;">${escapeHtml(c.targetPreviewUrl || 'Página Oficial')}</span>
            </div>
            <h2 style="font-size:34px;line-height:1.2;margin:0 0 18px;color:#FFFFFF;">${escapeHtml(
              c.previewHeadline || page.title
            )}</h2>
            <p style="font-size:16px;color:#9CA3AF;max-width:640px;line-height:1.6;">Apresentação oficial do produto, especificações detalhadas, benefícios comprovados e acesso imediato com garantia.</p>
            <div style="margin-top:28px;height:280px;border-radius:16px;background:linear-gradient(135deg, rgba(255,107,0,0.16), rgba(28,30,36,0.9));border:1px solid rgba(255,255,255,0.08);"></div>
          </div>
        </div>`;

  return `<!doctype html>
<html lang="${page.language.toLowerCase()}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: '${escapeHtml(theme.fontFamily || 'Plus Jakarta Sans')}', -apple-system, sans-serif;
      background: #121316;
      color: #F4F4F6;
      display: flex;
      flex-direction: column;
    }
    .ff-cta-btn {
      background: linear-gradient(135deg, ${escapeHtml(c.accentColor || '#FF6B00')} 0%, #E61919 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 13px 22px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 24px -6px rgba(255, 107, 0, 0.45);
      transition: filter 0.18s ease, transform 0.18s ease;
    }
    .ff-cta-btn:hover { filter: brightness(1.08); }
    .ff-cta-btn:active { transform: translateY(1px); }
    .ff-secondary-btn {
      background: transparent;
      color: ${modalMuted};
      border: 1px solid ${modalBorder};
      border-radius: 10px;
      padding: 13px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
  ${buildPixelsHeadHtml(page)}
</head>
<body>
  ${page.scripts.bodyStartHtml}
  ${backdropContent}
  <main style="position:relative;z-index:10;flex:1;display:flex;justify-content:center;padding:24px;${positionStyle}">
    <div role="dialog" aria-modal="true" style="width:100%;max-width:520px;background:${modalBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:${modalText};border:1px solid ${modalBorder};border-radius:20px;padding:28px;box-shadow:0 32px 64px -12px rgba(0,0,0,0.65);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(c.headline)}</h1>
        <button type="button" aria-label="Fechar" onclick="ffProceed(${c.redirectOnClose ? 'true' : 'false'})" style="background:transparent;border:1px solid ${modalBorder};color:${modalMuted};width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:18px;line-height:1;flex-shrink:0;">&times;</button>
      </div>
      <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:${modalMuted};">${escapeHtml(c.description)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
        <button type="button" class="ff-cta-btn delay-cta" style="flex:1;min-width:190px;" onclick="ffProceed(true)">${escapeHtml(c.acceptButtonText)}</button>
        <button type="button" class="ff-secondary-btn" onclick="ffProceed(true)">${escapeHtml(c.rejectButtonText)}</button>
      </div>
    </div>
  </main>
  <div style="position:relative;z-index:10;">
    ${buildLegalFooterHtml(page)}
  </div>
  <script>
    function ffProceed(shouldGo) {
      if (!shouldGo) return;
      var dest = "${targetAffiliate}";
      try {
        var currentParams = new URLSearchParams(window.location.search);
        var u = new URL(dest, window.location.origin);
        currentParams.forEach(function(v, k) {
          if (k !== 'preview' && v && !u.searchParams.has(k)) {
            u.searchParams.set(k, v);
          }
        });
        dest = u.toString();
      } catch (e) {}
      if (window.__flowForgeTrackClick) {
        dest = window.__flowForgeTrackClick(dest);
      }
      window.location.href = dest;
    }
  </script>
  ${page.scripts.bodyEndHtml}
  ${baseOrigin ? '' : ''}
</body>
</html>`;
}

function renderBlockHtml(block: PageBlock, page: PageRecord, baseOrigin: string): string {
  const d = block.data;
  const align = d.align === 'left' ? 'left' : 'center';
  const leadEndpoint = escapeHtml(baseOrigin ? `${baseOrigin}/api/public/lead` : '/api/public/lead');

  switch (block.type) {
    case 'hero':
      return `<section style="text-align:${align};padding:32px 0 24px;">
        ${d.eyebrow ? `<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#FF6B00;">${escapeHtml(d.eyebrow)}</p>` : ''}
        <h1 style="margin:0 0 16px;font-size:clamp(28px,4.5vw,44px);font-weight:800;line-height:1.15;letter-spacing:-0.02em;text-wrap:balance;">${escapeHtml(d.title || '')}</h1>
        ${d.subtitle ? `<p style="margin:0 auto 24px;max-width:620px;font-size:17px;line-height:1.6;color:var(--ff-muted);">${escapeHtml(d.subtitle)}</p>` : ''}
        ${
          d.buttonText && d.buttonUrl
            ? `<a href="${escapeHtml(d.buttonUrl)}" class="ff-btn ${d.isCheckoutLink ? 'delay-cta' : ''}" data-checkout="${d.isCheckoutLink ? 'true' : 'false'}">${escapeHtml(d.buttonText)}</a>`
            : ''
        }
      </section>`;

    case 'text':
      return `<section style="padding:18px 0;">
        ${d.title ? `<h2 style="margin:0 0 10px;font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(d.title)}</h2>` : ''}
        <p style="margin:0;font-size:16px;line-height:1.7;color:var(--ff-muted);white-space:pre-line;">${escapeHtml(d.content || '')}</p>
      </section>`;

    case 'image':
      return `<section style="padding:14px 0;text-align:center;">
        ${
          d.imageUrl
            ? `<img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.imageAlt || page.title)}" referrerpolicy="no-referrer" style="max-width:100%;width:100%;height:auto;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:block;margin:0 auto;" />`
            : ''
        }
      </section>`;

    case 'video': {
      const url = (d.videoUrl || '').trim();
      let embedSrc = url;
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      if (ytMatch) {
        embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      } else {
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      return `<section style="padding:16px 0;">
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:#000;">
          <iframe src="${escapeHtml(embedSrc)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      </section>`;
    }

    case 'cta':
      return `<section class="${d.isCheckoutLink ? 'delay-cta' : ''}" style="margin:24px 0;padding:28px;border-radius:18px;background:var(--ff-surface);border:1px solid rgba(255,255,255,0.08);text-align:center;">
        ${d.title ? `<h3 style="margin:0 0 8px;font-size:22px;font-weight:700;">${escapeHtml(d.title)}</h3>` : ''}
        ${d.subtitle ? `<p style="margin:0 0 20px;font-size:15px;color:var(--ff-muted);">${escapeHtml(d.subtitle)}</p>` : ''}
        <a href="${escapeHtml(d.buttonUrl || page.affiliate_url || '#')}" class="ff-btn" data-checkout="${d.isCheckoutLink ? 'true' : 'false'}">${escapeHtml(d.buttonText || 'Continuar')}</a>
      </section>`;

    case 'lead_form': {
      const formId = `ff-form-${block.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      return `<section style="margin:24px 0;padding:28px;border-radius:18px;background:var(--ff-surface);border:1px solid rgba(255,255,255,0.08);">
        ${d.title ? `<h3 style="margin:0 0 8px;font-size:21px;font-weight:700;text-align:center;">${escapeHtml(d.title)}</h3>` : ''}
        ${d.subtitle ? `<p style="margin:0 0 20px;font-size:14px;color:var(--ff-muted);text-align:center;">${escapeHtml(d.subtitle)}</p>` : ''}
        <form id="${formId}" onsubmit="return window.__ffSubmitLead(event, '${formId}', '${leadEndpoint}', '${escapeHtml(page.id)}', '${escapeHtml(d.successMessage || 'Cadastro realizado com sucesso!')}');" style="display:flex;flex-direction:column;gap:12px;">
          <input type="text" name="name" required placeholder="Seu nome completo" style="width:100%;padding:13px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#262932;color:#F4F4F6;font-size:15px;" />
          <input type="email" name="email" required placeholder="Seu melhor e-mail" style="width:100%;padding:13px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#262932;color:#F4F4F6;font-size:15px;" />
          ${
            d.collectPhone
              ? `<input type="tel" name="phone" placeholder="WhatsApp com DDD (opcional)" style="width:100%;padding:13px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#262932;color:#F4F4F6;font-size:15px;" />`
              : ''
          }
          <button type="submit" class="ff-btn" style="width:100%;margin-top:4px;">${escapeHtml(d.submitText || 'Enviar Agora')}</button>
          <p id="${formId}-msg" style="display:none;margin:8px 0 0;padding:12px;border-radius:10px;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.3);color:#34D399;font-size:14px;text-align:center;"></p>
        </form>
      </section>`;
    }

    case 'link_list': {
      const links = Array.isArray(d.links) ? d.links : [];
      return `<section style="padding:12px 0;display:flex;flex-direction:column;gap:12px;">
        ${links
          .map(
            (link) => `<a href="${escapeHtml(link.url)}" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-radius:14px;text-decoration:none;color:#FFFFFF;${
              link.highlight
                ? 'background:linear-gradient(135deg, var(--ff-accent-start) 0%, var(--ff-accent-end) 100%);box-shadow:0 8px 24px -6px rgba(255,107,0,0.35);'
                : 'background:var(--ff-surface);border:1px solid rgba(255,255,255,0.08);'
            }">
              <div>
                <div style="font-size:15px;font-weight:700;color:#FFFFFF;">${escapeHtml(link.label)}</div>
                ${link.sublabel ? `<div style="font-size:13px;color:${link.highlight ? 'rgba(255,255,255,0.85)' : 'var(--ff-muted)'};margin-top:2px;">${escapeHtml(link.sublabel)}</div>` : ''}
              </div>
              <span style="font-size:18px;">&rarr;</span>
            </a>`
          )
          .join('')}
      </section>`;
    }

    case 'countdown': {
      const minutes = Math.max(1, Number(d.countdownMinutes || 15));
      const timerId = `ff-cd-${block.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      const label = escapeHtml(d.countdownLabel || 'Esta condição especial expira em:');
      const expiredText = escapeHtml(d.countdownExpiredText || 'Últimos minutos disponíveis!');
      return `<section style="margin:20px 0;padding:22px 24px;border-radius:16px;background:var(--ff-surface);border:1px solid rgba(255,107,0,0.28);text-align:center;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#FF6B00;">${label}</p>
        <div id="${timerId}" style="font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-size:32px;font-weight:800;letter-spacing:0.04em;color:#FFFFFF;">${String(minutes).padStart(2, '0')}:00</div>
        <script>
          (function(){
            var el = document.getElementById('${timerId}');
            if (!el) return;
            var total = ${minutes} * 60;
            var iv = setInterval(function(){
              total -= 1;
              if (total <= 0) {
                clearInterval(iv);
                el.textContent = ${JSON.stringify(expiredText)};
                el.style.fontSize = '18px';
                return;
              }
              var m = Math.floor(total / 60);
              var s = total % 60;
              el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            }, 1000);
          })();
        </script>
      </section>`;
    }

    case 'divider':
      return `<hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />`;

    default:
      return '';
  }
}

function renderBlocksPageHtml(page: PageRecord, baseOrigin: string): string {
  const t = page.theme;
  const maxWidthPx = t.maxWidth === 'sm' ? '520px' : t.maxWidth === 'lg' ? '960px' : '740px';
  const blocksHtml = page.blocks.map((b) => renderBlockHtml(b, page, baseOrigin)).join('\n');

  return `<!doctype html>
<html lang="${page.language.toLowerCase()}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@400;600;700;800&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ff-bg: ${escapeHtml(t.backgroundColor || '#121316')};
      --ff-surface: ${escapeHtml(t.surfaceColor || '#1C1E24')};
      --ff-text: ${escapeHtml(t.textColor || '#F4F4F6')};
      --ff-muted: ${escapeHtml(t.mutedColor || '#9CA3AF')};
      --ff-accent-start: ${escapeHtml(t.accentGradientStart || '#FF6B00')};
      --ff-accent-end: ${escapeHtml(t.accentGradientEnd || '#E61919')};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background-color: var(--ff-bg);
      color: var(--ff-text);
      font-family: '${escapeHtml(t.fontFamily || 'Plus Jakarta Sans')}', -apple-system, sans-serif;
    }
    .ff-container {
      width: 100%;
      max-width: ${maxWidthPx};
      margin: 0 auto;
      padding: ${Number(t.paddingY ?? 32)}px 20px ${Math.max(40, Number(t.paddingY ?? 32))}px;
      display: flex;
      flex-direction: column;
      gap: ${Number(t.blockGap ?? 16)}px;
    }
    .ff-btn {
      display: inline-block;
      background: linear-gradient(135deg, var(--ff-accent-start) 0%, var(--ff-accent-end) 100%);
      color: #FFFFFF;
      text-decoration: none;
      border: none;
      border-radius: 12px;
      padding: 15px 28px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 28px -6px rgba(255, 107, 0, 0.4);
      transition: filter 0.18s ease, transform 0.18s ease;
    }
    .ff-btn:hover { filter: brightness(1.08); }
    .ff-btn:active { transform: translateY(1px); }
  </style>
  ${buildPixelsHeadHtml(page)}
</head>
<body>
  ${page.scripts.bodyStartHtml}
  <main class="ff-container">
    ${blocksHtml}
  </main>
  ${buildLegalFooterHtml(page)}
  <script>
    window.__ffSubmitLead = function(ev, formId, endpoint, pageId, successMsg) {
      ev.preventDefault();
      var form = document.getElementById(formId);
      var msgEl = document.getElementById(formId + '-msg');
      var data = new FormData(form);
      var params = window.__flowForgeParams || {};
      var payload = {
        pageId: pageId,
        name: data.get('name') || '',
        email: data.get('email') || '',
        phone: data.get('phone') || '',
        utm_source: params.utm_source || '',
        utm_medium: params.utm_medium || '',
        utm_campaign: params.utm_campaign || '',
        utm_content: params.utm_content || '',
        utm_term: params.utm_term || '',
        gclid: params.gclid || '',
        fbclid: params.fbclid || '',
        src: params.src || '',
        sck: params.sck || ''
      };
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(r) {
        if (!r.ok) throw new Error('Erro ao enviar');
        form.reset();
        msgEl.textContent = successMsg;
        msgEl.style.display = 'block';
      }).catch(function() {
        msgEl.textContent = 'Não foi possível concluir o envio. Tente novamente.';
        msgEl.style.display = 'block';
      });
      return false;
    };
  </script>
  ${page.scripts.bodyEndHtml}
</body>
</html>`;
}

export function compilePageHtml(
  page: PageRecord,
  options: { baseOrigin?: string; isPreview?: boolean } = {}
): string {
  const baseOrigin = options.baseOrigin ?? '';
  const isPreview = Boolean(options.isPreview);

  let html = '';
  if (page.page_type === 'presell_cookies') {
    html = renderPresellCookiesHtml(page, baseOrigin);
  } else if (page.page_type === 'cloned' || (page.html_content && page.blocks.length === 0)) {
    const $ = cheerio.load(page.html_content || `<!doctype html><html><head><title>${escapeHtml(page.title)}</title></head><body></body></html>`);
    if ($('head').length === 0) $('html').prepend('<head></head>');
    if ($('body').length === 0) $('html').append('<body></body>');

    const headInjection = buildPixelsHeadHtml(page);
    if (headInjection) $('head').append(headInjection);
    if (page.scripts.bodyStartHtml) $('body').prepend(page.scripts.bodyStartHtml);
    const footer = buildLegalFooterHtml(page);
    if (footer) $('body').append(footer);
    if (page.scripts.bodyEndHtml) $('body').append(page.scripts.bodyEndHtml);

    html = $.html();
  } else {
    html = renderBlocksPageHtml(page, baseOrigin);
  }

  // Inject Flow Tracking + Conversion Tools script before </body>
  const flowTrackingSnippet = page.conversion_tools.utmPassthroughEnabled
    ? generateFlowTrackingScript(page.id)
    : '';
  const trackingScript = `${flowTrackingSnippet}\n${buildFlowTrackingAndConversionScript(
    page,
    baseOrigin,
    isPreview
  )}`;
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${trackingScript}\n</body>`);
  } else {
    html += trackingScript;
  }

  return html;
}

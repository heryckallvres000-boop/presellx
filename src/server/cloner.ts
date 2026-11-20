import * as cheerio from 'cheerio';
import type { PageLanguage, ParsedImageAsset, ParsedLinkAsset } from '../types.ts';
import { translateTextBatch } from './ai.ts';

const TRACKER_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Meta / Facebook Pixel', regex: /connect\.facebook\.net|fbevents\.js|\bfbq\s*\(/i },
  { name: 'Google Tag Manager', regex: /googletagmanager\.com\/gtm\.js|\bGTM-[A-Z0-9]+/i },
  { name: 'Google Analytics / Ads Tag', regex: /google-analytics\.com|googletagmanager\.com\/gtag|\bgtag\s*\(|\b_gaq\b/i },
  { name: 'TikTok Pixel', regex: /analytics\.tiktok\.com|\bttq\./i },
  { name: 'Hotjar', regex: /static\.hotjar\.com|\bhj\s*\(/i },
  { name: 'Microsoft Clarity', regex: /clarity\.ms\/tag|\bclarity\s*\(/i },
  { name: 'Taboola / Outbrain Pixel', regex: /cdn\.taboola\.com|widgets\.outbrain\.com|\b_tfa\b/i },
  { name: 'Kwai / Pinterest / Snap Pixel', regex: /s\.pinimg\.com\/ct|sc-static\.net\/scevent|kwai/i },
  { name: 'Cloaker / Frame-Buster / Redirect', regex: /top\.location\s*[!=]==?\s*(self|window)\.location|window\.location\.replace\s*\(/i },
];

function resolveAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return rawUrl;
  }
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return rawUrl;
  }
}

function absolutizeCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_match, quote, urlPath) => {
    const abs = resolveAbsoluteUrl(urlPath, baseUrl);
    return `url(${quote}${abs}${quote})`;
  });
}

function absolutizeSrcset(srcset: string, baseUrl: string): string {
  return srcset
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (!parts[0]) return entry;
      parts[0] = resolveAbsoluteUrl(parts[0], baseUrl);
      return parts.join(' ');
    })
    .join(', ');
}

export interface CloneResult {
  title: string;
  html: string;
  removedTrackers: string[];
  linksCount: number;
  imagesCount: number;
  translatedTo: PageLanguage | null;
}

export async function cloneAndSanitizeUrl(options: {
  url: string;
  stripTrackers?: boolean;
  translateTo?: PageLanguage | 'ORIGINAL';
}): Promise<CloneResult> {
  let targetUrl = options.url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const parsedTarget = new URL(targetUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let htmlRaw = '';
  try {
    const response = await fetch(parsedTarget.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!response.ok) {
      throw new Error(`O servidor de destino respondeu com HTTP ${response.status}`);
    }
    targetUrl = response.url || parsedTarget.toString();
    htmlRaw = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(htmlRaw);
  const baseHref = $('base').attr('href');
  const effectiveBase = baseHref ? resolveAbsoluteUrl(baseHref, targetUrl) : targetUrl;
  $('base').remove();

  const removedSet = new Set<string>();
  const shouldStrip = options.stripTrackers !== false;

  if (shouldStrip) {
    // Strip meta refresh redirects
    $('meta[http-equiv]').each((_idx, el) => {
      const val = ($(el).attr('http-equiv') || '').toLowerCase();
      if (val === 'refresh') {
        removedSet.add('Meta Refresh Redirect');
        $(el).remove();
      }
    });

    // Strip tracking scripts
    $('script').each((_idx, el) => {
      const src = $(el).attr('src') || '';
      const inline = $(el).html() || '';
      const combined = `${src}\n${inline}`;
      for (const pattern of TRACKER_PATTERNS) {
        if (pattern.regex.test(combined)) {
          removedSet.add(pattern.name);
          $(el).remove();
          return;
        }
      }
    });

    // Strip tracking noscript pixels and hidden 1x1 tracking images
    $('noscript').each((_idx, el) => {
      const content = $(el).html() || '';
      for (const pattern of TRACKER_PATTERNS) {
        if (pattern.regex.test(content)) {
          removedSet.add(pattern.name);
          $(el).remove();
          return;
        }
      }
    });

    $('img').each((_idx, el) => {
      const src = $(el).attr('src') || '';
      if (/facebook\.com\/tr|google-analytics\.com\/collect|bat\.bing\.com|ct\.pinterest\.com/i.test(src)) {
        removedSet.add('Tracking Pixel <img>');
        $(el).remove();
      }
    });
  }

  // Absolutize URLs on tags
  $('img, source, video, audio, iframe, script').each((_idx, el) => {
    const src = $(el).attr('src');
    if (src) $(el).attr('src', resolveAbsoluteUrl(src, effectiveBase));

    const dataSrc = $(el).attr('data-src');
    if (dataSrc && !src) {
      const absData = resolveAbsoluteUrl(dataSrc, effectiveBase);
      $(el).attr('src', absData);
      $(el).attr('data-src', absData);
    }

    const poster = $(el).attr('poster');
    if (poster) $(el).attr('poster', resolveAbsoluteUrl(poster, effectiveBase));

    const srcset = $(el).attr('srcset');
    if (srcset) $(el).attr('srcset', absolutizeSrcset(srcset, effectiveBase));
  });

  $('link').each((_idx, el) => {
    const href = $(el).attr('href');
    if (href) $(el).attr('href', resolveAbsoluteUrl(href, effectiveBase));
  });

  $('a').each((_idx, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#')) {
      $(el).attr('href', resolveAbsoluteUrl(href, effectiveBase));
    }
  });

  $('form').each((_idx, el) => {
    const action = $(el).attr('action');
    if (action) $(el).attr('action', resolveAbsoluteUrl(action, effectiveBase));
  });

  $('style').each((_idx, el) => {
    const css = $(el).html();
    if (css) $(el).html(absolutizeCssUrls(css, effectiveBase));
  });

  $('[style]').each((_idx, el) => {
    const styleVal = $(el).attr('style');
    if (styleVal && styleVal.includes('url(')) {
      $(el).attr('style', absolutizeCssUrls(styleVal, effectiveBase));
    }
  });

  let translatedTo: PageLanguage | null = null;
  if (options.translateTo && options.translateTo !== 'ORIGINAL') {
    const targetLang = options.translateTo;
    const textEntries: Array<{ type: 'text'; node: any; orig: string } | { type: 'title'; orig: string }> = [];

    const pageTitle = $('title').text().trim();
    if (pageTitle) {
      textEntries.push({ type: 'title', orig: pageTitle });
    }

    const walk = (node: any) => {
      if (!node) return;
      if (node.type === 'tag' && ['script', 'style', 'noscript', 'svg', 'code', 'pre'].includes(node.name)) {
        return;
      }
      if (node.type === 'text') {
        const val = String(node.data || '');
        const trimmed = val.trim();
        if (trimmed.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(trimmed)) {
          textEntries.push({ type: 'text', node, orig: trimmed });
        }
        return;
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    };

    $('body').contents().each((_idx, el) => walk(el));

    if (textEntries.length > 0) {
      const translated = await translateTextBatch(
        textEntries.map((e) => e.orig),
        targetLang
      );
      textEntries.forEach((entry, idx) => {
        const nextText = translated[idx] ?? entry.orig;
        if (entry.type === 'title') {
          $('title').text(nextText);
        } else {
          const raw = String(entry.node.data || '');
          const leading = raw.match(/^\s*/)?.[0] ?? '';
          const trailing = raw.match(/\s*$/)?.[0] ?? '';
          entry.node.data = `${leading}${nextText}${trailing}`;
        }
      });
      $('html').attr('lang', targetLang.toLowerCase());
      translatedTo = targetLang;
    }
  }

  const title = $('title').text().trim() || parsedTarget.hostname;
  const linksCount = $('a').length;
  const imagesCount = $('img').length;

  return {
    title,
    html: $.html(),
    removedTrackers: Array.from(removedSet),
    linksCount,
    imagesCount,
    translatedTo,
  };
}

export function extractAssetsFromHtml(html: string): {
  links: ParsedLinkAsset[];
  images: ParsedImageAsset[];
  plainText: string;
} {
  const $ = cheerio.load(html || '<html><body></body></html>');
  const links: ParsedLinkAsset[] = [];
  $('a').each((idx, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim() || '(Link sem texto)';
    const isCheckoutCandidate =
      /checkout|pay|cart|hotmart|kiwify|eduzz|monetizze|braip|stripe|buy|comprar|offer|order/i.test(
        `${href} ${text}`
      );
    links.push({ index: idx, text: text.slice(0, 80), href, isCheckoutCandidate });
  });

  const images: ParsedImageAsset[] = [];
  $('img').each((idx, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || `Imagem #${idx + 1}`;
    if (src) {
      images.push({ index: idx, alt: alt.slice(0, 80), src });
    }
  });

  $('script, style, noscript').remove();
  const plainText = $('body').text().replace(/\s+/g, ' ').trim();

  return { links, images, plainText };
}

export function updateHtmlAssets(
  html: string,
  updates: {
    linkReplacements?: Record<number, string>;
    imageReplacements?: Record<number, string>;
    bulkCheckoutUrl?: string;
    textReplacements?: Array<{ find: string; replace: string }>;
  }
): string {
  const $ = cheerio.load(html || '<html><body></body></html>');

  if (updates.bulkCheckoutUrl) {
    $('a').each((_idx, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text() || '';
      if (
        href &&
        !href.startsWith('#') &&
        (/checkout|pay|cart|hotmart|kiwify|eduzz|monetizze|braip|stripe|buy|comprar|garantir|quero|acessar/i.test(
          `${href} ${text}`
        ) ||
          $(el).attr('data-checkout') === 'true')
      ) {
        $(el).attr('href', updates.bulkCheckoutUrl!);
      }
    });
  }

  if (updates.linkReplacements) {
    const links = $('a');
    Object.entries(updates.linkReplacements).forEach(([idxStr, newHref]) => {
      const idx = Number(idxStr);
      const target = links.eq(idx);
      if (target.length) {
        target.attr('href', newHref);
      }
    });
  }

  if (updates.imageReplacements) {
    const imgs = $('img');
    Object.entries(updates.imageReplacements).forEach(([idxStr, newSrc]) => {
      const idx = Number(idxStr);
      const target = imgs.eq(idx);
      if (target.length) {
        target.attr('src', newSrc);
        target.removeAttr('srcset');
      }
    });
  }

  let output = $.html();
  if (updates.textReplacements && updates.textReplacements.length > 0) {
    for (const pair of updates.textReplacements) {
      if (pair.find && pair.replace) {
        output = output.split(pair.find).join(pair.replace);
      }
    }
  }

  return output;
}

import crypto from 'crypto';
import dns from 'dns/promises';
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { auditCompliance, generateCopyVariations, translateTextBatch } from './src/server/ai.ts';
import { cloneAndSanitizeUrl, extractAssetsFromHtml, updateHtmlAssets } from './src/server/cloner.ts';
import { compilePageHtml } from './src/server/compiler.ts';
import {
  DEFAULT_CONVERSION_TOOLS,
  DEFAULT_COOKIE_CONFIG,
  DEFAULT_SCRIPTS,
  DEFAULT_THEME,
  db,
  ensureUniqueSlug,
  getPageById,
  getPageBySlug,
  initDatabase,
  listDomains,
  listFolders,
  listLeads,
  listPages,
} from './src/server/db.ts';
import type { PageBlock, PageLanguage, PageType } from './src/types.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

function getRequestOrigin(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CODEXPAGES', timestamp: new Date().toISOString() });
});

// ======================== FOLDERS ========================
app.get('/api/folders', (_req, res) => {
  res.json(listFolders());
});

app.post('/api/folders', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const color = String(req.body?.color || '#FF6B00').trim();
  if (!name) {
    res.status(400).json({ error: 'Nome da pasta é obrigatório.' });
    return;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    name,
    color,
    now
  );
  res.status(201).json({ id, name, color, created_at: now });
});

app.delete('/api/folders/:id', (req, res) => {
  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ======================== DOMAINS ========================
app.get('/api/domains', (_req, res) => {
  res.json(listDomains());
});

app.post('/api/domains', (req, res) => {
  const rawHost = String(req.body?.hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!rawHost || !rawHost.includes('.')) {
    res.status(400).json({ error: 'Informe um domínio válido (ex: ofertas.seudominio.com).' });
    return;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const originHost = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL')
    ? new URL(process.env.APP_URL).hostname
    : 'cname.codexpages.app';

  try {
    db.prepare(
      'INSERT INTO domains (id, hostname, cname_target, ssl_status, verified, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, rawHost, originHost, 'pending', 0, now);
    res.status(201).json({
      id,
      hostname: rawHost,
      cname_target: originHost,
      ssl_status: 'pending',
      verified: false,
      created_at: now,
    });
  } catch {
    res.status(409).json({ error: 'Este domínio já está cadastrado.' });
  }
});

app.post('/api/domains/:id/verify', async (req, res) => {
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!domain) {
    res.status(404).json({ error: 'Domínio não encontrado.' });
    return;
  }
  const hostname = String(domain.hostname);
  let verified = false;
  let details = '';

  try {
    const cnames = await dns.resolveCname(hostname).catch(() => [] as string[]);
    const aRecords = await dns.resolve4(hostname).catch(() => [] as string[]);
    if (cnames.length > 0 || aRecords.length > 0) {
      verified = true;
      details = cnames.length > 0 ? `CNAME apontando para ${cnames[0]}` : `Registro A resolvido (${aRecords[0]})`;
    } else {
      details = 'Nenhum registro CNAME ou A detectado ainda na propagação DNS.';
    }
  } catch {
    details = 'Propagação DNS pendente para este hostname.';
  }

  db.prepare('UPDATE domains SET verified = ?, ssl_status = ? WHERE id = ?').run(
    verified ? 1 : 0,
    verified ? 'active' : 'pending',
    req.params.id
  );

  res.json({
    id: req.params.id,
    hostname,
    verified,
    ssl_status: verified ? 'active' : 'pending',
    details,
  });
});

app.delete('/api/domains/:id', (req, res) => {
  db.prepare('DELETE FROM domains WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ======================== PAGES ========================
app.get('/api/pages', (_req, res) => {
  res.json(listPages());
});

app.get('/api/pages/:id', (req, res) => {
  const page = getPageById(req.params.id);
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }
  res.json(page);
});

app.post('/api/pages', (req, res) => {
  const body = req.body || {};
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = String(body.title || 'Nova Página').trim();
  const slug = ensureUniqueSlug(String(body.slug || title));
  const pageType = (body.page_type || 'blocks') as PageType;
  const language = (body.language || 'PT') as PageLanguage;
  const status = body.status === 'draft' ? 'draft' : 'published';

  const blocks = Array.isArray(body.blocks) ? body.blocks : [];
  const theme = { ...DEFAULT_THEME, ...(body.theme || {}) };
  const cookieConfig = { ...DEFAULT_COOKIE_CONFIG, ...(body.cookie_config || {}) };
  const scripts = { ...DEFAULT_SCRIPTS, ...(body.scripts || {}) };
  const conversionTools = { ...DEFAULT_CONVERSION_TOOLS, ...(body.conversion_tools || {}) };

  db.prepare(
    `INSERT INTO pages (
      id, title, slug, folder_id, domain_id, page_type, status, language,
      source_url, affiliate_url, html_content, blocks_json, theme_json,
      cookie_config_json, scripts_json, conversion_tools_json,
      views_count, clicks_count, leads_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
  ).run(
    id,
    title,
    slug,
    body.folder_id || null,
    body.domain_id || null,
    pageType,
    status,
    language,
    String(body.source_url || ''),
    String(body.affiliate_url || ''),
    String(body.html_content || ''),
    JSON.stringify(blocks),
    JSON.stringify(theme),
    JSON.stringify(cookieConfig),
    JSON.stringify(scripts),
    JSON.stringify(conversionTools),
    now,
    now
  );

  res.status(201).json(getPageById(id));
});

app.put('/api/pages/:id', (req, res) => {
  const existing = getPageById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }

  const body = req.body || {};
  const title = body.title !== undefined ? String(body.title).trim() || existing.title : existing.title;
  const slug =
    body.slug !== undefined ? ensureUniqueSlug(String(body.slug), existing.id) : existing.slug;
  const folderId = body.folder_id !== undefined ? body.folder_id : existing.folder_id;
  const domainId = body.domain_id !== undefined ? body.domain_id : existing.domain_id;
  const pageType = body.page_type ?? existing.page_type;
  const status = body.status ?? existing.status;
  const language = body.language ?? existing.language;
  const sourceUrl = body.source_url !== undefined ? String(body.source_url) : existing.source_url;
  const affiliateUrl =
    body.affiliate_url !== undefined ? String(body.affiliate_url) : existing.affiliate_url;
  const htmlContent =
    body.html_content !== undefined ? String(body.html_content) : existing.html_content;
  const blocks = body.blocks !== undefined ? body.blocks : existing.blocks;
  const theme = body.theme ? { ...existing.theme, ...body.theme } : existing.theme;
  const cookieConfig = body.cookie_config
    ? { ...existing.cookie_config, ...body.cookie_config }
    : existing.cookie_config;
  const scripts = body.scripts ? { ...existing.scripts, ...body.scripts } : existing.scripts;
  const conversionTools = body.conversion_tools
    ? { ...existing.conversion_tools, ...body.conversion_tools }
    : existing.conversion_tools;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE pages SET
      title = ?, slug = ?, folder_id = ?, domain_id = ?, page_type = ?, status = ?, language = ?,
      source_url = ?, affiliate_url = ?, html_content = ?, blocks_json = ?, theme_json = ?,
      cookie_config_json = ?, scripts_json = ?, conversion_tools_json = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    title,
    slug,
    folderId,
    domainId,
    pageType,
    status,
    language,
    sourceUrl,
    affiliateUrl,
    htmlContent,
    JSON.stringify(blocks),
    JSON.stringify(theme),
    JSON.stringify(cookieConfig),
    JSON.stringify(scripts),
    JSON.stringify(conversionTools),
    now,
    existing.id
  );

  res.json(getPageById(existing.id));
});

app.post('/api/pages/:id/duplicate', (req, res) => {
  const orig = getPageById(req.params.id);
  if (!orig) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const newTitle = `${orig.title} (Variação A/B)`;
  const newSlug = ensureUniqueSlug(`${orig.slug}-var`);

  db.prepare(
    `INSERT INTO pages (
      id, title, slug, folder_id, domain_id, page_type, status, language,
      source_url, affiliate_url, html_content, blocks_json, theme_json,
      cookie_config_json, scripts_json, conversion_tools_json,
      views_count, clicks_count, leads_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
  ).run(
    newId,
    newTitle,
    newSlug,
    orig.folder_id,
    orig.domain_id,
    orig.page_type,
    orig.language,
    orig.source_url,
    orig.affiliate_url,
    orig.html_content,
    JSON.stringify(orig.blocks),
    JSON.stringify(orig.theme),
    JSON.stringify(orig.cookie_config),
    JSON.stringify(orig.scripts),
    JSON.stringify(orig.conversion_tools),
    now,
    now
  );

  res.status(201).json(getPageById(newId));
});

app.delete('/api/pages/:id', (req, res) => {
  db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/pages/:id/preview', (req, res) => {
  const page = getPageById(req.params.id);
  if (!page) {
    res.status(404).send('Página não encontrada.');
    return;
  }
  const html = compilePageHtml(page, { baseOrigin: getRequestOrigin(req), isPreview: true });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.get('/api/pages/:id/export', (req, res) => {
  const page = getPageById(req.params.id);
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }
  const html = compilePageHtml(page, { baseOrigin: getRequestOrigin(req), isPreview: false });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${page.slug}.html"`);
  res.send(html);
});

app.get('/api/pages/:id/assets', (req, res) => {
  const page = getPageById(req.params.id);
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }
  const htmlSource =
    page.page_type === 'cloned' || page.html_content
      ? page.html_content
      : compilePageHtml(page, { isPreview: true });
  const assets = extractAssetsFromHtml(htmlSource);
  res.json(assets);
});

app.post('/api/pages/:id/assets', (req, res) => {
  const page = getPageById(req.params.id);
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }

  const { linkReplacements, imageReplacements, bulkCheckoutUrl, textReplacements } = req.body || {};

  if (page.page_type === 'cloned' || (page.html_content && page.blocks.length === 0)) {
    const updatedHtml = updateHtmlAssets(page.html_content, {
      linkReplacements,
      imageReplacements,
      bulkCheckoutUrl,
      textReplacements,
    });
    db.prepare('UPDATE pages SET html_content = ?, updated_at = ? WHERE id = ?').run(
      updatedHtml,
      new Date().toISOString(),
      page.id
    );
  } else {
    let blocks = [...page.blocks];
    if (bulkCheckoutUrl) {
      blocks = blocks.map((b) => {
        const nextData = { ...b.data };
        if (b.type === 'hero' || b.type === 'cta') {
          if (nextData.buttonUrl !== undefined || nextData.isCheckoutLink) {
            nextData.buttonUrl = bulkCheckoutUrl;
          }
        }
        return { ...b, data: nextData };
      });
    }
    if (Array.isArray(textReplacements) && textReplacements.length > 0) {
      let serialized = JSON.stringify(blocks);
      for (const pair of textReplacements) {
        if (pair.find && pair.replace) {
          serialized = serialized.split(pair.find).join(pair.replace);
        }
      }
      blocks = JSON.parse(serialized) as PageBlock[];
    }
    db.prepare('UPDATE pages SET blocks_json = ?, affiliate_url = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(blocks),
      bulkCheckoutUrl || page.affiliate_url,
      new Date().toISOString(),
      page.id
    );
  }

  res.json(getPageById(page.id));
});

// ======================== CLONER ========================
app.post('/api/clone', async (req, res) => {
  const url = String(req.body?.url || '').trim();
  const stripTrackers = req.body?.stripTrackers !== false;
  const translateTo = (req.body?.translateTo || 'ORIGINAL') as PageLanguage | 'ORIGINAL';

  if (!url) {
    res.status(400).json({ error: 'Informe a URL de origem para clonar.' });
    return;
  }

  try {
    const result = await cloneAndSanitizeUrl({ url, stripTrackers, translateTo });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao clonar URL.';
    res.status(502).json({ error: `Erro ao clonar página: ${message}` });
  }
});

// ======================== GEMINI AI ========================
app.post('/api/ai/variations', async (req, res) => {
  try {
    const { headline, subheadline, cta, productContext, language } = req.body || {};
    const variations = await generateCopyVariations({
      headline: String(headline || ''),
      subheadline: String(subheadline || ''),
      cta: String(cta || 'Saiba Mais'),
      productContext: String(productContext || ''),
      language: (language || 'PT') as PageLanguage,
    });
    res.json({ variations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar Gemini API.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/ai/compliance', async (req, res) => {
  try {
    const { pageText, language } = req.body || {};
    if (!String(pageText || '').trim()) {
      res.status(400).json({ error: 'Não há texto suficiente na página para auditar.' });
      return;
    }
    const audit = await auditCompliance({
      pageText: String(pageText),
      language: (language || 'PT') as PageLanguage,
    });
    res.json(audit);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro na auditoria de compliance.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/ai/translate-blocks', async (req, res) => {
  try {
    const { blocks, targetLanguage } = req.body || {};
    if (!Array.isArray(blocks) || !targetLanguage) {
      res.status(400).json({ error: 'Dados inválidos para tradução.' });
      return;
    }

    const strings: string[] = [];
    const pointers: Array<{ blockIdx: number; field: string; linkIdx?: number }> = [];

    blocks.forEach((b: PageBlock, bIdx: number) => {
      const textFields = [
        'eyebrow',
        'title',
        'subtitle',
        'content',
        'buttonText',
        'submitText',
        'successMessage',
      ] as const;
      textFields.forEach((f) => {
        const val = b.data?.[f];
        if (typeof val === 'string' && val.trim()) {
          strings.push(val);
          pointers.push({ blockIdx: bIdx, field: f });
        }
      });
      if (Array.isArray(b.data?.links)) {
        b.data.links.forEach((l, lIdx) => {
          if (l.label?.trim()) {
            strings.push(l.label);
            pointers.push({ blockIdx: bIdx, field: 'link_label', linkIdx: lIdx });
          }
          if (l.sublabel?.trim()) {
            strings.push(l.sublabel);
            pointers.push({ blockIdx: bIdx, field: 'link_sublabel', linkIdx: lIdx });
          }
        });
      }
    });

    const translated = await translateTextBatch(strings, targetLanguage as PageLanguage);
    const clonedBlocks: PageBlock[] = JSON.parse(JSON.stringify(blocks));

    pointers.forEach((ptr, idx) => {
      const nextVal = translated[idx];
      if (!nextVal) return;
      const targetBlock = clonedBlocks[ptr.blockIdx];
      if (ptr.field === 'link_label' && ptr.linkIdx !== undefined && targetBlock.data.links) {
        targetBlock.data.links[ptr.linkIdx].label = nextVal;
      } else if (ptr.field === 'link_sublabel' && ptr.linkIdx !== undefined && targetBlock.data.links) {
        targetBlock.data.links[ptr.linkIdx].sublabel = nextVal;
      } else {
        (targetBlock.data as Record<string, unknown>)[ptr.field] = nextVal;
      }
    });

    res.json({ blocks: clonedBlocks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao traduzir blocos.';
    res.status(500).json({ error: message });
  }
});

// ======================== PUBLIC SERVING & TRACKING ========================
app.get('/p/:slug', (req, res) => {
  const page = getPageBySlug(req.params.slug);
  if (!page) {
    res.status(404).send('<h1>404 — Página não encontrada</h1>');
    return;
  }
  const isPreview = req.query.preview === '1';
  if (page.status === 'draft' && !isPreview) {
    res.status(404).send('<h1>Esta página está em rascunho</h1>');
    return;
  }
  const html = compilePageHtml(page, { baseOrigin: getRequestOrigin(req), isPreview });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.post('/api/public/track', (req, res) => {
  const { pageId, eventType, visitorHash, utm_source, utm_medium, utm_campaign, referrer, targetUrl } =
    req.body || {};
  if (!pageId || !eventType) {
    res.status(400).json({ error: 'pageId e eventType são obrigatórios.' });
    return;
  }
  const page = getPageById(String(pageId));
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO events (id, page_id, event_type, visitor_hash, utm_source, utm_medium, utm_campaign, referrer, target_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    page.id,
    String(eventType),
    String(visitorHash || ''),
    String(utm_source || 'direct'),
    String(utm_medium || ''),
    String(utm_campaign || ''),
    String(referrer || ''),
    String(targetUrl || ''),
    now
  );

  if (eventType === 'view') {
    db.prepare('UPDATE pages SET views_count = views_count + 1 WHERE id = ?').run(page.id);
  } else if (eventType === 'click') {
    db.prepare('UPDATE pages SET clicks_count = clicks_count + 1 WHERE id = ?').run(page.id);
  }

  res.json({ ok: true });
});

app.post('/api/public/lead', (req, res) => {
  const body = req.body || {};
  const pageId = String(body.pageId || '');
  const email = String(body.email || '').trim();
  if (!pageId || !email) {
    res.status(400).json({ error: 'E-mail e página são obrigatórios.' });
    return;
  }

  const page = getPageById(pageId);
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada.' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO leads (
      id, page_id, name, email, phone, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, gclid, fbclid, src, sck, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    page.id,
    String(body.name || ''),
    email,
    String(body.phone || ''),
    String(body.utm_source || 'direct'),
    String(body.utm_medium || ''),
    String(body.utm_campaign || ''),
    String(body.utm_content || ''),
    String(body.utm_term || ''),
    String(body.gclid || ''),
    String(body.fbclid || ''),
    String(body.src || ''),
    String(body.sck || ''),
    now
  );

  db.prepare('UPDATE pages SET leads_count = leads_count + 1 WHERE id = ?').run(page.id);
  db.prepare(
    `INSERT INTO events (id, page_id, event_type, visitor_hash, utm_source, utm_medium, utm_campaign, referrer, target_url, created_at)
     VALUES (?, ?, 'lead', '', ?, ?, ?, '', '', ?)`
  ).run(
    crypto.randomUUID(),
    page.id,
    String(body.utm_source || 'direct'),
    String(body.utm_medium || ''),
    String(body.utm_campaign || ''),
    now
  );

  res.status(201).json({ ok: true, id });
});

// ======================== ANALYTICS & LEADS ========================
app.get('/api/analytics', (req, res) => {
  const filterPageId = req.query.pageId ? String(req.query.pageId) : '';
  const whereClause = filterPageId ? 'WHERE page_id = ?' : '';
  const params = filterPageId ? [filterPageId] : [];

  const totals = db
    .prepare(
      `SELECT
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as totalViews,
        COUNT(DISTINCT CASE WHEN event_type = 'view' AND visitor_hash != '' THEN visitor_hash END) as uniqueViews,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as totalClicks,
        SUM(CASE WHEN event_type = 'lead' THEN 1 ELSE 0 END) as totalLeads
       FROM events ${whereClause}`
    )
    .get(...params) as Record<string, number | null>;

  const totalViews = Number(totals?.totalViews ?? 0);
  const uniqueViews = Number(totals?.uniqueViews ?? 0);
  const totalClicks = Number(totals?.totalClicks ?? 0);
  const totalLeads = Number(totals?.totalLeads ?? 0);
  const ctr = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;
  const conversionRate = totalViews > 0 ? Number(((totalLeads / totalViews) * 100).toFixed(2)) : 0;

  const sources = db
    .prepare(
      `SELECT
        CASE WHEN utm_source = '' THEN 'direct' ELSE utm_source END as source,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN event_type = 'lead' THEN 1 ELSE 0 END) as leads
       FROM events ${whereClause}
       GROUP BY source
       ORDER BY views DESC
       LIMIT 12`
    )
    .all(...params);

  const pageRows = db
    .prepare(
      `SELECT
        p.id, p.title, p.slug, p.page_type,
        p.views_count as views, p.clicks_count as clicks, p.leads_count as leads,
        (SELECT COUNT(DISTINCT visitor_hash) FROM events e WHERE e.page_id = p.id AND e.event_type = 'view' AND e.visitor_hash != '') as uniqueViews
       FROM pages p
       ${filterPageId ? 'WHERE p.id = ?' : ''}
       ORDER BY p.views_count DESC, p.updated_at DESC`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const pages = pageRows.map((r) => {
    const v = Number(r.views ?? 0);
    const c = Number(r.clicks ?? 0);
    return {
      id: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      page_type: String(r.page_type),
      views: v,
      uniqueViews: Number(r.uniqueViews ?? 0),
      clicks: c,
      leads: Number(r.leads ?? 0),
      ctr: v > 0 ? Number(((c / v) * 100).toFixed(2)) : 0,
    };
  });

  const recentEvents = db
    .prepare(
      `SELECT e.id, e.page_id, p.title as page_title, e.event_type, e.utm_source, e.utm_campaign, e.target_url, e.created_at
       FROM events e
       LEFT JOIN pages p ON e.page_id = p.id
       ${filterPageId ? 'WHERE e.page_id = ?' : ''}
       ORDER BY e.created_at DESC
       LIMIT 25`
    )
    .all(...params);

  res.json({
    totalViews,
    uniqueViews,
    totalClicks,
    totalLeads,
    ctr,
    conversionRate,
    sources,
    pages,
    recentEvents,
  });
});

app.get('/api/leads', (_req, res) => {
  res.json(listLeads());
});

app.delete('/api/leads/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/leads/export', (_req, res) => {
  const leads = listLeads();
  const header = [
    'ID',
    'Pagina',
    'Nome',
    'Email',
    'Telefone',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'gclid',
    'fbclid',
    'src',
    'sck',
    'Data',
  ].join(',');

  const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    [
      l.id,
      l.page_title || l.page_id,
      l.name,
      l.email,
      l.phone,
      l.utm_source,
      l.utm_medium,
      l.utm_campaign,
      l.gclid,
      l.fbclid,
      l.src,
      l.sck,
      l.created_at,
    ]
      .map(escapeCsv)
      .join(',')
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="codexpages-leads.csv"');
  res.send([header, ...rows].join('\n'));
});

// ======================== APP ARCHIVE EXPORTS ========================
function addWorkspaceFilesToZip(zip: JSZip, includeDist: boolean) {
  const rootDir = process.cwd();
  const rootFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'server.ts',
    'metadata.json',
    '.env.example',
  ];

  for (const file of rootFiles) {
    const abs = path.join(rootDir, file);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      zip.file(file, fs.readFileSync(abs));
    }
  }

  function addDirRecursive(absDir: string, zipRelDir: string) {
    if (!fs.existsSync(absDir)) return;
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'data'].includes(entry.name)) continue;
      const absEntry = path.join(absDir, entry.name);
      const relEntry = `${zipRelDir}/${entry.name}`;
      if (entry.isDirectory()) {
        addDirRecursive(absEntry, relEntry);
      } else if (entry.isFile()) {
        zip.file(relEntry, fs.readFileSync(absEntry));
      }
    }
  }

  addDirRecursive(path.join(rootDir, 'src'), 'src');
  if (includeDist) {
    addDirRecursive(path.join(rootDir, 'dist'), 'dist');
  }
}

app.get('/api/download/webapp', async (_req, res) => {
  try {
    const zip = new JSZip();
    addWorkspaceFilesToZip(zip, false);
    zip.file(
      'README.txt',
      [
        'CODEXPAGES — Self-Hosted Web App',
        '=================================',
        '',
        '1. Instale as dependencias:',
        '   npm install',
        '',
        '2. (Opcional) Configure sua GEMINI_API_KEY no arquivo .env',
        '',
        '3. Inicie o servidor:',
        '   npm run dev',
        '',
        '4. Acesse no navegador:',
        '   http://localhost:3000',
      ].join('\r\n')
    );

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="CODEXPAGES-WebApp.zip"');
    res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao compactar projeto.';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/download/windows-portable', async (_req, res) => {
  try {
    const zip = new JSZip();
    addWorkspaceFilesToZip(zip, true);

    zip.file(
      'Iniciar-CODEXPAGES.bat',
      [
        '@echo off',
        'title CODEXPAGES Self-Hosted',
        'cd /d "%~dp0"',
        'where node >nul 2>nul',
        'if %ERRORLEVEL% NEQ 0 (',
        '  echo [ERRO] Node.js 20+ nao encontrado. Baixe em https://nodejs.org',
        '  pause',
        '  exit /b 1',
        ')',
        'if not exist "node_modules" (',
        '  echo Instalando dependencias iniciais do CODEXPAGES...',
        '  call npm install',
        ')',
        'echo Iniciando CODEXPAGES em http://localhost:3000 ...',
        'start "" http://localhost:3000',
        'call npm run dev',
        'pause',
      ].join('\r\n')
    );

    zip.file(
      'README-WINDOWS.txt',
      [
        'CODEXPAGES — Pacote Portable para Windows (64-bit)',
        '==================================================',
        '',
        'Como executar:',
        '1. Extraia todos os arquivos deste ZIP para uma pasta (ex: C:\\CODEXPAGES).',
        '2. Certifique-se de ter o Node.js 20+ instalado (https://nodejs.org).',
        '3. De um duplo clique em "Iniciar-CODEXPAGES.bat".',
        '4. O painel abrira automaticamente em http://localhost:3000 com banco SQLite local.',
      ].join('\r\n')
    );

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="CODEXPAGES-Portable-Win64.zip"');
    res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar pacote Windows.';
    res.status(500).json({ error: msg });
  }
});

// ======================== VITE / STATIC FRONTEND ========================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const assetsDir = path.resolve(process.cwd(), 'src/assets');
    if (fs.existsSync(assetsDir)) {
      app.use('/src/assets', express.static(assetsDir));
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CODEXPAGES running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

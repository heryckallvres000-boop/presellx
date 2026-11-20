import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  ConversionToolsConfig,
  CookiePresellConfig,
  DomainRecord,
  FolderRecord,
  LeadRecord,
  PageBlock,
  PageLanguage,
  PageRecord,
  PageScriptsConfig,
  PageStatus,
  PageTheme,
  PageType,
} from '../types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'flowforge.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEFAULT_THEME: PageTheme = {
  backgroundColor: '#121316',
  surfaceColor: '#1C1E24',
  textColor: '#F4F4F6',
  mutedColor: '#9CA3AF',
  accentGradientStart: '#FF6B00',
  accentGradientEnd: '#E61919',
  fontFamily: 'Plus Jakarta Sans',
  maxWidth: 'md',
  paddingY: 32,
  blockGap: 16,
};

export const DEFAULT_COOKIE_CONFIG: CookiePresellConfig = {
  targetPreviewUrl: 'https://ofertaprodutor.com.br',
  backgroundMode: 'preview_card',
  customImageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
  blurIntensity: 10,
  modalPosition: 'center',
  modalTheme: 'dark',
  headline: 'Preferências de Cookies e Privacidade',
  description:
    'Utilizamos cookies essenciais para garantir a melhor experiência de navegação e personalizar ofertas relevantes. Ao continuar, você concorda com nossa Política de Privacidade.',
  acceptButtonText: 'Aceitar e Continuar',
  rejectButtonText: 'Gerenciar Preferências',
  accentColor: '#FF6B00',
  redirectOnClose: true,
  previewBrandName: 'AEON Smart Wellness',
  previewHeadline: 'Tecnologia de Monitoramento Contínuo para Sua Rotina Diária',
};

export const DEFAULT_SCRIPTS: PageScriptsConfig = {
  headHtml: '',
  bodyStartHtml: '',
  bodyEndHtml: '',
  metaPixelId: '',
  ga4Id: '',
  gtmId: '',
  tiktokPixelId: '',
};

export const DEFAULT_CONVERSION_TOOLS: ConversionToolsConfig = {
  backRedirectEnabled: false,
  backRedirectUrl: '',
  delayEnabled: false,
  delaySeconds: 15,
  delaySelector: '.delay-cta',
  legalFooterEnabled: true,
  companyName: 'CODEXPAGES Digital Ltda',
  contactEmail: 'contato@seudominio.com',
  utmPassthroughEnabled: true,
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#FF6B00',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      hostname TEXT NOT NULL UNIQUE,
      cname_target TEXT NOT NULL,
      ssl_status TEXT NOT NULL DEFAULT 'pending',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      domain_id TEXT REFERENCES domains(id) ON DELETE SET NULL,
      page_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      language TEXT NOT NULL DEFAULT 'PT',
      source_url TEXT NOT NULL DEFAULT '',
      affiliate_url TEXT NOT NULL DEFAULT '',
      html_content TEXT NOT NULL DEFAULT '',
      blocks_json TEXT NOT NULL DEFAULT '[]',
      theme_json TEXT NOT NULL DEFAULT '{}',
      cookie_config_json TEXT NOT NULL DEFAULT '{}',
      scripts_json TEXT NOT NULL DEFAULT '{}',
      conversion_tools_json TEXT NOT NULL DEFAULT '{}',
      views_count INTEGER NOT NULL DEFAULT 0,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      leads_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      utm_source TEXT NOT NULL DEFAULT '',
      utm_medium TEXT NOT NULL DEFAULT '',
      utm_campaign TEXT NOT NULL DEFAULT '',
      utm_content TEXT NOT NULL DEFAULT '',
      utm_term TEXT NOT NULL DEFAULT '',
      gclid TEXT NOT NULL DEFAULT '',
      fbclid TEXT NOT NULL DEFAULT '',
      src TEXT NOT NULL DEFAULT '',
      sck TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      visitor_hash TEXT NOT NULL DEFAULT '',
      utm_source TEXT NOT NULL DEFAULT '',
      utm_medium TEXT NOT NULL DEFAULT '',
      utm_campaign TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      target_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  const pageCount = (db.prepare('SELECT COUNT(*) as count FROM pages').get() as { count: number }).count;
  if (pageCount === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const now = new Date().toISOString();
  const folderMain = crypto.randomUUID();
  const folderAff = crypto.randomUUID();
  const folderLeads = crypto.randomUUID();

  const insertFolder = db.prepare(
    'INSERT INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?)'
  );
  insertFolder.run(folderMain, 'Campanhas Principais', '#FF6B00', now);
  insertFolder.run(folderAff, 'Presells Google & Meta', '#F59E0B', now);
  insertFolder.run(folderLeads, 'Captura & Bio', '#10B981', now);

  const insertPage = db.prepare(`
    INSERT INTO pages (
      id, title, slug, folder_id, domain_id, page_type, status, language,
      source_url, affiliate_url, html_content, blocks_json, theme_json,
      cookie_config_json, scripts_json, conversion_tools_json,
      views_count, clicks_count, leads_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Presell de Cookies
  const presellId = crypto.randomUUID();
  insertPage.run(
    presellId,
    'Presell Cookies — AEON Wellness Loop',
    'aeon-wellness-cookies',
    folderAff,
    'presell_cookies',
    'published',
    'PT',
    'https://aeonwellness.example.com/oferta',
    'https://checkout.exemplo.com/aeon-loop?off=vip',
    '',
    '[]',
    JSON.stringify(DEFAULT_THEME),
    JSON.stringify({
      ...DEFAULT_COOKIE_CONFIG,
      previewBrandName: 'AEON Smart Loop',
      previewHeadline: 'Monitoramento Biométrico Discreto para Sono, Recuperação e Energia',
    }),
    JSON.stringify(DEFAULT_SCRIPTS),
    JSON.stringify(DEFAULT_CONVERSION_TOOLS),
    0,
    0,
    0,
    now,
    now
  );

  // 2. Página de Oferta / Apresentação de Produto
  const offerId = crypto.randomUUID();
  const offerBlocks: PageBlock[] = [
    {
      id: crypto.randomUUID(),
      type: 'hero',
      data: {
        eyebrow: 'Edição Limitada 2026',
        title: 'Domine sua Rotina com Precisão Biométrica em Tempo Real',
        subtitle:
          'Conheça o AEON Smart Loop: leve, sem distrações de tela e projetado para transformar seus dados de sono e recuperação em decisões práticas.',
        buttonText: 'Garantir Minha Unidade com Desconto',
        buttonUrl: 'https://checkout.exemplo.com/aeon-loop',
        align: 'center',
        isCheckoutLink: true,
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'image',
      data: {
        imageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
        imageAlt: 'AEON Smart Wellness Loop em pedra grafite',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'text',
      data: {
        title: 'Por que atletas e executivos escolhem o AEON Loop?',
        content:
          'Diferente de relógios pesados que interrompem seu foco com notificações constantes, o AEON opera silenciosamente por até 14 dias com sensores clínicos de variabilidade cardíaca, temperatura basal e ciclos profundos de sono.',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'cta',
      data: {
        title: 'Pronto para elevar sua performance diária?',
        subtitle: 'Frete expresso gratuito e garantia incondicional de 30 dias.',
        buttonText: 'Ir para o Checkout Seguro',
        buttonUrl: 'https://checkout.exemplo.com/aeon-loop',
        isCheckoutLink: true,
      },
    },
  ];
  insertPage.run(
    offerId,
    'Página de Oferta — AEON Smart Loop',
    'aeon-smart-loop',
    folderMain,
    'offer',
    'published',
    'PT',
    '',
    'https://checkout.exemplo.com/aeon-loop',
    '',
    JSON.stringify(offerBlocks),
    JSON.stringify(DEFAULT_THEME),
    JSON.stringify(DEFAULT_COOKIE_CONFIG),
    JSON.stringify(DEFAULT_SCRIPTS),
    JSON.stringify(DEFAULT_CONVERSION_TOOLS),
    0,
    0,
    0,
    now,
    now
  );

  // 3. Link na Bio
  const bioId = crypto.randomUUID();
  const bioBlocks: PageBlock[] = [
    {
      id: crypto.randomUUID(),
      type: 'image',
      data: {
        imageUrl: '/src/assets/images/template_creator_avatar_1795140759110.jpg',
        imageAlt: 'Camila Duarte — Estrategista de Performance',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'hero',
      data: {
        eyebrow: 'Estrategista de Tráfego & CRO',
        title: 'Camila Duarte',
        subtitle: 'Funis de alta conversão, páginas rápidas e escala previsível em Meta & Google Ads.',
        align: 'center',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'link_list',
      data: {
        links: [
          {
            id: crypto.randomUUID(),
            label: 'Playbook Gratuito: Estrutura de Presells Anti-Bloqueio',
            sublabel: 'Download imediato em PDF',
            url: '/p/playbook-presells',
            highlight: true,
          },
          {
            id: crypto.randomUUID(),
            label: 'Consultoria Individual de Otimização (CRO)',
            sublabel: 'Agenda aberta para Novembro',
            url: 'https://checkout.exemplo.com/consultoria',
            highlight: false,
          },
          {
            id: crypto.randomUUID(),
            label: 'Atendimento Direto no WhatsApp',
            sublabel: 'Tire dúvidas sobre sua operação',
            url: 'https://wa.me/5511999999999',
            highlight: false,
          },
        ],
      },
    },
  ];
  insertPage.run(
    bioId,
    'Link na Bio — Camila Duarte',
    'camila-duarte-bio',
    folderLeads,
    'bio',
    'published',
    'PT',
    '',
    'https://checkout.exemplo.com/consultoria',
    '',
    JSON.stringify(bioBlocks),
    JSON.stringify({ ...DEFAULT_THEME, maxWidth: 'sm' }),
    JSON.stringify(DEFAULT_COOKIE_CONFIG),
    JSON.stringify(DEFAULT_SCRIPTS),
    JSON.stringify(DEFAULT_CONVERSION_TOOLS),
    0,
    0,
    0,
    now,
    now
  );

  // 4. Página de Captura de Leads
  const leadPageId = crypto.randomUUID();
  const leadBlocks: PageBlock[] = [
    {
      id: crypto.randomUUID(),
      type: 'hero',
      data: {
        eyebrow: 'Material Técnico Gratuito',
        title: 'O Guia Definitivo de Presells e Rastreamento Avançado',
        subtitle:
          'Aprenda a estruturar páginas de pré-venda em conformidade com as políticas do Google e Meta Ads mantendo cada UTM e clique atribuído.',
        align: 'center',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'image',
      data: {
        imageUrl: '/src/assets/images/template_lead_ebook_1795140759066.jpg',
        imageAlt: 'Strategy Playbook capa dura',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'lead_form',
      data: {
        title: 'Receba o Playbook no seu E-mail',
        subtitle: 'Preencha abaixo para liberar o acesso imediato sem custo.',
        submitText: 'Baixar Playbook Agora',
        successMessage: 'Cadastro confirmado! Enviamos o link do material para o seu e-mail.',
        collectPhone: true,
      },
    },
  ];
  insertPage.run(
    leadPageId,
    'Captura — Playbook de Presells',
    'playbook-presells',
    folderLeads,
    'lead_capture',
    'published',
    'PT',
    '',
    '',
    '',
    JSON.stringify(leadBlocks),
    JSON.stringify(DEFAULT_THEME),
    JSON.stringify(DEFAULT_COOKIE_CONFIG),
    JSON.stringify(DEFAULT_SCRIPTS),
    JSON.stringify(DEFAULT_CONVERSION_TOOLS),
    0,
    0,
    0,
    now,
    now
  );
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function safeParseArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function hydratePage(row: Record<string, unknown>): PageRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    folder_id: row.folder_id ? String(row.folder_id) : null,
    domain_id: row.domain_id ? String(row.domain_id) : null,
    page_type: String(row.page_type) as PageType,
    status: String(row.status) as PageStatus,
    language: String(row.language) as PageLanguage,
    source_url: String(row.source_url ?? ''),
    affiliate_url: String(row.affiliate_url ?? ''),
    html_content: String(row.html_content ?? ''),
    blocks: safeParseArray<PageBlock>(row.blocks_json as string, []),
    theme: safeParseJson<PageTheme>(row.theme_json as string, DEFAULT_THEME),
    cookie_config: safeParseJson<CookiePresellConfig>(
      row.cookie_config_json as string,
      DEFAULT_COOKIE_CONFIG
    ),
    scripts: safeParseJson<PageScriptsConfig>(row.scripts_json as string, DEFAULT_SCRIPTS),
    conversion_tools: safeParseJson<ConversionToolsConfig>(
      row.conversion_tools_json as string,
      DEFAULT_CONVERSION_TOOLS
    ),
    views_count: Number(row.views_count ?? 0),
    clicks_count: Number(row.clicks_count ?? 0),
    leads_count: Number(row.leads_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function listPages(): PageRecord[] {
  const rows = db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all() as Record<
    string,
    unknown
  >[];
  return rows.map(hydratePage);
}

export function getPageById(id: string): PageRecord | null {
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? hydratePage(row) : null;
}

export function getPageBySlug(slug: string): PageRecord | null {
  const row = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug) as
    | Record<string, unknown>
    | undefined;
  return row ? hydratePage(row) : null;
}

export function listFolders(): FolderRecord[] {
  return db.prepare('SELECT * FROM folders ORDER BY created_at ASC').all() as FolderRecord[];
}

export function listDomains(): DomainRecord[] {
  const rows = db.prepare('SELECT * FROM domains ORDER BY created_at DESC').all() as Array<
    Record<string, unknown>
  >;
  return rows.map((r) => ({
    id: String(r.id),
    hostname: String(r.hostname),
    cname_target: String(r.cname_target),
    ssl_status: String(r.ssl_status) as 'active' | 'pending',
    verified: Boolean(r.verified),
    created_at: String(r.created_at),
  }));
}

export function listLeads(): LeadRecord[] {
  return db
    .prepare(
      `SELECT leads.*, pages.title as page_title
       FROM leads
       LEFT JOIN pages ON leads.page_id = pages.id
       ORDER BY leads.created_at DESC`
    )
    .all() as LeadRecord[];
}

export function ensureUniqueSlug(desired: string, excludeId?: string): string {
  const base =
    desired
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `pagina-${Date.now()}`;

  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = excludeId
      ? (db.prepare('SELECT id FROM pages WHERE slug = ? AND id != ?').get(candidate, excludeId) as
          | { id: string }
          | undefined)
      : (db.prepare('SELECT id FROM pages WHERE slug = ?').get(candidate) as
          | { id: string }
          | undefined);
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

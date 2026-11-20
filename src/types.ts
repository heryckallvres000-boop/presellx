export type PageType =
  | 'presell_cookies'
  | 'cloned'
  | 'blocks'
  | 'bio'
  | 'lead_capture'
  | 'offer';

export type PageLanguage = 'PT' | 'EN' | 'ES' | 'FR';
export type PageStatus = 'published' | 'draft';

export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'video'
  | 'cta'
  | 'lead_form'
  | 'countdown'
  | 'link_list'
  | 'divider';

export interface LinkListItem {
  id: string;
  label: string;
  sublabel?: string;
  url: string;
  highlight?: boolean;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  data: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    content?: string;
    imageUrl?: string;
    imageAlt?: string;
    videoUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
    align?: 'left' | 'center';
    submitText?: string;
    successMessage?: string;
    collectPhone?: boolean;
    links?: LinkListItem[];
    isCheckoutLink?: boolean;
    countdownMinutes?: number;
    countdownLabel?: string;
    countdownExpiredText?: string;
  };
}

export interface PageTheme {
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentGradientStart: string;
  accentGradientEnd: string;
  fontFamily: 'Plus Jakarta Sans' | 'Outfit' | 'DM Sans' | 'Playfair Display';
  maxWidth: 'sm' | 'md' | 'lg';
  paddingY?: number;
  blockGap?: number;
}

export interface CookiePresellConfig {
  targetPreviewUrl: string;
  backgroundMode: 'preview_card' | 'gradient_blur' | 'custom_image';
  customImageUrl: string;
  blurIntensity: number;
  modalPosition: 'center' | 'bottom' | 'top';
  modalTheme: 'dark' | 'light';
  headline: string;
  description: string;
  acceptButtonText: string;
  rejectButtonText: string;
  accentColor: string;
  redirectOnClose: boolean;
  previewBrandName: string;
  previewHeadline: string;
}

export interface PageScriptsConfig {
  headHtml: string;
  bodyStartHtml: string;
  bodyEndHtml: string;
  metaPixelId: string;
  ga4Id: string;
  gtmId: string;
  tiktokPixelId: string;
}

export interface ConversionToolsConfig {
  backRedirectEnabled: boolean;
  backRedirectUrl: string;
  delayEnabled: boolean;
  delaySeconds: number;
  delaySelector: string;
  legalFooterEnabled: boolean;
  companyName: string;
  contactEmail: string;
  utmPassthroughEnabled: boolean;
}

export interface PageRecord {
  id: string;
  title: string;
  slug: string;
  folder_id: string | null;
  domain_id: string | null;
  page_type: PageType;
  status: PageStatus;
  language: PageLanguage;
  source_url: string;
  affiliate_url: string;
  html_content: string;
  blocks: PageBlock[];
  theme: PageTheme;
  cookie_config: CookiePresellConfig;
  scripts: PageScriptsConfig;
  conversion_tools: ConversionToolsConfig;
  views_count: number;
  clicks_count: number;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

export interface FolderRecord {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DomainRecord {
  id: string;
  hostname: string;
  cname_target: string;
  ssl_status: 'active' | 'pending';
  verified: boolean;
  created_at: string;
}

export interface LeadRecord {
  id: string;
  page_id: string;
  page_title?: string;
  name: string;
  email: string;
  phone: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  gclid: string;
  fbclid: string;
  src: string;
  sck: string;
  created_at: string;
}

export interface AnalyticsOverview {
  totalViews: number;
  uniqueViews: number;
  totalClicks: number;
  totalLeads: number;
  ctr: number;
  conversionRate: number;
  sources: Array<{
    source: string;
    views: number;
    clicks: number;
    leads: number;
  }>;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    page_type: PageType;
    views: number;
    uniqueViews: number;
    clicks: number;
    leads: number;
    ctr: number;
  }>;
  recentEvents: Array<{
    id: string;
    page_id: string;
    page_title: string;
    event_type: string;
    utm_source: string;
    utm_campaign: string;
    target_url: string;
    created_at: string;
  }>;
}

export interface ParsedLinkAsset {
  index: number;
  text: string;
  href: string;
  isCheckoutCandidate: boolean;
}

export interface ParsedImageAsset {
  index: number;
  alt: string;
  src: string;
}

export interface CopyVariation {
  angle: string;
  headline: string;
  subheadline: string;
  cta: string;
}

export interface ComplianceFlag {
  phrase: string;
  platform: 'Meta Ads' | 'Google Ads' | 'Ambos';
  risk: 'high' | 'medium';
  reason: string;
  safeAlternative: string;
}

export interface ComplianceAuditResult {
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
  flags: ComplianceFlag[];
}

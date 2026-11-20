import type {
  CookiePresellConfig,
  PageBlock,
  PageLanguage,
  PageTheme,
  PageType,
} from '../types.ts';

export interface TemplatePreset {
  key: string;
  name: string;
  subtitle: string;
  page_type: PageType;
  defaultTitle: string;
  defaultSlug: string;
  previewImage: string;
  affiliate_url: string;
  blocks: PageBlock[];
  theme: Partial<PageTheme>;
  cookie_config?: Partial<CookiePresellConfig>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: 'presell_cookies',
    name: 'Presell com Popup de Cookies',
    subtitle:
      'Estrutura em conformidade com Google Ads e Meta Ads. Exibe fundo desfocado da oferta e redireciona com repasse integral de UTMs ao aceitar ou fechar.',
    page_type: 'presell_cookies',
    defaultTitle: 'Presell Cookies — Nova Campanha',
    defaultSlug: 'presell-cookies-oferta',
    previewImage: '/src/assets/images/template_product_hero_1795140758369.jpg',
    affiliate_url: 'https://checkout.exemplo.com/sua-oferta',
    blocks: [],
    theme: {
      backgroundColor: '#121316',
      surfaceColor: '#1C1E24',
      textColor: '#F4F4F6',
      mutedColor: '#9CA3AF',
      accentGradientStart: '#FF6B00',
      accentGradientEnd: '#E61919',
      fontFamily: 'Plus Jakarta Sans',
      maxWidth: 'md',
    },
    cookie_config: {
      targetPreviewUrl: 'https://paginaoficial.com.br',
      backgroundMode: 'preview_card',
      customImageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
      blurIntensity: 10,
      modalPosition: 'center',
      modalTheme: 'dark',
      headline: 'Preferências de Cookies e Privacidade',
      description:
        'Utilizamos cookies essenciais para garantir a melhor experiência de navegação e personalizar ofertas relevantes. Ao continuar, você concorda com nossa Política de Privacidade.',
      acceptButtonText: 'Aceitar e Continuar',
      rejectButtonText: 'Configurar Preferências',
      accentColor: '#FF6B00',
      redirectOnClose: true,
      previewBrandName: 'Portal Oficial da Oferta',
      previewHeadline: 'Apresentação Exclusiva e Condições Especiais Disponíveis Hoje',
    },
  },
  {
    key: 'bio',
    name: 'Link na Bio de Alta Conversão',
    subtitle:
      'Centralizador otimizado para Instagram, TikTok e YouTube com destaque de oferta principal, WhatsApp, links externos e vídeo integrado.',
    page_type: 'bio',
    defaultTitle: 'Link na Bio — Criador / Marca',
    defaultSlug: 'link-na-bio',
    previewImage: '/src/assets/images/template_creator_avatar_1795140759110.jpg',
    affiliate_url: 'https://checkout.exemplo.com/oferta-principal',
    theme: {
      backgroundColor: '#121316',
      surfaceColor: '#1C1E24',
      textColor: '#F4F4F6',
      mutedColor: '#9CA3AF',
      accentGradientStart: '#FF6B00',
      accentGradientEnd: '#E61919',
      fontFamily: 'Plus Jakarta Sans',
      maxWidth: 'sm',
    },
    blocks: [
      {
        id: uid(),
        type: 'image',
        data: {
          imageUrl: '/src/assets/images/template_creator_avatar_1795140759110.jpg',
          imageAlt: 'Foto de perfil',
        },
      },
      {
        id: uid(),
        type: 'hero',
        data: {
          eyebrow: 'Performance & Estratégia Digital',
          title: 'Seu Nome ou Marca',
          subtitle: 'Acesse nossos treinamentos, ferramentas recomendadas e canal de atendimento.',
          align: 'center',
        },
      },
      {
        id: uid(),
        type: 'link_list',
        data: {
          links: [
            {
              id: uid(),
              label: 'Acessar Oferta Principal com Desconto',
              sublabel: 'Vagas e condições promocionais',
              url: 'https://checkout.exemplo.com/oferta-principal',
              highlight: true,
            },
            {
              id: uid(),
              label: 'Falar com Especialista no WhatsApp',
              sublabel: 'Atendimento rápido em horário comercial',
              url: 'https://wa.me/5511999999999',
              highlight: false,
            },
            {
              id: uid(),
              label: 'Baixar Material Gratuito em PDF',
              sublabel: 'Guia prático passo a passo',
              url: 'https://exemplo.com/material',
              highlight: false,
            },
          ],
        },
      },
    ],
  },
  {
    key: 'lead_capture',
    name: 'Página de Captura de Leads',
    subtitle:
      'Página focada em conversão de e-mail e WhatsApp com formulário nativo conectado ao banco de leads e rastreamento automático de UTMs.',
    page_type: 'lead_capture',
    defaultTitle: 'Captura de Leads — Playbook',
    defaultSlug: 'captura-playbook',
    previewImage: '/src/assets/images/template_lead_ebook_1795140759066.jpg',
    affiliate_url: '',
    theme: {
      backgroundColor: '#121316',
      surfaceColor: '#1C1E24',
      textColor: '#F4F4F6',
      mutedColor: '#9CA3AF',
      accentGradientStart: '#FF6B00',
      accentGradientEnd: '#E61919',
      fontFamily: 'Plus Jakarta Sans',
      maxWidth: 'md',
    },
    blocks: [
      {
        id: uid(),
        type: 'hero',
        data: {
          eyebrow: 'Acesso Gratuito por Tempo Limitado',
          title: 'Receba o Playbook Completo de Escala e Otimização CRO',
          subtitle:
            'Estruture funis mais rápidos, reduza o custo por lead e acompanhe cada origem de clique sem depender de ferramentas externas.',
          align: 'center',
        },
      },
      {
        id: uid(),
        type: 'image',
        data: {
          imageUrl: '/src/assets/images/template_lead_ebook_1795140759066.jpg',
          imageAlt: 'Playbook estratégico',
        },
      },
      {
        id: uid(),
        type: 'lead_form',
        data: {
          title: 'Libere Seu Acesso Agora',
          subtitle: 'Informe seus dados abaixo para receber o link direto.',
          submitText: 'Quero Receber o Material',
          successMessage: 'Tudo certo! Seu acesso foi confirmado e registrado.',
          collectPhone: true,
        },
      },
    ],
  },
  {
    key: 'offer',
    name: 'Página de Oferta / Produto',
    subtitle:
      'Estrutura editorial direta para apresentação de produto físico ou infoproduto com headline persuasiva, prova visual, copy limpa e CTA de checkout.',
    page_type: 'offer',
    defaultTitle: 'Página de Oferta — Produto',
    defaultSlug: 'oferta-produto',
    previewImage: '/src/assets/images/template_product_hero_1795140758369.jpg',
    affiliate_url: 'https://checkout.exemplo.com/produto',
    theme: {
      backgroundColor: '#121316',
      surfaceColor: '#1C1E24',
      textColor: '#F4F4F6',
      mutedColor: '#9CA3AF',
      accentGradientStart: '#FF6B00',
      accentGradientEnd: '#E61919',
      fontFamily: 'Plus Jakarta Sans',
      maxWidth: 'md',
    },
    blocks: [
      {
        id: uid(),
        type: 'hero',
        data: {
          eyebrow: 'Nova Edição 2026',
          title: 'Resultados Consistentes com Tecnologia de Precisão no Dia a Dia',
          subtitle:
            'Design minimalista, operação intuitiva e garantia incondicional para você testar sem riscos.',
          buttonText: 'Garantir Minha Oferta Agora',
          buttonUrl: 'https://checkout.exemplo.com/produto',
          align: 'center',
          isCheckoutLink: true,
        },
      },
      {
        id: uid(),
        type: 'image',
        data: {
          imageUrl: '/src/assets/images/template_product_hero_1795140758369.jpg',
          imageAlt: 'Produto em destaque',
        },
      },
      {
        id: uid(),
        type: 'text',
        data: {
          title: 'O que torna esta solução diferente?',
          content:
            'Desenvolvida para eliminar complexidade desnecessária, nossa metodologia combina simplicidade de uso com acompanhamento claro de progresso desde a primeira semana.',
        },
      },
      {
        id: uid(),
        type: 'cta',
        data: {
          title: 'Condição Especial de Lançamento',
          subtitle: 'Envio imediato, suporte dedicado e garantia de satisfação de 30 dias.',
          buttonText: 'Ir para o Checkout Seguro',
          buttonUrl: 'https://checkout.exemplo.com/produto',
          isCheckoutLink: true,
        },
      },
    ],
  },
];

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  presell_cookies: 'Presell Cookies',
  cloned: 'Clonada',
  blocks: 'Blocos',
  bio: 'Link na Bio',
  lead_capture: 'Captura',
  offer: 'Oferta',
};

export const LANGUAGE_LABELS: Record<PageLanguage, string> = {
  PT: 'Português (PT)',
  EN: 'English (EN)',
  ES: 'Español (ES)',
  FR: 'Français (FR)',
};

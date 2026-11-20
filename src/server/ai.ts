import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { ComplianceAuditResult, CopyVariation, PageLanguage } from '../types.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada no ambiente do servidor. Configure a chave no painel Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const LANGUAGE_NAMES: Record<PageLanguage, string> = {
  PT: 'Português (Brasil)',
  EN: 'English (US)',
  ES: 'Español (Neutro/Latam)',
  FR: 'Français',
};

export async function generateCopyVariations(params: {
  headline: string;
  subheadline: string;
  cta: string;
  productContext: string;
  language: PageLanguage;
}): Promise<CopyVariation[]> {
  const ai = getAiClient();
  const langLabel = LANGUAGE_NAMES[params.language] || 'Português (Brasil)';

  const prompt = `Você é um especialista sênior em CRO (Conversion Rate Optimization) e copywriting para tráfego pago (Meta Ads e Google Ads).
Idioma de saída obrigatório: ${langLabel}.
Contexto do produto/oferta: ${params.productContext || 'Oferta digital / página de pré-venda'}
Copy atual:
- Headline: ${params.headline}
- Subheadline: ${params.subheadline}
- CTA: ${params.cta}

Gere exatamente 5 variações de alta conversão para teste A/B com ângulos distintos (ex: Clareza de Benefício, Curiosidade Segura, Prova e Mecanismo, Economia de Tempo/Esforço, Urgência Ética). Evite promessas médicas absolutas ou garantias financeiras proibidas pelo Meta/Google Ads.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            angle: { type: Type.STRING, description: 'Nome curto do ângulo de persuasão' },
            headline: { type: Type.STRING, description: 'Headline principal otimizada' },
            subheadline: { type: Type.STRING, description: 'Subheadline complementar' },
            cta: { type: Type.STRING, description: 'Texto curto de botão CTA (2-5 palavras)' },
          },
          required: ['angle', 'headline', 'subheadline', 'cta'],
        },
      },
    },
  });

  const text = (response.text ?? '[]').trim();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? (parsed as CopyVariation[]) : [];
}

export async function auditCompliance(params: {
  pageText: string;
  language: PageLanguage;
}): Promise<ComplianceAuditResult> {
  const ai = getAiClient();
  const langLabel = LANGUAGE_NAMES[params.language] || 'Português (Brasil)';
  const truncated = params.pageText.slice(0, 12000);

  const prompt = `Você é um auditor sênior de políticas de anúncios (Compliance) do Meta Ads e Google Ads.
Analise o texto da página abaixo e identifique trechos, promessas agressivas, atributos pessoais ("você sofre de...", "você está acima do peso"), alegações de saúde não comprovadas, promessas de renda garantida, prazos irreais ou gatilhos que costumam gerar reprovação de anúncios ou bloqueio de conta.
Responda no idioma: ${langLabel}.

Texto da página:
"""
${truncated}
"""`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallRisk: {
            type: Type.STRING,
            description: 'Nível geral de risco: low, medium ou high',
          },
          summary: {
            type: Type.STRING,
            description: 'Diagnóstico direto e objetivo em 2 frases',
          },
          flags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING, description: 'Trecho exato encontrado no texto' },
                platform: { type: Type.STRING, description: 'Meta Ads, Google Ads ou Ambos' },
                risk: { type: Type.STRING, description: 'high ou medium' },
                reason: { type: Type.STRING, description: 'Motivo da política violada' },
                safeAlternative: {
                  type: Type.STRING,
                  description: 'Reescrita segura mantendo poder de conversão',
                },
              },
              required: ['phrase', 'platform', 'risk', 'reason', 'safeAlternative'],
            },
          },
        },
        required: ['overallRisk', 'summary', 'flags'],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text) as ComplianceAuditResult;
  return {
    overallRisk:
      parsed.overallRisk === 'high' || parsed.overallRisk === 'medium' ? parsed.overallRisk : 'low',
    summary: parsed.summary || 'Análise de compliance concluída.',
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
  };
}

export async function translateTextBatch(
  texts: string[],
  targetLanguage: PageLanguage
): Promise<string[]> {
  if (texts.length === 0) return [];
  const ai = getAiClient();
  const langLabel = LANGUAGE_NAMES[targetLanguage];

  const chunkSize = 60;
  const results: string[] = [];

  for (let i = 0; i < texts.length; i += chunkSize) {
    const batch = texts.slice(i, i + chunkSize);
    const prompt = `Traduza e adapte culturalmente cada item do array JSON abaixo para ${langLabel}, mantendo o tom persuasivo de marketing/CRO, números, moedas locais apenas se apropriado ou preservando o sentido exato, e retornando EXATAMENTE um array JSON com o mesmo número de elementos (${batch.length}) na mesma ordem. Não omita nem junte itens.

Entrada:
${JSON.stringify(batch)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '[]').trim());
    if (Array.isArray(parsed) && parsed.length === batch.length) {
      results.push(...parsed.map((item) => String(item)));
    } else {
      // Fallback preserving original batch if length mismatch
      results.push(...batch.map((orig, idx) => (Array.isArray(parsed) && parsed[idx] ? String(parsed[idx]) : orig)));
    }
  }

  return results;
}

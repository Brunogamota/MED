import type { Defense, DefenseNarrative, Evidence, Med } from '@/domain/types';
import { buildAllowedCorpus, guardNarrative } from '@/domain/llm/guard';
import { getConfig } from '@/lib/env';

/**
 * Optional LLM rewrite of a defense narrative.
 *
 * Contract enforced here:
 *   Raw data -> Normalised data -> Evidence Engine -> Claims -> Defense JSON
 *   -> LLM -> guarded, human-readable defense
 *
 * The model receives the Defense JSON only. It cannot reach the database, it
 * cannot add facts, and any output containing a fact absent from that JSON is
 * discarded in favour of the deterministic text. No API key configured means no
 * call at all — the product stays fully functional without one.
 */

const SYSTEM_PROMPT = [
  'Voce reescreve textos de defesa de MED (Mecanismo Especial de Devolucao) em portugues do Brasil.',
  'Voce recebe um JSON com afirmacoes ja validadas e as evidencias que as sustentam.',
  'Regras absolutas:',
  '1. Nunca acrescente qualquer fato, data, valor, codigo, nome ou documento que nao esteja no JSON.',
  '2. Nunca suponha, estime ou complete informacoes ausentes.',
  '3. Nao mencione evidencias faltantes como se existissem.',
  '4. Mantenha tom formal, objetivo e impessoal.',
  '5. Responda apenas com o texto final, sem comentarios.',
].join('\n');

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
}

export interface RenderNarrativeWithLlmInput {
  med: Med;
  defense: Defense;
  evidences: Evidence[];
  fallback: DefenseNarrative;
}

export async function renderNarrativeWithLlm(
  input: RenderNarrativeWithLlmInput,
): Promise<DefenseNarrative> {
  const config = getConfig();
  if (!config.llm.apiKey) {
    return {
      ...input.fallback,
      guardRejections: ['LLM nao configurado (ANTHROPIC_API_KEY ausente)'],
    };
  }

  const payload = {
    med: {
      medId: input.med.medId,
      amount: input.med.amount,
      currency: input.med.currency,
      reason: input.med.reason,
      requestingInstitution: input.med.requestingInstitution,
    },
    summary: input.defense.summary,
    claims: input.defense.claims.map((claim) => ({
      statement: claim.statement,
      category: claim.category,
      strength: claim.strength,
    })),
    deterministicText: input.fallback.body,
  };

  let candidate: string;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.llm.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.llm.model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Reescreva a defesa abaixo mantendo exatamente os mesmos fatos.\n\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        ...input.fallback,
        guardRejections: [`Falha na chamada ao LLM (HTTP ${response.status})`],
      };
    }

    const body = (await response.json()) as AnthropicResponse;
    candidate = (body.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('\n')
      .trim();
  } catch {
    // Network or parsing failure: the deterministic text is always a valid
    // defense, so a failed rewrite is never an error for the caller.
    return { ...input.fallback, guardRejections: ['Falha de comunicacao com o LLM'] };
  }

  if (!candidate) {
    return { ...input.fallback, guardRejections: ['LLM retornou texto vazio'] };
  }

  const corpus = buildAllowedCorpus({
    med: input.med,
    defense: input.defense,
    evidences: input.evidences,
  });
  const guard = guardNarrative(candidate, corpus);

  if (!guard.ok) {
    return {
      ...input.fallback,
      guardRejections: guard.violations.map((violation) => violation.message),
    };
  }

  return {
    renderer: 'LLM_GUARDED',
    language: 'pt-BR',
    body: candidate,
  };
}

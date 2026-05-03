/**
 * agentd/src/state/estadoAtualReader.ts
 * 
 * Parser do estado_atual.md → struct tipada validada com zod.
 * Fonte canônica: CSA/3_Engenharia_e_Arquitetura/schema_estado_atual.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

/** Schema zod do estado_atual.md parseado */
export const EstadoAtualSchema = z.object({
  verdadeAtual: z.array(z.string()).max(5),
  restricoesAtivas: z.array(z.string()).max(5),
  filaAtiva: z.object({
    plano: z.string().optional(),
    proximaEtapa: z.string().optional(),
  }),
  proximoPasso: z.string(),
});

export type EstadoAtual = z.infer<typeof EstadoAtualSchema>;

/**
 * Extrai bullets de uma seção markdown.
 * Procura linhas que começam com "- " após o header.
 */
function extractBullets(content: string, headerPattern: string): string[] {
  const lines = content.split('\n');
  let inSection = false;
  const bullets: string[] = [];

  for (const line of lines) {
    if (line.includes(headerPattern)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      break; // próxima seção
    }
    if (inSection && line.startsWith('- ')) {
      bullets.push(line.slice(2).trim());
    }
  }

  return bullets;
}

/**
 * Extrai o valor de um bullet específico por prefixo.
 */
function extractBulletValue(bullets: string[], prefix: string): string | undefined {
  const bullet = bullets.find(b => b.startsWith(prefix));
  if (!bullet) return undefined;
  return bullet.slice(prefix.length).trim().replace(/^`|`$/g, '');
}

/**
 * Lê e parseia estado_atual.md.
 * Retorna a struct validada ou null se o arquivo não existir/for inválido.
 */
export function readEstadoAtual(filePath?: string): EstadoAtual | null {
  const path = filePath ?? config.paths.estadoAtual;

  if (!existsSync(path)) {
    logger.warn({ path }, 'estado_atual.md não encontrado');
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');

    const verdadeAtual = extractBullets(content, '🟢 Verdade Atual');
    const restricoesAtivas = extractBullets(content, '🔴 Restrições Ativas');
    const filaBullets = extractBullets(content, '📋 Fila Ativa');
    const proximoPassoBullets = extractBullets(content, '⏭️ Próximo Passo Lógico');

    // Extrair campos estruturados da fila ativa
    const plano = extractBulletValue(filaBullets, 'Plano:');
    const proximaEtapa = extractBulletValue(filaBullets, 'Próxima etapa:');

    const raw = {
      verdadeAtual,
      restricoesAtivas,
      filaAtiva: {
        plano: plano ?? '',
        proximaEtapa: proximaEtapa ?? '',
      },
      proximoPasso: proximoPassoBullets[0] ?? '',
    };

    const result = EstadoAtualSchema.parse(raw);
    logger.debug({ verdades: result.verdadeAtual.length, restricoes: result.restricoesAtivas.length }, 'estado_atual.md parseado');
    return result;
  } catch (err) {
    logger.error({ err, path }, 'Falha ao parsear estado_atual.md');
    return null;
  }
}

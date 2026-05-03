/**
 * tests/reader.test.ts — Testa o parser do estado_atual.md
 */

import { describe, it, expect } from 'vitest';
import { readEstadoAtual } from '../src/state/estadoAtualReader.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

function setupFixture(name: string, content: string): string {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  const path = join(FIXTURES_DIR, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('readEstadoAtual', () => {

  it('parseia estado_atual.md canônico corretamente', () => {
    const path = setupFixture('valid.md', `## 🟢 Verdade Atual
- Backend consolidado.
- Vórtex funcional.

## 🔴 Restrições Ativas
- Bloqueio 401.
- Estratégia data-driven.

## 📋 Fila Ativa
- Plano: \`CSA/4_Execucao_e_Historico/Planos_de_Execucao/PLANO_v2.md\`
- Próxima etapa: Fase 2.5

## ⏭️ Próximo Passo Lógico
- Iniciar esqueleto do agentd.
`);

    const result = readEstadoAtual(path);
    expect(result).not.toBeNull();
    expect(result!.verdadeAtual).toHaveLength(2);
    expect(result!.restricoesAtivas).toHaveLength(2);
    expect(result!.filaAtiva.plano).toContain('PLANO_v2.md');
    expect(result!.filaAtiva.proximaEtapa).toBe('Fase 2.5');
    expect(result!.proximoPasso).toBe('Iniciar esqueleto do agentd.');
  });

  it('retorna null para arquivo inexistente', () => {
    const result = readEstadoAtual('/caminho/que/nao/existe.md');
    expect(result).toBeNull();
  });

  it('parseia arquivo mínimo (seções vazias)', () => {
    const path = setupFixture('minimal.md', `## 🟢 Verdade Atual

## 🔴 Restrições Ativas

## 📋 Fila Ativa

## ⏭️ Próximo Passo Lógico
`);

    const result = readEstadoAtual(path);
    expect(result).not.toBeNull();
    expect(result!.verdadeAtual).toHaveLength(0);
    expect(result!.restricoesAtivas).toHaveLength(0);
    expect(result!.proximoPasso).toBe('');
  });
});

# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO ADS / MARKETING

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e ao Documento Normativo do Núcleo de Marketing

**Autoridade:** Operacional, Estratégica e Financeira (por delegação)

---

## 1. Natureza do Documento

Este documento traduz o **Documento Normativo do Núcleo de Marketing** em **regras técnicas executáveis**, fluxos operacionais claros e critérios objetivos de decisão.

Ele existe para garantir que o marketing:
- gere **resultado real**
- opere dentro de **limites éticos e clínicos**
- seja **executável por um psicólogo solo**
- não dependa de utopias, hype ou vigilância constante

---

## 2. Princípio Técnico Central

> **Marketing só executa quando há razão clínica e financeira legítima.**

Toda ação de Ads é:
- deliberada
- justificável
- reversível

Nada é contínuo por padrão.

---

## 3. Entidades Técnicas Principais

### 3.1 Campaign

```ts
export interface Campaign {
  id: string;
  status: 'inactive' | 'active' | 'paused';
  channel: 'google' | 'meta' | 'local';
  objective: 'visibility' | 'contact' | 'scheduling';
}
```

### 3.2 FinancialContext

```ts
export interface FinancialContext {
  minimumIncome: number;
  desiredIncome: number;
  currentIncome: number;
  clinicalLoad: 'low' | 'adequate' | 'high';
}
```

---

## 4. Estados Operacionais do Núcleo Ads

Estados possíveis:

- `OBSERVATION` — sem anúncios ativos
- `MINIMAL` — presença básica
- `CONDITIONAL` — anúncios com limite
- `STABLE` — previsibilidade alcançada
- `GROWTH` — expansão controlada
- `EXCEPTION` — regras relaxadas temporariamente

Nenhum estado é automático.

---

## 5. Regras de Transição de Estado

Transições exigem:
- decisão humana explícita
- justificativa textual
- validação de contexto financeiro

Exemplos:

- `OBSERVATION → MINIMAL`:
  - renda < mínima
  - carga clínica adequada

- `STABLE → GROWTH`:
  - renda ≥ desejável
  - retenção adequada
  - saúde do clínico preservada

---

## 6. Execução de Campanhas

### 6.1 Condições Obrigatórias

Uma campanha só pode ser ativada se:
- estado permitir
- orçamento definido
- objetivo explícito
- possibilidade de pausa imediata

### 6.2 Execução

- nenhuma campanha roda sem revisão periódica
- nenhuma campanha roda indefinidamente

---

## 7. Métricas Permitidas

Métricas válidas:
- contatos reais
- agendamentos efetivos
- comparecimento inicial
- custo por contato

Métricas inválidas:
- impressões isoladas
- cliques sem conversão
- métricas de vaidade

---

## 8. IA no Núcleo Ads

A IA pode:
- comparar copies
- sugerir segmentações
- resumir desempenho

A IA **não pode**:
- ativar campanhas
- ajustar orçamento automaticamente
- cruzar dados clínicos

---

## 9. Modo Exceção

O Modo Exceção:
- exige justificativa
- é temporário
- tem data de revisão

Serve para:
- crise financeira
- queda abrupta de demanda
- eventos pessoais relevantes

---

## 10. Proibições Técnicas Absolutas

O Núcleo Ads **não pode**:
- rodar campanhas sem limite
- otimizar por volume
- mascarar ganho ilusório
- pressionar clínica

---

## 11. Critério de Conclusão do Núcleo Ads

O Núcleo Ads é considerado **corretamente implementado** quando:
- nenhuma campanha é automática
- toda decisão é rastreável
- marketing pode ser pausado sem impacto sistêmico

---

**Documento Técnico — Núcleo Ads / Marketing**

Subordinado ao Documento Mestre Absoluto.
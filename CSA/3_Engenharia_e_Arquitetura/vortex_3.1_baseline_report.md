# 🌀 Architectural Report: Vórtex Studio v3.1 (Baseline Stable)
**Documento de Especificação Técnica e Gestão de Ciclo de Vida**

---

## 1. Introdução
Este relatório define a base estável (baseline) para a implementação do Vórtex Studio 3.1. O foco migrou da mera estabilidade para a **Previsibilidade de Engenharia** e **Modularidade Iterativa**.

## 2. Status do Ciclo de Vida
*   **Estado Atual:** `v3.1-stable-baseline`
*   **Revisão:** v5
*   **Próxima Revisão Prevista:** Pós-Fase de Validação (III.b).

---

## 3. O Trans-Mapper: Registro de Hidratação
Para garantir que o Mapper não falhe em inferências mágicas, o sistema utilizará um **Dicionário de Hidratação (SSOT)**:

| Elemento (Preview/Naked) | Import Real (Production/Hydrated) | Package |
| :--- | :--- | :--- |
| `motion.*` | `import { motion } from 'framer-motion'` | `framer-motion` |
| `Image` | `import Image from 'next/image'` | `next` |
| `Link` | `import Link from 'next/link'` | `next` |
| `Lucide.[IconName]` | Extração de AST/Regex gerando `import { [IconName] } from 'lucide-react'` *[Ver nota sobre Fallback de Destructuring]* | `lucide-react` |
| `useRouter` | `import { useRouter } from 'next/navigation'` | `next` |

**Nota sobre Fallback de Destructuring (Lucide):** Se a Regex falhar ao identificar componentes devido à desestruturação (`const { Camera } = window.Lucide`), o sistema deverá engatilhar um Warning visual ou no console (`console.warn`) durante a Fase de Validação. A prevenção real se dá pela **regra de prompt** abaixo.

---

## 4. SandBox: Pinagem de Dependências Globais
O `preview-shell.html` deve carregar versões exatas para evitar "Layout Drift":
*   **Tailwind CSS:** v3.4.1
*   **React:** v18.2.0 (via ESM.sh)
*   **Framer Motion:** v11.0.3 (via ESM.sh)
*   **Lucide React:** v0.344.0 (via ESM.sh)

---

## 5. Engineering Safeguards (Blindagem)

### I. Error Boundaries (Resiliência UX)
Interceptação de erros de renderização com fallback para logs de depuração e UI de recuperação.

### II. Hard Context Reset (Operational)
Mecanismo de **System Prompt Override**. O risco real é o conflito de instruções, não o histórico. O novo prompt incluirá um cabeçalho claro `# VÓRTEX ENGINE v3.1` e diretrizes estritas que anulam explicitamente qualquer regra legada (ex: proibir importações explicitamente). Isso resolve o vetor de conflito de sistema diretamente na injeção de prompt.

---

## 6. Roadmap Atualizado (Com Validação)

| Fase | Ação | Critério de Aceite |
| :--- | :--- | :--- |
| **I. Purge** | Limpeza de `auditSemantic` e logs legados. | Zero chamadas redundantes no DevTools. |
| **II. Foundation** | Setup do `preview-shell.html` com libs pinadas. | Renderização de ícones e animações sem erros MIME. |
| **III. Logic** | Desenvolvimento do Mapper via Dicionário de Hidratação. | Hidratação de JSX para TSX válida. |
| **III.b Validation** | Teste de estresse com 3 componentes padrão. | **Build estável em ambiente Next.js real.** |
| **IV. Launch** | Ativação do Prompt Baseline v3.1. | Output da IA seguindo 100% o contrato "Naked". |

---

## 7. Protocolo de Prompt (Baseline v3.1)
> **"# VÓRTEX ENGINE v3.1-STABLE ACTIVE"**
> **Contract:**
> 1. Output: `export default function` apenas.
> 2. Imports: PROIBIDOS. Use escopo global (`window.Lucide`, `window.motion`).
> 3. Destructuring Bloqueado: NUNCA realize desestruturação (ex: `const { Camera } = window.Lucide`). Use **sempre** a notação direta de objeto: `<window.Lucide.IconName />`.
> 3. Zero explanations. Pure code blocks only.
> 4. Aesthetics: Premium Tailwind focus.

---
**Autor:** Antigravity (CSA Agent)
**Data:** 16/04/2026
**SSOT:** c:\Users\artes\Documents\NeuroStrategy OS - VM\Núcleo de Marketing\CSA\3_Engenharia_e_Arquitetura\vortex_3.1_baseline_report.md

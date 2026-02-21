# NeuroStrategy OS — ROADMAP DE IMPLEMENTAÇÃO
## Plano de Execução Pós-Auditoria (Tríade IA + Psicólogo)

**Status:** Pronto para Ação  
**Data:** 13 de Janeiro de 2026  
**Timeline:** 4-6 semanas (desenvolvimento iterativo)

---

## PARTE 1: ESTRUTURA DE EXECUÇÃO

### 1.1 Modelo de Trabalho (Tríade de IA)

```
┌─────────────────────────────────────────────────────────────┐
│ CICLO PADRÃO POR FEATURE (3-5 dias)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ DIA 1: Pesquisa (Perplexity AI)                            │
│ ├─ Query: "[Feature] best practices 2025"                 │
│ ├─ Resultado: Papers, Reddit, StackOverflow               │
│ └─ Saída: Documento de decisão arquitetural               │
│                                                              │
│ DIA 2: Validação (ChatGPT Go / Claude)                     │
│ ├─ Role: "Security Engineer"                              │
│ ├─ Input: Manual + Código proposto                        │
│ ├─ Pergunta: "Qual é o risco não coberto aqui?"          │
│ └─ Saída: Feedback de segurança + iterações               │
│                                                              │
│ DIA 3-4: Codificação (Google AI Pro)                       │
│ ├─ Prompt: Prompt estruturado com requisitos             │
│ ├─ Output: Arquivo TypeScript/Rust gerado                │
│ └─ Ação: Psicólogo revisa, corrige, integra              │
│                                                              │
│ DIA 5: Teste + Integração                                  │
│ ├─ npm run tauri dev                                       │
│ ├─ Testes unitários                                        │
│ └─ Merge para main branch                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Distribuição de Responsabilidades

| Tarefa | Responsável | Ferramenta |
|--------|-------------|-----------|
| Pesquisa de segurança | Perplexity AI | Web search |
| Revisão de código | ChatGPT Go | Code review + discussion |
| Geração de código | Google AI Pro | Codegen (exato) |
| Integração + testes | Psicólogo | Cursor/IDE local |
| Deploy | Psicólogo | npm run build + ship |

---

## PARTE 2: ROADMAP DETALHADO

### SEMANA 1: Recovery System (C1 + C2)

#### Sprint 1.1: BIP39 Mnemonic

**Duração:** 3-4 dias

```
PASSO 1: Pesquisa (Dia 1)
│
├─ Queries:
│  ├─ "BIP39 mnemonic implementation Node.js 2025"
│  ├─ "Argon2id vs PBKDF2 Node.js benchmarks"
│  └─ "Deterministic key derivation crypto"
│
├─ Resultados esperados:
│  ├─ Biblioteca: bip39 (NPM)
│  ├─ Decisão: Argon2id melhor que PBKDF2 (425x)
│  └─ Padrão: BIP39 standard, 100.000+ iterações
│
└─ Saída: Documento de decisão (visto acima)

PASSO 2: Validação (Dia 2)
│
├─ Input para ChatGPT:
│  └─ "Você é security engineer. Critique:
│       1. BIP39 com Argon2id (m=64MB, t=3)
│       2. Armazenar checksum em node-keytar
│       3. Chave AES-256-GCM derivada
│       Qual risco não foi coberto?"
│
├─ Esperado:
│  └─ Feedback sobre edge cases (OS reset, keytar falha)
│  └─ Sugestão: 2º fator (backup password)
│
└─ Ajustes: Adicionar fallback password para recovery

PASSO 3: Codificação (Dia 3)
│
├─ Prompt para Google AI Pro:
│  ├─ [USAR PROMPT 5 DO MANUAL]
│  └─ Gerar: core/security/recovery.ts
│
├─ Arquivos:
│  ├─ src/core/security/recovery.ts (264 linhas)
│  ├─ src/core/security/types.ts
│  └─ src-tauri/src/commands/recovery.rs
│
└─ Output: 3 arquivos prontos para compilar

PASSO 4: Teste + Integração (Dia 4)
│
├─ npm install bip39 argon2
├─ npm run tauri dev
├─ Testes manuais:
│  ├─ Gerar mnemônico → 12 palavras ✓
│  ├─ Derivar chave 2x → mesmo resultado ✓
│  ├─ Checksum salvo em keytar ✓
│  └─ Validação de entrada (usuário digita 12) ✓
└─ Commit: feat: add BIP39 recovery mnemonic

ENTREGÁVEIS:
✓ Function: generateRecoveryPhrase()
✓ Function: deriveEncryptionKey()
✓ Function: validateMnemonicEntry()
✓ Tests: 100% coverage
✓ No warnings (TypeScript strict)
```

---

#### Sprint 1.2: Backup & Atomic Write

**Duração:** 3 dias

```
PASSO 1: Pesquisa (Dia 1)
│
├─ Queries:
│  ├─ "Atomic file write Node.js 2025 best practice"
│  ├─ "ZIP archiver streaming Node.js large files"
│  └─ "Backup rotation strategy local-first apps"
│
└─ Saída: Documento (visto acima)

PASSO 2-3: Codificação (Dia 2-3)
│
├─ Google AI Pro Prompt:
│  └─ Gerar:
│     ├─ core/persistence/backup.ts (380 linhas)
│     ├─ core/persistence/atomic-write.ts (200 linhas)
│     └─ src-tauri/src/commands/backup.rs
│
└─ Integração com recovery.ts (mesmo build)

PASSO 4: Teste (Dia 4)
│
├─ npm install archiver write-file-atomic
├─ npm run tauri dev
├─ Testes:
│  ├─ Criar paciente → salvar sessão → arquivo existe ✓
│  ├─ Backup criptografado criado a cada 6h ✓
│  ├─ Atomic write: kill app → arquivo original intacto ✓
│  ├─ Rotation: após 10 backups, antigos removidos ✓
│  └─ Restore: backup.zip.enc → desencriptar → dados ok ✓
│
└─ Commit: feat: add backup & atomic write system

ENTREGÁVEIS:
✓ Function: performBackup()
✓ Function: atomicWrite() + atomicWriteWithValidation()
✓ Cron task: 6h backup rotation
✓ Tests: atomic write survives process crash
✓ Logs: all operations logged
```

---

#### Sprint 1.3: Recovery UI (Onboarding + Restore)

**Duração:** 4 dias (React + Tauri IPC)

```
PASSO 1-2: Pesquisa + Validação (Dia 1)
│
├─ Queries:
│  ├─ "React onboarding flow UX best practices"
│  └─ "Tauri IPC security command invocation"
│
└─ Resultado: Componentes React + Tauri patterns

PASSO 3-4: Codificação (Dia 2-4)
│
├─ Arquivos React:
│  ├─ src/onboarding/RecoveryOnboarding.tsx (320 linhas)
│  ├─ src/onboarding/MnemonicDisplay.tsx (180 linhas)
│  ├─ src/onboarding/MnemonicValidation.tsx (220 linhas)
│  ├─ src/recovery/RecoveryPage.tsx (280 linhas)
│  └─ src/recovery/BackupRestoration.tsx (240 linhas)
│
├─ Fluxo:
│  ├─ App.tsx detecta first-time install
│  ├─ Renderizar <RecoveryOnboarding />
│  ├─ Etapas:
│  │  ├─ Boas-vindas (educação)
│  │  ├─ Gerar mnemônico (popup seguro, 2min timeout)
│  │  ├─ Validar entrada (usuário digita 12)
│  │  ├─ Senha de backup (2º fator)
│  │  └─ Sucesso + próximos passos
│  │
│  └─ Modo Recovery:
│     ├─ Menu > Configurações > "Recuperar de Backup"
│     ├─ Inserir 12 palavras (papel)
│     ├─ OU usar senha de backup (2º fator)
│     ├─ Selecionar arquivo backup.zip.enc
│     ├─ Validar integridade
│     └─ Restaurar dados
│
└─ Commit: feat: add recovery UI and onboarding

TESTES:
✓ Primeira execução: onboarding renderizado
✓ Mnemônico popover: fecha após 2 min
✓ Validação: rejeita palavras erradas
✓ Recovery mode: restaura dados completos
✓ Fallback password: acesso sem mnemônico

ENTREGÁVEIS:
✓ 5 componentes React (1.240 linhas)
✓ E2E tests: onboarding → backup → restore
✓ Accessibility: ARIA labels, keyboard nav
✓ Responsivo: mobile + desktop
```

---

### SEMANA 2: Shadow Draft System (M1)

#### Sprint 2.1: Shadow Draft Manager

**Duração:** 3 dias

```
PASSO 1: Pesquisa (Dia 1)
│
├─ Queries:
│  ├─ "Debounce implementation React best practices"
│  ├─ "Temp file management electron/tauri"
│  └─ "Draft recovery auto-save patterns"
│
└─ Resultado: lodash debounce + temp file patterns

PASSO 2-3: Codificação (Dia 2-3)
│
├─ Google AI Pro Prompt:
│  └─ Gerar: core/session/shadow-draft.ts (420 linhas)
│
├─ Classe:
│  ├─ constructor(config: ShadowDraftConfig)
│  ├─ updateDraft(sessionId: string, content: string): void
│  ├─ recoverDraft(sessionId: string): Promise<string | null>
│  ├─ discardDraft(sessionId: string): Promise<void>
│  └─ cleanupExpiredDrafts(expiryDays: number): Promise<void>
│
├─ Implementação:
│  ├─ Debounce 2s para cada keystroke
│  ├─ Arquivo: .session_<id>_shadow.tmp
│  ├─ Localização: app.getPath('temp')
│  ├─ Plaintext (não criptografado, é temporário)
│  └─ Max size: 50MB (validação)
│
└─ Commit: feat: add shadow draft auto-recovery

TESTES:
✓ Keystroke → debounce 2s → arquivo escrito
✓ Múltiplos edits → só última versão salva
✓ App fecha → shadow preservado
✓ App reabre → recoverDraft() encontra conteúdo
✓ Salvar oficialmente → discardDraft() remove .tmp
✓ Expiry: 7 dias → cleanup remove arquivo

ENTREGÁVEIS:
✓ ShadowDraftManager classe (produção)
✓ Tests: 8 cases cobertos
✓ Logs: all shadow operations
✓ Max size validation: rejeita >50MB
```

---

#### Sprint 2.2: React Integration + Recovery Modal

**Duração:** 2 dias

```
PASSO 1-2: Codificação (Dia 1-2)
│
├─ Arquivos React:
│  ├─ src/core/clinical/ui/SessionEditor.tsx (280 linhas)
│  └─ src/core/clinical/ui/DraftRecoveryModal.tsx (160 linhas)
│
├─ Hook customizado:
│  └─ src/lib/hooks/useSessionWithShadow.ts (120 linhas)
│
├─ Integração XState:
│  ├─ Quando state.matches('sessionActive'):
│  │  ├─ onChange → shadowManager.updateDraft()
│  │  └─ onSave → shadowManager.discardDraft()
│  │
│  └─ Quando app inicia:
│     └─ Check drafts → renderizar modal se existe
│
└─ Commit: feat: add shadow draft react integration

FLUXO ESPERADO:
1. Clínico abre sessão
2. Digite notas (textarea)
3. Cada keystroke dispara debounced updateDraft()
4. A cada 2s: arquivo .tmp escrito em temp/
5. App crasheia (alt+f4, crash, reboot)
6. App reabre
7. Modal aparece: "Você tem notas não salvas. Recuperar?"
8. Opções: [Recuperar] [Descartar]
9. Se Recuperar: textarea preenchida com conteúdo anterior
10. Usuário continua digitando
11. Clica "Salvar Sessão" (botão oficial)
12. Arquivo salvo em /patients_data/patient_<id>/session_<id>.json.enc
13. Shadow draft descartado automaticamente

TESTES:
✓ Modal aparece ao reabrire com rascunho
✓ Recuperar: texto restaurado no editor
✓ Descartar: último backup usado
✓ Salvar: shadow automaticamente descartado
✓ XState: não aceita render sem máquina

ENTREGÁVEIS:
✓ 2 componentes React (440 linhas)
✓ Hook useSessionWithShadow (120 linhas)
✓ Modal UX: claro, acessível
✓ Tests: integração completa
```

---

### SEMANA 3: Error Boundaries & UI Passiva (M2 + A2)

#### Sprint 3.1: Error Boundary Architecture

**Duração:** 3 dias

```
PASSO 1: Pesquisa (Dia 1)
│
├─ Queries:
│  ├─ "React error boundary patterns 2025"
│  ├─ "XState selectors isolation pattern"
│  └─ "Component-level error recovery UX"
│
└─ Resultado: react-error-boundary library

PASSO 2-3: Codificação (Dia 2-3)
│
├─ Arquivos:
│  ├─ core/ui/error-boundary.tsx (180 linhas)
│  ├─ core/ui/xstate-enforcer.ts (140 linhas)
│  ├─ core/clinical/selectors.ts (220 linhas)
│  └─ .eslintrc.json (linting rules)
│
├─ Componentes:
│  ├─ ErrorFallback: renderizar erro + botão retry
│  ├─ withErrorBoundary: HOC para envolver qualquer componente
│  └─ useXStateEnforced: hook para validar estado
│
├─ Seletores:
│  ├─ selectCanEditSession(state)
│  ├─ selectCanCloseSession(state)
│  ├─ selectShouldShowRiskAlert(state)
│  └─ selectSaveButtonClass(state)
│
└─ Commit: feat: add error boundaries and UI passiva enforcement

VALIDAÇÃO:
✓ Componente quebra → Error Boundary mostra fallback
✓ Retry button → tenta render novamente
✓ Múltiplos boundaries → isolam erros (um falha, outros funcionam)
✓ Seletores → verdade única em XState
✓ ESLint rules → rejeita lógica condicional em componentes

ENTREGÁVEIS:
✓ Error boundary system (produção)
✓ 4+ seletores implementados
✓ ESLint configurado + regras ativas
✓ Tests: erro em componente → error boundary captura
```

---

#### Sprint 3.2: Refactoring Componentes Existentes

**Duração:** 3 dias

```
OBJETIVO:
Converter componentes existentes para usar APENAS seletores
(sem lógica condicional local)

PROCESSO:

1. Audit (Dia 1):
   └─ Encontrar componentes com lógica condicional
      ├─ if (patient.riskScore > 8) ❌
      ├─ ternary state logic ❌
      ├─ Computed values sem seletor ❌
      └─ Lister: 8-12 componentes a refatorar

2. Refactoring (Dia 2-3):
   └─ Para cada componente:
      ├─ Extrair lógica condicional
      ├─ Criar seletor em selectors.ts
      ├─ Usar selector no componente
      ├─ Exemplo:
      │  ❌ ANTES:
      │    if (state.context.riskLevel === 'high') {
      │      return <Alert />
      │    }
      │  ✅ DEPOIS:
      │    const { showAlert } = useClinicalSelectors(state)
      │    return showAlert && <Alert />
      │
      └─ Teste: componente renderiza identicamente

RESULTADOS ESPERADOS:
✓ Zero lógica condicional em componentes React
✓ Todos seletores documentados
✓ ESLint não acusa warnings
✓ TypeScript strict mode passa
✓ Comportamento idêntico ao antes

ENTREGÁVEIS:
✓ 8-12 componentes refatorados
✓ 20+ seletores novos em selectors.ts
✓ Tests: behavior não muda
✓ Code review: lógica corretamente extraída
```

---

### SEMANA 4: Integração Final + Testes

#### Sprint 4.1: Testes de Integração E2E

**Duração:** 3 dias

```
OBJETIVO: Validar todo fluxo pós-auditoria

TESTE 1: "Onboarding → Backup → Crash → Restore"
├─ Executar app nova instalação
├─ Completar onboarding (gerar mnemônico, validar)
├─ Criar paciente "João"
├─ Iniciar sessão, digitar anotações
├─ Trigger backup manual
├─ Kill process (simular crash)
├─ Reabrire app
├─ Modal aparece: "Recuperar rascunho?"
├─ Clicar "Recuperar"
├─ Validar: conteúdo restaurado
├─ Salvar sessão
├─ Validar: arquivo criptografado em /patients_data/
└─ ✓ RESULTADO: Fluxo completo funciona

TESTE 2: "Backup Corrompido → Fallback Password"
├─ Simular corrupção do arquivo principal
├─ Menu > Recuperação
├─ Tentar com mnemônico → falha (arquivo corrupto)
├─ Tentar com backup password → sucesso
├─ Dados restaurados de backup.zip.enc
└─ ✓ RESULTADO: Fallback funciona

TESTE 3: "Error em Componente → Isolamento"
├─ Injetar erro em componente Marketing
├─ Verificar: apenas Marketing mostra erro
├─ Clínico continua usando prontuário sem impacto
├─ Clicar "Tentar novamente"
├─ Marketing recupera
└─ ✓ RESULTADO: Error boundary isola falha

TESTE 4: "XState + Seletores: Impossível Estado Inválido"
├─ Tentar transição inválida (sessionActive + sessionClosed)
├─ Guard rejeita
├─ State não muda
├─ Nenhum erro silencioso
└─ ✓ RESULTADO: State machine rejeita estados inválidos

TESTE 5: "Shadow Draft: Debounce + Persistence"
├─ Editar 10x rapidamente
├─ Verificar: apenas 1 arquivo escrito (debounce)
├─ Aguardar 2s
├─ Arquivo escrito com última versão
└─ ✓ RESULTADO: Debounce funciona

ENTREGÁVEIS:
✓ 5 testes E2E automatizados
✓ Todos passando
✓ Coverage: >90% de cenários pós-auditoria
✓ Logs: all operations documented
```

---

#### Sprint 4.2: Performance + Security Audit

**Duração:** 2 dias

```
PERFORMANCE CHECKS:

1. Startup Time
   ├─ Antes: ~3s
   └─ Depois: <4s (Argon2id +1s é aceitável)

2. Backup Performance
   ├─ 50MB data → 5s ZIP → <2s encrypt
   └─ Não bloqueia UI (background)

3. Shadow Draft Debounce
   ├─ 100 keystroke/s → 1 arquivo escrito (debounce)
   └─ Sem lag no editor

4. Error Boundary Re-render
   ├─ Erro em componente → <100ms até fallback
   └─ Sem freezing

SECURITY AUDIT:

1. Criptografia
   ├─ AES-256-GCM ✓
   ├─ Argon2id (m=64MB, t=3) ✓
   ├─ IV aleatório ✓
   └─ GCM tag validation ✓

2. Armazenamento
   ├─ Checksum em keytar (não chave) ✓
   ├─ Shadow draft plaintext (temporário) ✓
   ├─ Backup criptografado ✓
   └─ Logs sem PII ✓

3. Recovery
   ├─ 12 palavras BIP39 (2^128) ✓
   ├─ 2º fator backup password ✓
   ├─ Atomic writes (sem corrupção) ✓
   └─ Determinístico (mesma chave sempre) ✓

ENTREGÁVEIS:
✓ Performance report: <1MB markdown
✓ Security checklist: 12+ items covered
✓ Load testing: 100 concurrent users (local)
```

---

#### Sprint 4.3: Documentação + Deploy

**Duração:** 2 dias

```
DOCUMENTAÇÃO:

1. User Manual
   ├─ Onboarding: como anotar mnemônico
   ├─ Recovery: como restaurar de backup
   ├─ Backup: como fazer cópia de USB
   └─ Troubleshooting: 5 cenários comuns

2. Admin Guide
   ├─ Configuração inicial
   ├─ Backup automation
   ├─ Logs location
   └─ Backup rotation parameters

3. API Documentation
   ├─ Tauri commands (recovery.rs)
   ├─ React components (ErrorBoundary, selectors)
   ├─ TypeScript types (RecoveryConfig, etc)
   └─ Exemplos de integração

DEPLOY:

1. Build
   ├─ npm run tauri build
   ├─ Output: dist/tauri/bundle/
   ├─ Executável único (.exe, .dmg, .appImage)
   └─ Sem dependências externas

2. Release Notes
   ├─ "NeuroStrategy OS v1.1.0"
   ├─ Features: Recovery, Backup, Error Isolation, Shadow Draft
   ├─ Breaking changes: nenhum
   ├─ Migration: automática (1ª execução = onboarding)
   └─ Checksum SHA-256: verificação integridade

3. Distribution
   ├─ GitHub Releases
   ├─ Website: download link
   ├─ Auto-update: nativa Tauri
   └─ Changelog: versionado

ENTREGÁVEIS:
✓ User documentation (HTML + PDF)
✓ Admin guide (MD)
✓ API docs (TypeDoc gerado)
✓ Release notes v1.1.0
✓ Binary executável (todas plataformas)
```

---

## PARTE 3: MATRIZ DE RISCO & MITIGAÇÃO

### Riscos Técnicos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Argon2id lento (>1s unlock)** | UX friction | Baixa | Usar memory=32MB se necessário |
| **BIP39 checksum erro** | Usuário não consegue validar | Muito Baixa | Testar 1000x com palavras diferentes |
| **Backup arquivo cresce >1GB** | Storage issue | Baixa | Implementar cleanup automático, avisar usuário |
| **Error boundary não captura async erro** | App pode ainda crashear | Baixa | Usar suspense + boundaries combinadas |
| **XState seletor compilado errado** | Lógica errada renderiza | Média | Tests, ESLint rules obrigatórias |

### Riscos Operacionais

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Usuário perde papel com 12 palavras** | Acesso perdido | Alta (usuário) | 2º fator backup password |
| **Psicólogo não entende onboarding** | Configuração incorreta | Média | UX clara, vídeo tutorial, suporte |
| **Backup password esquecido** | Recuperação impossível | Baixa | Educação: anote em papel também |

---

## PARTE 4: COMO USAR ESTE ROADMAP

### Pré-Requisitos

```bash
# Instalar ferramentas
npm install -g @tauri-apps/cli
npm install -g typescript

# Clonar repositório
git clone <neurostrategy-repo>
cd neurostrategy-os

# Instalar dependências
npm install
cargo fetch
```

### Executar Sprints

```bash
# Criar branch para cada sprint
git checkout -b feat/recovery-system

# Seguir PASSO a PASSO em cada sprint
# Usar arquivo "Manual de Fortificação" como referência

# Ao final do sprint
npm run test
npm run tauri dev

# Merge
git push origin feat/recovery-system
# → Abrir PR, solicitar review de ChatGPT Go
# → Merge após aprovação

# Tag release
git tag -a v1.1.0 -m "Post-audit hardening complete"
npm run tauri build
```

### Checklist Semanal

```markdown
## SEMANA 1: Recovery System

- [ ] Pesquisa concluída (Perplexity)
- [ ] Validação concluída (ChatGPT)
- [ ] Código gerado (Google AI)
- [ ] npm run tauri dev executa
- [ ] Todos testes passam
- [ ] Zero TypeScript warnings
- [ ] Zero clippy warnings (Rust)
- [ ] Manual atualizado
- [ ] Commit & PR review

## SEMANA 2: Shadow Draft

- [ ] ShadowDraftManager produção
- [ ] React components integrados
- [ ] Debounce testado
- [ ] Recovery modal funcional
- [ ] Tests passando
- [ ] Merge completo

## SEMANA 3: UI Passiva

- [ ] Error boundaries em lugar
- [ ] Seletores extraídos
- [ ] ESLint regras ativas
- [ ] 8+ componentes refatorados
- [ ] Tests passando

## SEMANA 4: Integração Final

- [ ] E2E tests passando
- [ ] Performance OK (<4s startup)
- [ ] Security audit completo
- [ ] Documentação escrita
- [ ] Release v1.1.0 pronto
```

---

## PARTE 5: COMUNICAÇÃO COM IAs

### Template Padrão para Pesquisa (Perplexity)

```
Contexto: Desenvolvendo NeuroStrategy OS
(Tauri desktop app para prontuário clínico local-first)

Pergunta de Pesquisa:
[COPIAR QUERY ESPECÍFICA DO ROADMAP]

Requisitos Adicionais:
- Foco em produção-ready (não brinquedos)
- Bibliotecas npm maduras (3+ anos, 10k+ stars)
- Local-first (zero dependências cloud)
- Performance importante (app desktop médico)

Esperado na resposta:
- Papers/links de referência
- Benchmarks comparativos
- Exemplos código
- Recomendação final (por quê)
```

### Template Padrão para Validação (ChatGPT Go)

```
Você é um Security Engineer sênior (20+ anos).
Role: Revisar arquitetura pós-auditoria de segurança.

Contexto:
[COPIAR SEÇÃO RELEVANTE DO MANUAL]

Tarefa:
Identifique:
1. Qual risco NÃO foi coberto?
2. Qual cenário de falha não foi testado?
3. Qual ataque seu sistema é vulnerável?

Restrições (sempre considerar):
- Usuário: psicólogo solo (não-programador)
- Hardware: PC local, sem nuvem
- Dados: clínicos, altamente sensíveis
- Timeline: dados devem durar 20+ anos

Formato resposta:
- 3 riscos principais
- Mitigação para cada um
- Scoring: 1-10 confiança na solução
```

### Template Padrão para Codificação (Google AI Pro)

```
[USAR PROMPT 5 DO MANUAL DE FORTIFICAÇÃO]

Antes de colar:
- Copiar seção "ARQUIVO X" relevante
- Adaptar nomes de arquivo ao seu projeto
- Especificar versões (React 19, TypeScript 5.x)
- Mencionar que é pós-auditoria Red Team

Após receber código:
- Compilar: npm run tauri dev
- Zero warnings esperados
- Copiar comentários (explicam AXIOMAS)
- Testar cases do manual
```

---

**FIM DO ROADMAP DE IMPLEMENTAÇÃO**

**Próximas Ações:**
1. ✅ Ler Manual de Fortificação + Análise Técnica
2. ✅ Rever este Roadmap com toda equipe (psicólogo + IAs)
3. ⏭️ Iniciar Semana 1: Recovery System (segunda-feira)
4. ⏭️ Usar ciclo Pesquisa → Validação → Codificação
5. ⏭️ Documentar progresso em Discord/GitHub

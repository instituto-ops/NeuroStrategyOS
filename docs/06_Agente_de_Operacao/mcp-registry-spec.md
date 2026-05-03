# MCP Server Registry — NeuroStrategy Agente Operacional

> Especificação arquitetural dos 9 MCP Servers do agente.
> Cada servidor é um processo independente comunicando via stdio (local) ou SSE (remoto).
> Stack recomendada: TypeScript (routing/I/O) + Python FastMCP (cognição/ML).

---

## Princípios Globais

- **Naming**: `{domain}_{action}` (ex: `filesystem_read_file`, `git_create_commit`)
- **Annotations**: todo tool declara `readOnlyHint`, `destructiveHint`, `idempotentHint`
- **Errors**: sempre acionáveis — mensagem + próximo passo sugerido
- **Secrets**: nunca passados como parâmetros; injetados via env ou broker JIT
- **Transport**: `stdio` para servidores locais; `SSE/HTTP` para Google/Vercel/GitHub remotos

---

## 1. MCP: filesystem

**Propósito**: Operações no sistema de arquivos local com auditoria e backup automático.
**Transport**: stdio (local)
**Language**: TypeScript

### Tools

```typescript
filesystem_read_file(path: string, encoding?: string): { content: string, size: number, modified: string }
// readOnlyHint: true | Lê arquivo. Suporta .md, .ts, .tsx, .py, .json, .env (redact automático de secrets)

filesystem_write_file(path: string, content: string, backup?: boolean): { success: boolean, backup_path?: string }
// destructiveHint: true | Cria ou sobrescreve. backup=true (default) salva versão anterior em .bak

filesystem_apply_patch(path: string, old_str: string, new_str: string): { success: boolean, diff: string }
// idempotentHint: false | Equivalente ao str_replace. Falha se old_str não for encontrado exatamente uma vez.

filesystem_list_directory(path: string, recursive?: boolean, filter?: string): { entries: FileEntry[] }
// readOnlyHint: true | Lista com metadados. filter aceita glob (ex: "*.tsx")

filesystem_delete_file(path: string, require_backup?: boolean): { success: boolean, backup_path: string }
// destructiveHint: true | SEMPRE faz backup antes. Requer approval do Permission Kernel.

filesystem_search(query: string, path?: string, type?: 'content' | 'filename'): { matches: SearchMatch[] }
// readOnlyHint: true | Equivalente ao ripgrep. Retorna arquivo + linha + contexto.

filesystem_diff(path_a: string, path_b: string): { diff: string, additions: number, deletions: number }
// readOnlyHint: true | Diff unificado entre dois arquivos ou versões.
```

### Redaction Rules
Qualquer leitura de arquivo que contenha padrões de secret (`API_KEY`, `TOKEN`, `PASSWORD`, `SECRET`, `.env`) aplica mascaramento automático: `sk-ant-api03-***REDACTED***`.

---

## 2. MCP: terminal

**Propósito**: Execução de comandos no terminal Windows com captura de stdout/stderr e timeout.
**Transport**: stdio (local, processo filho)
**Language**: TypeScript

### Tools

```typescript
terminal_run(
  command: string,
  cwd?: string,
  timeout_ms?: number,    // default: 30000
  shell?: 'powershell' | 'cmd' | 'bash'
): { stdout: string, stderr: string, exit_code: number, duration_ms: number }
// destructiveHint: depends | Executa comando. Qualquer comando com rm, drop, push requer Permission Kernel.

terminal_run_script(
  script_path: string,
  args?: string[],
  cwd?: string
): { stdout: string, stderr: string, exit_code: number }
// Executa .ps1, .bat, .sh com argumentos explícitos.

terminal_get_processes(): { processes: ProcessInfo[] }
// readOnlyHint: true | Lista processos ativos relevantes (node, python, etc.)

terminal_kill_process(pid: number): { success: boolean }
// destructiveHint: true | Mata processo pelo PID. Requer approval.
```

### Blocked Commands
O servidor intercepta e recusa (nunca executa):
- `rm -rf /`, `rm -rf *` sem path explícito
- `DROP TABLE`, `DROP DATABASE` em contexto de produção
- `git push` direto (deve usar MCP git_github)
- Qualquer comando com `sudo` ou elevação de privilégio sem HITL

### Self-Healing Pattern
Quando `exit_code != 0`:
1. Retorna `{ stdout, stderr, exit_code, suggested_fix: string }`
2. `suggested_fix` é gerado pelo servidor analisando padrões comuns de erro (ModuleNotFound, ENOENT, etc.)
3. agentd decide se tenta autocorreção ou escalona para Morgue

---

## 3. MCP: git_github

**Propósito**: Operações Git locais e GitHub API com controle explícito de ações irreversíveis.
**Transport**: stdio (Git local) + SSE (GitHub API)
**Language**: TypeScript

### Tools

```typescript
// === Git Local ===
git_status(repo_path?: string): { branch: string, staged: FileStatus[], unstaged: FileStatus[], untracked: string[] }
git_diff(repo_path?: string, staged?: boolean): { diff: string, files_changed: number }
git_log(repo_path?: string, limit?: number): { commits: CommitInfo[] }
git_branch_list(repo_path?: string): { branches: BranchInfo[], current: string }
git_branch_create(name: string, from?: string, repo_path?: string): { success: boolean }
git_checkout(branch: string, repo_path?: string): { success: boolean }
git_add(paths: string[], repo_path?: string): { staged: string[] }
git_commit(message: string, repo_path?: string): { commit_hash: string, files_changed: number }
// idempotentHint: false | Gera commit. NÃO faz push. Push é ação separada bloqueada por default.

// === GitHub API (requer GITHUB_TOKEN via env) ===
github_list_issues(repo: string, state?: 'open' | 'closed', labels?: string[]): { issues: Issue[] }
github_create_issue(repo: string, title: string, body: string, labels?: string[]): { issue_number: number, url: string }
github_list_prs(repo: string, state?: 'open' | 'closed'): { prs: PullRequest[] }
github_create_pr(repo: string, title: string, body: string, head: string, base: string): { pr_number: number, url: string }
// destructiveHint: false | Cria PR (não merge). Merge requer approval explícito.

github_get_actions_status(repo: string, run_id?: number): { runs: ActionRun[] }
github_search_code(repo: string, query: string): { matches: CodeMatch[] }

// === Ações Irreversíveis (sempre bloqueadas até HITL) ===
git_push(remote?: string, branch?: string, force?: boolean): { success: boolean }
// 🔴 BLOCK: sempre requer approval do Permission Kernel
github_merge_pr(repo: string, pr_number: number, method?: 'merge' | 'squash' | 'rebase'): { success: boolean }
// 🔴 BLOCK: sempre requer approval
```

### Commit Message Style
O servidor aplica validação de formato Conventional Commits:
- `feat(scope): descrição`
- `fix(scope): descrição`
- `docs(scope): descrição`
- `chore: descrição`
Mensagens fora do padrão retornam warning com sugestão de correção.

---

## 4. MCP: vercel

**Propósito**: Deploy, preview, logs e rollback no Vercel com HITL em produção.
**Transport**: SSE / HTTP (Vercel API)
**Language**: TypeScript

### Tools

```typescript
vercel_list_deployments(project?: string, limit?: number): { deployments: Deployment[] }
// readOnlyHint: true

vercel_get_deployment(deployment_id: string): { deployment: DeploymentDetail }
// readOnlyHint: true

vercel_get_build_logs(deployment_id: string): { logs: LogEntry[] }
// readOnlyHint: true

vercel_get_runtime_logs(project: string, deployment_id?: string): { logs: LogEntry[] }
// readOnlyHint: true

vercel_create_preview(project: string, branch?: string): { preview_url: string, deployment_id: string }
// destructiveHint: false | Preview apenas. NÃO promove para produção.

vercel_promote_to_production(deployment_id: string): { success: boolean, production_url: string }
// 🔴 BLOCK: sempre requer approval. É a ação mais crítica do fluxo.

vercel_rollback(project: string, target_deployment_id: string): { success: boolean }
// 🔴 BLOCK: sempre requer approval.

vercel_env_pull(project: string, environment?: 'development' | 'preview'): { env_vars: string[] }
// readOnlyHint: true | Retorna nomes das vars (nunca valores). Valores são redactados.
```

### Visual Diff Pipeline
O servidor expõe um workflow especial:
```
vercel_visual_diff(preview_url: string, production_url: string): {
  screenshots: { preview: base64, production: base64 },
  diff_image: base64,
  issues_detected: VisualIssue[]
}
```
Usa Playwright internamente para capturar screenshots e gerar diff visual antes de qualquer promoção.

---

## 5. MCP: google

**Propósito**: Google APIs unificadas (Gemini, Drive, Sheets, Calendar, Gmail, GA4, Search Console).
**Transport**: SSE / HTTP
**Language**: TypeScript (routing) + Python (Gemini/ML)

### Tools por Sub-domínio

```typescript
// === Gemini ===
gemini_generate(prompt: string, model?: string, system?: string): { text: string, tokens_used: number }
gemini_generate_structured(prompt: string, schema: object): { data: object }

// === Drive ===
drive_list_files(query?: string, folder_id?: string): { files: DriveFile[] }
drive_read_file(file_id: string): { content: string, mime_type: string }
drive_create_file(name: string, content: string, folder_id?: string): { file_id: string, url: string }
drive_update_file(file_id: string, content: string): { success: boolean }

// === Sheets ===
sheets_read(spreadsheet_id: string, range: string): { values: any[][] }
sheets_write(spreadsheet_id: string, range: string, values: any[][]): { updated_cells: number }
// destructiveHint: true para write | Requer review.

// === Calendar ===
calendar_list_events(calendar_id?: string, time_min?: string, time_max?: string): { events: CalendarEvent[] }
calendar_create_event(title: string, start: string, end: string, description?: string): { event_id: string }

// === Gmail ===
gmail_list_messages(query?: string, max?: number): { messages: EmailSummary[] }
gmail_read_message(message_id: string): { from: string, subject: string, body: string, date: string }
gmail_create_draft(to: string, subject: string, body: string): { draft_id: string }
// NÃO existe gmail_send. Envio sempre requer HITL via interface.

// === GA4 ===
ga4_run_report(property_id: string, metrics: string[], dimensions?: string[], date_range?: DateRange): { rows: ReportRow[] }
ga4_get_realtime(property_id: string): { active_users: number, events: RealtimeEvent[] }

// === Search Console ===
search_console_get_performance(site_url: string, date_range: DateRange, dimensions?: string[]): { rows: SearchRow[] }
search_console_get_index_coverage(site_url: string): { coverage: IndexCoverage }
```

---

## 6. MCP: browser

**Propósito**: Automação de navegador via Playwright com HITL em ações escritas.
**Transport**: stdio (processo Playwright separado)
**Language**: TypeScript + Playwright

### Arquitetura
O browser MCP roda em processo filho dedicado com fila de comandos. Nunca compartilha processo com agentd. Mantém instância persistente do browser para sessões longas.

### Tools

```typescript
browser_navigate(url: string): { title: string, status_code: number }
// readOnlyHint: true

browser_screenshot(selector?: string, full_page?: boolean): { image: base64, dimensions: { w: number, h: number } }
// readOnlyHint: true | Retorna screenshot como artifact visual

browser_read_dom(selector?: string): { html: string, text: string, links: Link[] }
// readOnlyHint: true

browser_audit_links(url: string): { broken: LinkStatus[], ok: LinkStatus[], total: number }
// readOnlyHint: true | Rastreia todos os links e verifica status HTTP

browser_extract_structured(url: string, schema: object): { data: object }
// readOnlyHint: true | Usa Stagehand-like extraction para estruturar dados de páginas

// === Ações com Efeito (sempre HITL) ===
browser_click(selector: string): { success: boolean }
// 🔴 REVIEW: mostra elemento antes de clicar

browser_fill_form(fields: { selector: string, value: string }[]): { filled: number }
// 🔴 REVIEW: mostra preview dos campos antes de preencher

browser_submit(selector: string): { success: boolean, redirect_url?: string }
// 🔴 BLOCK: sempre requer approval explícito antes de submeter

browser_download(url: string, dest_path: string): { success: boolean, file_size: number }
// 🔴 REVIEW: mostra URL e destino antes de baixar

// === Visual Compare ===
browser_compare_pages(url_a: string, url_b: string): {
  screenshots: { a: base64, b: base64 },
  visual_diff: base64,
  differences: VisualDiff[]
}
```

### HITL Checkpoint Format
Para toda ação escrita, o servidor emite o checkpoint antes de executar:
```
⚠️  AÇÃO PENDENTE — Aprovação necessária

Ação:      browser_click
Elemento:  button#submit-form
Página:    https://site.com/form
Impacto:   Submissão de formulário (irreversível)
Risco:     ALTO

[ Aprovar ]  [ Cancelar ]  [ Ver Elemento ]
```

---

## 7. MCP: memory

**Propósito**: RAG vetorial local-first para memória de longo prazo, estilo, decisões e erros.
**Transport**: stdio (local, in-process)
**Language**: Python (FastMCP + SQLite-vec / LanceDB)

### Arquitetura de Memória
```
memory/
├── short_term/
│   └── estado_atual.md           # RAM operacional (schema CSA canônico)
├── long_term/
│   ├── factual.db                # SQLite-vec: código, docs, decisões, ADRs
│   ├── stylistic.db              # SQLite-vec: commits, relatórios, vocabulário
│   └── morgue.db                 # SQLite-vec: falhas indexadas como "vacinas"
└── projects/
    └── {project_id}/
        └── project.db            # Memória por projeto (isolada)
```

### Tools

```python
memory_query(
    query: str,
    domain: Literal['factual', 'stylistic', 'morgue', 'project'],
    project_id: Optional[str] = None,
    top_k: int = 5
) -> { results: MemoryResult[], context_injected: str }
# readOnlyHint: true | Busca semântica. Retorna chunks + score de relevância.

memory_index(
    content: str,
    domain: Literal['factual', 'stylistic', 'morgue', 'project'],
    metadata: dict,
    project_id: Optional[str] = None
) -> { success: bool, chunks_indexed: int }
# Indexa novo conteúdo no vector store. metadata inclui source, date, type.

memory_update_estado_atual(
    secao: Literal['verdade_atual', 'restricoes_ativas', 'fila_ativa', 'proximo_passo'],
    content: str
) -> { success: bool, previous: str }
# Atualiza seção específica do estado_atual.md. Nunca sobrescreve o arquivo inteiro.

memory_read_estado_atual() -> { estado: EstadoAtual }
# readOnlyHint: true | Lê o estado atual completo parseado.

memory_log_decision(
    decision: str,
    rationale: str,
    alternatives_rejected: list[str],
    project_id: Optional[str] = None
) -> { decision_id: str }
# Persiste decisão arquitetural em formato ADR simplificado.

memory_log_failure(
    error: str,
    context: str,
    attempted_fixes: list[str],
    root_cause: Optional[str] = None
) -> { failure_id: str }
# Escreve entrada na Morgue e indexa no morgue.db como "vacina".

memory_get_style(context: Literal['commit', 'report', 'plan', 'email']) -> { examples: str[], pattern: str }
# readOnlyHint: true | Few-shot retrieval para mimetismo de voz.
```

---

## 8. MCP: security

**Propósito**: Permission Kernel, redação de secrets, audit log e validação de conformidade.
**Transport**: stdio (local, síncronо — intercepta antes da execução)
**Language**: TypeScript (determinístico, sem LLM)

### Princípio
Este servidor é **determinístico puro**. Nunca chama LLM. Avalia regras declarativas em YAML.

### Tools

```typescript
security_check_permission(
  tool_id: string,
  action: string,
  params: object,
  user_context?: string
): {
  decision: 'allow' | 'review' | 'block' | 'forbidden',
  reason: string,
  blast_radius?: string,
  checkpoint_required: boolean
}
// Este é o gatekeeper. Chamado pelo Permission Kernel antes de TODA execução.

security_redact_secrets(content: string): { redacted: string, secrets_found: number }
// Aplica mascaramento de API keys, tokens, passwords, .env vars.

security_audit_log(
  action: string,
  tool_id: string,
  params_redacted: object,
  result: 'success' | 'failure' | 'blocked',
  user_approved: boolean
): { log_id: string, timestamp: string }
// Append-only. Nunca permite update ou delete de logs.

security_validate_content(
  content: string,
  context: Literal['medical', 'marketing', 'legal', 'general']
): {
  approved: boolean,
  warnings: ComplianceWarning[],
  blocks: ComplianceBlock[]
}
// Valida conteúdo contra regras CFP/CRP, LGPD, promessas médicas.

security_get_audit_log(
  filters?: { from?: string, to?: string, tool?: string, result?: string }
): { entries: AuditEntry[] }
// readOnlyHint: true
```

### Permission Rules (YAML declarativo)

```yaml
rules:
  - tool: "git_push"
    decision: block
    reason: "Push para remoto requer aprovação humana"
  - tool: "browser_submit"
    decision: block
    reason: "Submissão de formulário externo é irreversível"
  - tool: "filesystem_delete_file"
    decision: review
    reason: "Deleção requer confirmação e backup verificado"
  - tool: "terminal_run"
    pattern: "(rm -rf|DROP TABLE|DROP DATABASE)"
    decision: forbidden
    reason: "Comando destrutivo sem restrição de escopo"
  - tool: "vercel_promote_to_production"
    decision: block
    reason: "Promoção para produção é ação de alto impacto"
```

---

## 9. MCP: documents

**Propósito**: Leitura, extração e geração de documentos estruturados (PDF, DOCX, XLSX, CSV, RIS, BibTeX).
**Transport**: stdio (local)
**Language**: Python (FastMCP + pymupdf, python-docx, openpyxl, bibtexparser)

### Tools

```python
documents_read(
    path: str,
    format: Literal['auto', 'pdf', 'docx', 'xlsx', 'csv', 'json', 'md', 'ris', 'bib']
) -> { content: str, metadata: dict, pages?: int }
# readOnlyHint: true | Extrai texto. PDF suporta OCR fallback.

documents_extract_table(path: str, sheet?: str) -> { headers: list, rows: list[list], summary: str }
# readOnlyHint: true | Extrai tabelas de XLSX, CSV ou PDF com tabelas.

documents_extract_references(path: str) -> { references: Reference[] }
# readOnlyHint: true | Extrai referências bibliográficas de PDF, DOCX, RIS, BibTeX.

documents_create_docx(
    template?: str,
    sections: list[Section],
    output_path: str
) -> { success: bool, path: str }
# Cria DOCX formatado. Sections têm type (heading, paragraph, table, list).

documents_create_xlsx(
    sheets: list[Sheet],
    output_path: str
) -> { success: bool, path: str }

documents_annotate(
    path: str,
    annotations: list[Annotation]
) -> { success: bool, output_path: str }
# Adiciona comentários/highlights a PDF ou DOCX.

documents_convert(
    input_path: str,
    output_format: Literal['pdf', 'docx', 'md', 'txt']
) -> { success: bool, output_path: str }

# === Específico para Pesquisa Acadêmica ===
documents_parse_ris(path: str) -> { references: Reference[], count: int }
documents_parse_bibtex(path: str) -> { entries: BibEntry[], count: int }
documents_export_references(
    references: list[Reference],
    format: Literal['ris', 'bib', 'apa', 'abnt'],
    output_path: str
) -> { success: bool }
```

---

## Integração: Como os MCP Servers Se Conectam

```
agentd recebe comando
    ↓
security.check_permission()     ← gatekeeper síncrono
    ↓ allow
Tool Registry roteia para MCP correto
    ↓
MCP executa tool
    ↓
security.audit_log()            ← sempre, independente do resultado
    ↓
Resultado retorna ao agentd
    ↓
agentd atualiza Live Artifacts + resposta ao usuário
```

**Context Bloat Prevention**: agentd injeta apenas os schemas dos MCPs relevantes para a tarefa ativa. Nunca todos os 9 servidores ao mesmo tempo.

---

## Deployment Config (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "neuro-filesystem": {
      "command": "node",
      "args": ["dist/filesystem-mcp.js"],
      "env": { "WORKSPACE_ROOT": "C:/Projects/neuroengine" }
    },
    "neuro-terminal": {
      "command": "node",
      "args": ["dist/terminal-mcp.js"],
      "env": { "ALLOWED_SHELLS": "powershell,cmd" }
    },
    "neuro-git": {
      "command": "node",
      "args": ["dist/git-mcp.js"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "neuro-vercel": {
      "command": "node",
      "args": ["dist/vercel-mcp.js"],
      "env": { "VERCEL_TOKEN": "${VERCEL_TOKEN}" }
    },
    "neuro-google": {
      "command": "node",
      "args": ["dist/google-mcp.js"],
      "env": { "GOOGLE_CREDENTIALS": "${GOOGLE_CREDENTIALS}" }
    },
    "neuro-browser": {
      "command": "node",
      "args": ["dist/browser-mcp.js"],
      "env": { "PLAYWRIGHT_HEADLESS": "false" }
    },
    "neuro-memory": {
      "command": "python",
      "args": ["-m", "neuro_memory_mcp"],
      "env": { "MEMORY_PATH": "C:/Projects/.neuro-memory" }
    },
    "neuro-security": {
      "command": "node",
      "args": ["dist/security-mcp.js"],
      "env": { "RULES_PATH": "config/permission-rules.yaml" }
    },
    "neuro-documents": {
      "command": "python",
      "args": ["-m", "neuro_documents_mcp"],
      "env": {}
    }
  }
}
```

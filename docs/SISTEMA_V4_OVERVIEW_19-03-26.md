# 🌌 AntiGravity Mission Control V4: Estado Atual do Sistema (2026)

Este documento detalha a arquitetura neural e estrutural do sistema após o upgrade para a **Geração Gemini 2.5**. O sistema opera em uma estrutura de "Dois Hemisférios", separando extração de dados (Flash) de criação clínica profunda (Pro).

---

## 📂 Árvore de Arquivos e Funções

### 🏠 Diretório Raiz (Project Root)
*   `📁 .env`: **O Cofre das Chaves**. Contém as credenciais sensíveis (GEMINI_API_KEY) e URLs do WordPress.
*   `📁 frontend/`: **O Córtex Cerebral**. Pasta principal do motor Node.js que orquestra a inteligência do sistema.
*   `📁 docs/`: **Biblioteca de Memória**. Contém relatórios de funcionamento, análises de arquitetura e logs de estado.
*   `📁 wordpress-plugin/`: **A Ponte de Sincronização**. Plugin customizado para integrar o AntiGravity com o CMS Astra/Elementor.
*   `📄 .gitignore`: Filtro de segurança (impede o envio de chaves API para o GitHub).
*   `📄 ABRIR_PAINEL_ANTIGRAVITY.bat`: **Atalho de Ignição**. Script de um clique para iniciar o servidor e abrir o painel no navegador.

---

### 🧠 Diretório `frontend/` (O Motor AI)
*   `📄 server.js`: **O Orquestrador Mestre**. Gerencia as rotas API, segurança Proxy e a "Divisão de Hemisférios" entre os modelos 2.5 Flash e Pro.
*   `📄 estilo_victor.json`: **O Hipocampo Digital**. Memória persistente onde os DNAs clínicos extraídos pelo Aprendiz de Abidos são armazenados.
*   `📄 package.json`: Manifeto de dependências (Node 24+, @google/generative-ai 0.24+).
*   `📁 public/`: **A Interface Visual (UI)**. Onde reside tudo o que o usuário interage visualmente.

---

### 🖼️ Diretório `frontend/public/` (A Camada de Experiência)
*   `📄 index.html`: **O Painel de Comando**. Estrutura principal da interface (Tabs, Studio, Marketing Lab).
*   `📁 js/`: **A Lógica do Cliente**. Subpastas com os scripts que fazem a mágica acontecer:
    *   `📄 neuro-training.js`: Manager do **Aprendiz de Abidos**. Cuida do chat de áudio e extração de regras.
    *   `📄 doctoralia.js`: **Assistente Doctoralia**. Gera respostas clinical-plain-text (sem formatação markdown).
    *   `📄 chat.js`: Copiloto geral da plataforma.
    *   `📄 app.js`: Controlador global de navegação e inicialização da UI.
    *   `📄 blocks.js`: Gerador de componentes visuais do Studio.
    *   `📄 marketing-lab.js`: Análise de performance e métricas do WordPress.
    *   `📄 seo-engine.js`: Auditoria Abidos para conteúdo em tempo real.
*   `📁 css/`: Estilização (Glassmorphism, Dark Mode, Tipografia Inter).
*   `📁 icons/`: Biblioteca de ícones clínicos e sistêmicos.

---

## 🚀 Estado Tecnológico (Health Check)

| Componente | Versão/Estado | Função |
| :--- | :--- | :--- |
| **Hemisfério Flash** | `gemini-2.5-flash` | Extração de DNA, Transcrição e JSON rápido. |
| **Hemisfério Pro** | `gemini-2.5-pro` | Doctoralia, Landing Pages e Deep Insights. |
| **Backend** | Express (Node.js) | Portão de Segurança (Proxy) e Gestão de Estilos. |
| **Frontend** | Vanilla JS / Tailwind CSS | Interface Imersiva com Glassmorphism. |
| **Persistência** | JSON-based (Local) | Armazenamento de Memória de Estilo e DNAs. |

**Nota Final:** O sistema está configurado para "Output Limpo" (Plain Text) em áreas de comunicação externa para preservar o anonimato da IA e o profissionalismo clínico.

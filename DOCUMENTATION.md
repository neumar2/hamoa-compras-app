# 🏢 COMPRAS APP — Documentação Completa do Projeto

> **Sistema Open Source de Gestão de Compras e Contratações**
> Projetado para Condomínios e Empresas

---

## 📋 ÍNDICE

1. [Visão Geral](#-visão-geral)
2. [Arquitetura e Stack](#-arquitetura-e-stack)
3. [Estrutura de Arquivos](#-estrutura-de-arquivos)
4. [Como Iniciar o Sistema](#-como-iniciar-o-sistema)
5. [Banco de Dados](#-banco-de-dados)
6. [Autenticação e Segurança](#-autenticação-e-segurança)
7. [Rotas da API (Backend)](#-rotas-da-api-backend)
8. [Páginas do Frontend](#-páginas-do-frontend)
9. [Funcionalidades Implementadas](#-funcionalidades-implementadas)
10. [Fluxo de uma Solicitação de Compra](#-fluxo-de-uma-solicitação-de-compra)
11. [Perfis e Permissões](#-perfis-e-permissões)

---

## 🎯 Visão Geral

Sistema web para gerenciar o ciclo completo de compras corporativas:

**Abertura → Cotação → Equalização → Aprovação → Faturamento → Pagamento**

- Pode ser utilizado em rede local ou deploy em nuvem.
- Dados persistem localmente em **PostgreSQL**
- Controle de acessos e auditoria completos.

---

## 🛠 Arquitetura e Stack

```
┌─────────────────────────────────────────────────────────┐
│                   SERVIDOR WINDOWS                       │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │  Frontend     │    │   Backend    │   │ PostgreSQL │  │
│  │  React + Vite │◄──►│  Express.js  │◄─►│  database  │  │
│  │  Porta 5173   │    │  Porta 5000  │   │ Porta 5432 │  │
│  └──────────────┘    └──────────────┘   └────────────┘  │
│                                                          │
│  Acesso: http://<IP-SERVIDOR>:5173                       │
└─────────────────────────────────────────────────────────┘
         ▲
         │ Rede local (LAN)
    ┌────┴────┐
    │ 15+ PCs │
    └─────────┘
```

### Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18.x | Framework UI |
| Vite | 5.x | Build tool / dev server |
| Axios | 1.x | HTTP client |
| Recharts | 2.x | Gráficos (barras, pizza, linhas) |
| XLSX (SheetJS) | 0.x | Exportação Excel |

| Backend | Versão | Uso |
|-----------|--------|-----|
| Node.js | 18+ | Runtime |
| Express | 4.19 | API REST |
| Sequelize | 6.37 | ORM (PostgreSQL) |
| PostgreSQL | 17 | Banco de dados corporativo |
| bcryptjs | 2.4 | Hash de senhas |
| jsonwebtoken | 9.0 | Autenticação JWT |
| multer | 1.4 | Upload de arquivos |
| nodemon | 3.1 | Hot-reload em desenvolvimento |
| compression | 1.8 | GZIP para respostas HTTP |
| nodemailer | 8.0 | Envio de e-mails (ativação/recuperação) |

---

## 📁 Estrutura de Arquivos

```
hamoa-compras-app/
├── .gitignore
├── package.json                      # Script raiz (npm install em ambos)
├── iniciar_sistema.bat               # Script Windows para iniciar backend+frontend
│
├── backend/
│   ├── .env                          # PORT=5000, JWT_SECRET (NÃO vai pro Git)
│   ├── package.json
│   ├── audit_logs.json               # Log de auditoria do módulo Config
│   │
│   └── src/
│       ├── server.js                 # Entry point — Express + sync + índices
│       │
│       ├── database/
│       │   ├── connection.js         # Conexão Sequelize (SQLite ou PostgreSQL)
│       │   ├── models.js             # Modelos: User, Solicitacao, Item, Fornecedor,
│       │   │                         #   PrecoItem, Anexo, Comentario, PlanoContas,
│       │   │                         #   LancamentoFinanceiro
│       │   ├── seed.js               # Seed: usuários + plano de contas (force:true)
│       │   ├── seed_financeiro.js    # Seed: balancete abril + previsões mai-dez
│       │   └── seed_mock_data.js     # Seed: ~6400 transações mock realistas
│       │
│       ├── middlewares/
│       │   └── auth.js               # Middleware JWT — extrai req.user do token
│       │
│       ├── routes/
│       │   ├── authRoutes.js         # POST /login, /activate-account,
│       │   │                         #   /forgot-password, /reset-password
│       │   ├── solicitacaoRoutes.js  # CRUD completo de solicitações (maior arquivo)
│       │   ├── userRoutes.js         # CRUD de usuários + permissões
│       │   ├── financeiroRoutes.js   # Dashboard financeiro + CRUD receitas
│       │   └── settingsRoutes.js     # Backup + Audit logs
│       │
│       └── utils/
│           └── mailer.js             # Nodemailer — envio de e-mails
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   └── src/
│       ├── main.jsx                  # Entry point React
│       ├── App.jsx                   # Roteamento principal + gerenciamento de temas
│       ├── App.css                   # Estilos do App
│       ├── index.css                 # Design system global (variáveis CSS, temas)
│       ├── api.js                    # Axios instance + interceptor JWT
│       │
│       ├── components/
│       │   ├── Navbar.jsx            # Barra de navegação principal
│       │   └── NotificationBell.jsx  # 🔔 Sino de notificações
│       │
│       ├── pages/
│           ├── Login.jsx             # Tela de login + ativação + recuperação senha
│           ├── Dashboard.jsx         # ⭐ Página principal
│           │                         #   KPIs, tabela, filtros, gráficos, modal detalhe
│           ├── SolicitacaoForm.jsx   # Formulário para criar/editar solicitação
│           ├── EqualizacaoForm.jsx   # Formulário de equalização (cotação 3 fornecedores)
│           ├── UserManagement.jsx    # Gestão de usuários e permissões
│           ├── Receitas.jsx          # Módulo de receitas (CRUD)
│           ├── Configuracoes.jsx     # Backup + Restore UI + Logs de auditoria
│           └── Sobre.jsx             # Página "Sobre" (créditos)
│
├── docs/                             # Documentações adicionais (ex: Disaster_Recovery.md)
└── uploads/                          # Arquivos enviados (PDFs, imagens — NÃO vai pro Git)
```

---

## 🚀 Como Iniciar o Sistema

### Opção 1 — Script Windows (produção)
```bat
iniciar_sistema.bat
```

### Opção 2 — Manual (desenvolvimento)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev          # nodemon com hot-reload na porta 5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev          # Vite com hot-reload na porta 5173
```

### Scripts úteis do Backend (package.json):
```bash
npm run dev              # Inicia backend com nodemon
npm run db:seed          # Recria banco + usuários + plano de contas (APAGA TUDO)
npm run seed:financeiro  # Popula dados financeiros (balancete + previsões)
npm run seed:mock        # Gera ~6400 transações mock (mantém usuários)
npm run db:seed-all      # Executa os 3 seeds acima em sequência
```

> ⚠️ **ATENÇÃO:** `npm run db:seed` usa `force: true` — apaga TODAS as tabelas e recria do zero. Use com cuidado em produção!

---

## 🗄 Banco de Dados

### Modelos (Tabelas)

| Modelo | Tabela | Descrição |
|--------|--------|-----------|
| `User` | Users | Usuários do sistema (7 perfis) |
| `Solicitacao` | Solicitacaos | Solicitações de compra (entidade principal) |
| `Item` | Items | Itens de uma solicitação (1:N) |
| `Fornecedor` | Fornecedors | Fornecedores cotados (1:N por solicitação) |
| `PrecoItem` | PrecoItems | Preço de cada item por fornecedor (N:N) |
| `Anexo` | Anexos | Arquivos anexados (PDFs, prints de orçamento) |
| `Comentario` | Comentarios | Comentários/observações em uma solicitação |
| `PlanoContas` | PlanoContas | 276 contas contábeis (code + name) |
| `LancamentoFinanceiro` | LancamentoFinanceiros | Receitas, despesas e previsões financeiras |

### Relacionamentos
```
User 1──N Solicitacao (solicitanteId)
User 1──N Solicitacao (approvedById)
Solicitacao 1──N Item (solicitacaoId) [CASCADE]
Solicitacao 1──N Fornecedor (solicitacaoId) [CASCADE]
Solicitacao 1──N Anexo (solicitacaoId) [CASCADE]
Solicitacao 1──N Comentario (solicitacaoId) [CASCADE]
Item 1──N PrecoItem (itemId) [CASCADE]
Fornecedor 1──N PrecoItem (fornecedorId) [CASCADE]
User 1──N Anexo (uploadedById)
User 1──N Comentario (userId)
User 1──N LancamentoFinanceiro (registradoPorId)
```

### Campos do User (11 permissões booleanas)
```
canRequest          → Pode criar solicitações
canEqualize         → Pode fazer cotação/equalização
canApprove          → Pode aprovar solicitações
canDownloadBoleto   → Pode baixar boletos
canDownloadNF       → Pode baixar notas fiscais
canEditEqualization → Pode editar equalização já feita
canDeleteRequest    → Pode excluir solicitações
canAccessReceitas   → Pode acessar módulo de Receitas
canConfirmReceitas  → Pode confirmar receitas
canManageUsers      → Pode gerenciar usuários
canAccessSettings   → Pode acessar Configurações (backup/logs)
```

### Índices Criados (performance)
```sql
-- Solicitacaos
idx_sol_dataAplicacao, idx_sol_status, idx_sol_tipo,
idx_sol_solicitanteId, idx_sol_conta

-- Items
idx_items_solicitacaoId

-- PrecoItems
idx_precoitems_itemId, idx_precoitems_fornecedorId, idx_precoitems_isWinner

-- Anexos
idx_anexos_solicitacaoId, idx_anexos_fileType

-- Fornecedors
idx_fornecedors_solicitacaoId
```

### PRAGMAs SQLite (configurados em connection.js)
```sql
PRAGMA journal_mode=WAL;          -- Write-Ahead Logging
PRAGMA synchronous=NORMAL;        -- Sync menos agressivo
PRAGMA busy_timeout=5000;         -- 5s timeout para locks
PRAGMA cache_size=-20000;         -- 20MB de cache em RAM
PRAGMA mmap_size=268435456;       -- 256MB memory-mapped I/O
PRAGMA temp_store=MEMORY;         -- Tabelas temporárias em RAM
```

---

## 🔐 Autenticação e Segurança

- **JWT (JSON Web Token)** com expiração de **8 horas**
- Secret key: variável `JWT_SECRET` no `.env` (default: `hamoasecretkey123`)
- Token armazenado no `localStorage` do navegador
- Middleware `auth.js` valida o token em TODAS as rotas da API (exceto login)
- Senhas hasheadas com **bcryptjs** (salt 10 rounds)
- Fluxo de ativação de conta com código de 6 dígitos via e-mail
- Fluxo de recuperação de senha com código de 6 dígitos via e-mail

### Payload do Token JWT
```json
{
  "id": "uuid",
  "name": "Nome do Usuário",
  "role": "TI|GESTAO|SUPRIMENTOS|FINANCEIRO|EVENTOS",
  "email": "usuario@hamoa.com",
  "canRequest": true,
  "canEqualize": false,
  "canApprove": false,
  "canDownloadBoleto": true,
  "canDownloadNF": true,
  "canEditEqualization": false,
  "canDeleteRequest": false,
  "canAccessReceitas": true,
  "canConfirmReceitas": false,
  "canManageUsers": false,
  "canAccessSettings": false
}
```

---

## 🔑 Credenciais de Teste

> **Senha padrão para todos: `hamoa123`**

| Nome | Email | Role | Permissões Principais |
|------|-------|------|-----------------------|
| Neumar Permonian T.I | admin@hamoa.com | TI | Acesso total a tudo |
| Carol Gestora | gestao@hamoa.com | GESTAO | Aprova, deleta, receitas, gerencia usuários |
| Arisson Suprimentos | suprimentos@hamoa.com | SUPRIMENTOS | Equaliza, baixa boleto/NF |
| Gisele Financeiro | financeiro@hamoa.com | FINANCEIRO | Boleto, NF, receitas, confirma receitas |
| Samuel Eventos | eventos@hamoa.com | EVENTOS | Apenas cria solicitações |
| Matheus Jov. Aprendiz | recepcao@hamoa.com | EVENTOS | Apenas cria solicitações |
| Paulo Administrativo | paulo@hamoa.com | EVENTOS | Apenas cria solicitações |

---

## 🌐 Rotas da API (Backend)

### Autenticação (`/api/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/login` | Login → retorna JWT + user |
| POST | `/activate-account` | Ativa conta com código 6 dígitos |
| POST | `/forgot-password` | Gera token de recuperação |
| POST | `/reset-password` | Reseta senha com token |
| GET | `/test-code?email=` | (Dev only) Retorna códigos ativos |

### Solicitações (`/api/solicitacoes`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista solicitações (filtro por período, SQL raw otimizado) |
| GET | `/stats` | Estatísticas globais (cache 3min) |
| GET | `/plano-contas` | Lista 276 contas contábeis |
| GET | `/:id` | Detalhe completo (com Items, Vendors, Prices, Anexos) |
| POST | `/` | Cria solicitação |
| PUT | `/:id` | Edita solicitação |
| DELETE | `/:id` | Exclui solicitação |
| POST | `/:id/equalizacao` | Salva equalização (3 fornecedores) |
| POST | `/:id/aprovar` | Aprova solicitação |
| POST | `/:id/faturar` | Fatura (upload boleto + NF) |
| POST | `/:id/pagar` | Confirma pagamento |
| POST | `/:id/recusar` | Recusa com motivo |
| GET | `/:id/comentarios` | Lista comentários |
| POST | `/:id/comentarios` | Adiciona comentário |
| POST | `/:id/anexos` | Upload de anexos |

### Usuários (`/api/users`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista todos os usuários |
| POST | `/` | Cria novo usuário |
| PUT | `/:id` | Edita usuário + permissões |
| DELETE | `/:id` | Desativa usuário |

### Financeiro (`/api/financeiro`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard` | Dados do dashboard financeiro |
| GET | `/receitas` | Lista receitas |
| POST | `/receitas` | Cria receita |
| PUT | `/receitas/:id` | Edita receita |
| DELETE | `/receitas/:id` | Exclui receita |
| POST | `/receitas/:id/confirmar` | Confirma receita |

### Configurações (`/api/settings`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/backup/download` | Gera backup .zip (Banco + Anexos) |
| POST | `/backup/restore` | Importa .zip para restauração |
| GET | `/audit-log` | Lista logs de auditoria |

---

## 📱 Páginas do Frontend

| Página | Arquivo | Tamanho | Descrição |
|--------|---------|---------|-----------|
| Login | Login.jsx | 12 KB | Login, ativação de conta, recuperação de senha |
| Dashboard | Dashboard.jsx | **86 KB** | Página principal — KPIs, tabela, gráficos, filtros, modal |
| Nova Solicitação | SolicitacaoForm.jsx | 19 KB | Formulário de criação/edição |
| Equalização | EqualizacaoForm.jsx | 28 KB | Cotação de 3 fornecedores + upload prints |
| Usuários | UserManagement.jsx | 20 KB | CRUD de usuários + toggle permissões |
| Receitas | Receitas.jsx | 13 KB | CRUD de receitas do condomínio |
| Configurações | Configuracoes.jsx | 11 KB | Backup do banco + visualização de audit logs |
| Sobre | Sobre.jsx | 3 KB | Créditos do sistema |

### Componentes Reutilizáveis
| Componente | Descrição |
|-----------|-----------|
| Navbar.jsx | Barra de navegação com links condicionais por perfil |
| NotificationBell.jsx | Sino 🔔 com badge de contagem e dropdown |

### Sistema de Temas (5 temas via CSS variables)
Definidos em `index.css` com `data-theme` no `<html>`:
- **Claro (Padrão)** — fundo branco
- **Escuro** — fundo dark
- **Ocean** — tons de azul
- **Floresta** — tons de verde
- **Alto Contraste** — preto com texto amarelo (acessibilidade)

---

## ✅ Funcionalidades Implementadas

1. ✅ Filtro de calendário no Dashboard (navegação por mês/ano)
2. ✅ Dados mock realistas (~6400 transações com status distribuídos)
3. ✅ Página "Sobre" (créditos Neumar Porto Permonian)
4. ✅ 5 temas visuais (Claro, Escuro, Ocean, Floresta, Alto Contraste)
5. ✅ Permissões granulares (11 booleanos por usuário)
6. ✅ Exportação CSV no Dashboard
7. ✅ Alertas SLA (solicitações paradas 2+ dias geram notificação)
8. ✅ Gráfico evolução financeira (Receitas vs Despesas por mês)
9. ✅ Módulo de Receitas (CRUD completo)
10. ✅ Módulo de Backup + Restore Completo via UI + Audit Logs
11. ✅ Notificação Bell 🔔 no Navbar
12. ✅ Modal de detalhe com timeline visual do ciclo de vida
13. ✅ Comentários em solicitações
14. ✅ Recusa de solicitações com motivo
15. ✅ Upload de Boleto + Nota Fiscal juntos
16. ✅ Simulação de CAPEX no dashboard
17. ✅ Relatório de Assembleia (Prestação de Contas)
18. ✅ Filtros interativos nos KPIs (clica no card → filtra a tabela)
19. ✅ Ativação de conta por e-mail (código 6 dígitos)
20. ✅ Recuperação de senha por e-mail

---

## 🔄 Fluxo de uma Solicitação de Compra

```
1. ABERTA          → Solicitante cria a solicitação
       ↓
2. EM_COTACAO      → Suprimentos pesquisa preços (3 fornecedores)
       ↓
3. AGUARD_APROV    → Suprimentos envia equalização para aprovação
       ↓
4. APROVADA        → Gestão/TI aprova e assina
       ↓
5. FATURADA        → Financeiro anexa Boleto/Pix + Nota Fiscal
       ↓
6. PAGA            → Financeiro confirma pagamento

   RECUSADA        → Gestão/TI pode recusar em qualquer etapa após equalização
```

### Regras de Negócio Críticas:
- Não é possível editar solicitações APROVADA, FATURADA ou PAGA
- Não é possível excluir solicitações PAGA
- Para faturar, é obrigatório anexar Boleto/Pix E Nota Fiscal juntos
- Para confirmar pagamento, deve existir NF e Boleto no banco
- Usuários EVENTOS só veem suas próprias solicitações

---

## 👥 Perfis e Permissões

| Ação | TI | GESTÃO | SUPRIM. | FINANC. | EVENTOS |
|------|:--:|:------:|:-------:|:-------:|:-------:|
| Criar solicitação | ✅ | ❌ | ❌ | ❌ | ✅ |
| Equalizar (cotar) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Aprovar/Recusar | ✅ | ✅ | ❌ | ❌ | ❌ |
| Faturar (boleto+NF) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Confirmar pagamento | ✅ | ❌ | ❌ | ✅ | ❌ |
| Excluir solicitação | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver estatísticas | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ✅ | ❌ | ❌ | ❌ |
| Acessar receitas | ✅ | ✅ | ❌ | ✅ | ❌ |
| Acessar configurações | ✅ | ❌ | ❌ | ❌ | ❌ |

> **Nota:** Estas são as permissões padrão. Cada booleano pode ser customizado individualmente na tela de Gestão de Usuários.

---

## ⚡ Otimizações de Performance

O sistema foi otimizado para lidar com milhares de registros no PostgreSQL:

### Rota GET /solicitacoes (Listagem)
- **Problema:** Subqueries correlacionadas executavam 4 queries por linha (estimatedTotal, hasBoleto, hasNF, hasOrcamento)
- **Solução:** Query SQL raw única com LEFT JOINs e subquery agrupada
- **Resultado:** 2000ms → **16ms** (1 mês), 12000ms → **39ms** (ano inteiro)

### Rota GET /solicitacoes/stats (Estatísticas)
- **Problema:** Carregava TODOS os registros na memória com Sequelize para calcular Savings e TopSuppliers
- **Solução:** SQL puro com GROUP BY e SUM
- **Resultado:** ~20s → **100ms**
- Cache em memória com TTL de 3 minutos

### Banco de Dados
- 12 índices nas tabelas mais acessadas
- PRAGMAs otimizados (WAL, cache 20MB, mmap 256MB)
- Compressão GZIP nas respostas HTTP

---


## 🐘 PostgreSQL (Banco de Dados em Produção)

O sistema migrou de SQLite para **PostgreSQL 17** em Junho/2026.

### Credenciais do PostgreSQL (servidor local)
```
Host:     localhost
Porta:    5432
Banco:    hamoa_compras
Usuário:  postgres
Senha:    hamoa123
```

### Regra de Ouro para Queries SQL no PostgreSQL (camelCase)
> [!IMPORTANT]
> O PostgreSQL converte todos os identificadores não quotados para caixa baixa (lowercase). Como o Sequelize gera as tabelas com colunas em camelCase (ex: `isActive`, `dataAplicacao`, `winnerTotal`), **toda query SQL pura/crua deve conter aspas duplas ao redor do nome das colunas**, caso contrário a query falhará com erro `500 (coluna não existe)`.
> * **Incorreto:** `pc.isActive`, `totals.winnerTotal`
> * **Correto:** `pc."isActive"`, `totals."winnerTotal"`, `s."dataAplicacao"`

### Arquivo `backend/.env` (configuração atual):
```env
PORT=5000
JWT_SECRET=hamoasecretkey123
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hamoa_compras
DB_USER=postgres
DB_PASS=hamoa123
```

### Como recriar o banco do zero:
1. Abrir pgAdmin ou psql
2. Executar: `CREATE DATABASE hamoa_compras;`
3. No terminal: `cd backend && npm run db:seed-all`

### Voltar para SQLite (emergência):
Basta remover `DB_DIALECT=postgres` do `.env` — o sistema automaticamente usa SQLite como fallback.

---

## 📦 Assistente de Instalação Gráfico (Wizard Windows)

Para facilitar a implantação simplificada em novos computadores da rede, o sistema conta com um instalador wizard gráfico na raiz do projeto:

* **Arquivo:** [instalador_wizard.ps1](file:///c:/Users/jose.lemos/.gemini/antigravity-ide/scratch/hamoa-compras-app/instalador_wizard.ps1)
* **Como rodar:** Abra o PowerShell como Administrador e execute:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process; .\instalador_wizard.ps1
  ```
* **Etapas do Instalador:**
  1. **Boas-Vindas:** Explica os pré-requisitos (Node.js e PostgreSQL).
  2. **Banco de Dados:** Solicita Host, Porta, Nome do Banco, Usuário e Senha do PostgreSQL.
  3. **Opções:** Permite escolher a porta da aplicação (default: `5000`), popular com banco de dados de teste (semeamento completo) e criar um atalho na Área de Trabalho.
  4. **Progresso:** Executa as instalações de dependências de forma assíncrona exibindo um console log e barra de progresso.
  5. **Conclusão:** Finaliza a instalação, abre o navegador padrão em `http://localhost:5000` e cria o atalho.

---

## ⚠️ Problemas Conhecidos e Débitos Técnicos

### Dashboard.jsx já foi refatorado (86 KB)
- Grande parte dos subcomponentes de gráficos já foram abstraídos para manter o arquivo leve e focado no fluxo principal.

### Envio de e-mails não configurado
- O `mailer.js` está preparado mas o SMTP não foi configurado no `.env`
- Ativação e recuperação de senha funcionam, mas o e-mail não é enviado
- Para configurar, adicionar no `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### Rota GET /stats é global (não filtra por período)
- As estatísticas são calculadas sobre TODOS os dados, não apenas o período selecionado
- O frontend exibe KPIs globais enquanto a tabela mostra apenas o mês selecionado
- **Recomendação:** Parametrizar `/stats` com startDate/endDate

### Temas: persistência funciona, mas não salva no servidor
- O tema selecionado é salvo no `localStorage` do navegador
- Se trocar de máquina, perde a preferência

---

## 🗺 Próximos Passos (Roadmap)

### Prioridade Alta
- [x] Migrar para PostgreSQL em produção (Concluído)
- [x] Mapear Plano de Contas dinâmico no formulário e inativação segura (Concluído)
- [x] Desenvolver instalador automatizado estilo Next-Next-Finish (Concluído)
- [x] Criar rotina de Backup e Restore via Interface Web Segura (Concluído)
- [ ] Configurar SMTP para envio real de e-mails
- [x] Refatorar Dashboard.jsx em subcomponentes (Concluído)

### Prioridade Média
- [ ] Paginação na tabela do Dashboard (ao invés de carregar todas as solicitações)
- [ ] Filtrar /stats por período selecionado
- [ ] Dashboard responsivo para mobile/tablet
- [ ] Exportação de relatórios em PDF

### Prioridade Baixa
- [ ] Módulo de contratos recorrentes
- [ ] Integração com sistema de condomínio (Hamoa Presence App)
- [ ] Logs de auditoria persistentes no banco (atualmente em JSON)
- [ ] PWA (Progressive Web App) para acesso offline

---

## 📌 Regras Importantes para Continuidade

1. **Idioma:** Sempre usar **Português (PT-BR)** nas interfaces e comentários
2. **Créditos:** A página "Sobre" deve manter o crédito a **Neumar Porto Permonian**
3. **100% Local:** Sistema não deve depender de serviços em nuvem
4. **Sem Dependências Extras:** Não adicionar pacotes desnecessários (ex: react-icons não está instalado — use emojis)
5. **Cascata:** Ao excluir Solicitação, Items, Fornecedores, Preços, Anexos e Comentários são removidos automaticamente (CASCADE)
6. **Porta do Backend:** Sempre 5000 (servindo o frontend build estaticamente)
7. **Porta do Frontend (Dev):** Sempre 5173 (configurada pelo Vite)
8. **Banco Relacional:** A tabela `PlanoContas` possui relacionamento de chave estrangeira (`planoContasCode`) na tabela `Solicitacaos` e `LancamentoFinanceiros`. Em caso de "exclusão" de conta com histórico, deve-se usar Soft Delete (`isActive: false`).

---

> **Documento atualizado em Junho/2026.**
> Para dúvidas sobre o projeto, consulte o responsável de T.I: Neumar Porto Permonian (admin@hamoa.com)

---

> **Documento gerado automaticamente em Junho/2026.**
> Para dúvidas sobre o projeto, consulte o responsável de T.I: Neumar Porto Permonian (admin@hamoa.com)

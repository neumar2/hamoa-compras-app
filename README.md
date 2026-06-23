<div align="center">
  <h1># Hamoa Compras App</h1>

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📖 Sobre o Hamoa Compras App

O **Hamoa Compras App** é um sistema completo open source de gestão de compras, equalização e suprimentos (ERP), originalmente projetado para resorts e condomínios, mas escalável para qualquer empresa. Ele elimina papéis e otimiza todo o fluxo de requisição, cotação e financeiro.

Desenvolvido com uma arquitetura moderna e 100% responsiva, ele garante rastreabilidade total (logs de auditoria), níveis rígidos de aprovação por papéis e segurança dos dados com backups robustos em PostgreSQL.

---

## ✨ Principais Funcionalidades

- 🛒 **Ciclo de Vida Completo**: Abertura ➔ Cotação ➔ Equalização ➔ Aprovação ➔ Faturamento ➔ Pagamento.
- 👥 **Múltiplos Perfis (RBAC)**: Permissões granulares configuráveis para TI, Gestão, Suprimentos, Financeiro e Eventos.
- 📊 **Dashboard Dinâmico**: KPIs em tempo real, previsibilidade financeira (OPEX/CAPEX) e gráficos exportáveis.
- 🧾 **Equalização Automática**: Comparativo visual de até 3 fornecedores com sugestão da melhor compra.
- 💾 **Disaster Recovery (Backup/Restore UI)**: Módulo embutido que permite baixar cópias completas do sistema (banco + anexos em ZIP) e restaurá-las com senha, diretamente pela interface web.
- 🎨 **Sistema de Temas**: 5 esquemas visuais (incluindo Dark Mode e Alto Contraste).
- 💰 **Plano de Contas Integrado**: 276 categorias dinâmicas mapeadas com restrições e inativação de contas de histórico.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React.js (v18)** com **Vite**
- **Axios** para requisições assíncronas
- **Recharts** para visualização de dados
- Autenticação por **JWT** no LocalStorage

### Backend
- **Node.js** com **Express.js**
- **Sequelize ORM** (banco de dados PostgreSQL)
- **Bcrypt.js** para hashes seguros
- **Multer** para upload de comprovantes, PDFs e XMLs

---

## 🚀 Como Iniciar (Padrão Corporativo com Docker)

A maneira mais profissional e recomendada para instalar o sistema definitivamente ou em cenários Open Source é através do **Docker Compose**. Ele resolve dependências de banco de dados e Node.js automaticamente.

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker Engine) instalado no servidor.

### Instalação em 1 Comando:
Abra o terminal na pasta raiz do projeto e execute:
```bash
docker-compose up -d
```
*Na primeira vez, o Docker baixará o PostgreSQL e construirá a imagem da aplicação. O sistema ficará disponível em `http://localhost:5000`.*
*O banco de dados e os arquivos físicos ficarão salvos automaticamente em volumes na pasta local.*

> **Nota para Restore:** Se você estiver migrando, acesse com `admin@hamoa.com`, vá em Configurações e faça Upload do seu arquivo `.zip` de Backup.

---

## 🛠️ Como Iniciar (Desenvolvedores / Manual)

### Pré-requisitos
- Node.js (v18+)
- PostgreSQL (Obrigatório)

### Instalação Manual

**1. Clone o Repositório:**
```bash
git clone https://github.com/seu-usuario/hamoa-compras-app.git
cd hamoa-compras-app
```

**2. Inicie o Backend:**
```bash
cd backend
npm install
npm run dev
```
*(Ele irá conectar no PostgreSQL. Para popular o sistema com dados de demonstração, você pode parar o servidor e rodar `npm run db:seed-all`)*

**3. Inicie o Frontend:**
Em um novo terminal, na pasta raiz do projeto:
```bash
cd frontend
npm install
npm run dev
```

O sistema estará disponível em `http://localhost:5173`. 
> Credencial padrão de fábrica (após rodar o Seed): `admin@hamoa.com` / `hamoa123`

---

## 📦 Assistente de Instalação (Windows)
Para usuários corporativos, disponibilizamos um **Assistente Wizard Gráfico**.
Abra o PowerShell como Administrador e rode o script da raiz:
```powershell
Set-ExecutionPolicy Bypass -Scope Process; .\instalador_wizard.ps1
```
Ele instalará as dependências, configurará o Banco e criará atalhos na Área de Trabalho.

---

## 📚 Documentação Adicional

A documentação detalhada (arquitetura interna, regras de negócio e rotas de API) encontra-se no arquivo [`PROJETO_DOCUMENTACAO.md`](PROJETO_DOCUMENTACAO.md). Para a estratégia de failover, consulte o [`docs/Disaster_Recovery.md`](docs/Disaster_Recovery.md).

---

<div align="center">
  <p>Desenvolvido com ☕ e dedicação por <strong>Neumar Porto Permonian</strong> (T.I)</p>
</div>

<div align="center">
  <h1># 🏢 Compras App (Open Source ERP)</h1>

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📖 Sobre

O **Compras App** é um sistema completo e moderno de gestão de compras, equalização e suprimentos, projetado para otimizar o fluxo financeiro de condomínios e empresas. Ele elimina planilhas e papéis, trazendo controle total sobre aprovações, cotações e relatórios.

---

## 🚀 Como Instalar (Passo a Passo Simplificado)

O sistema foi preparado com **Docker**, o que significa que o banco de dados e o aplicativo rodam de forma automática e isolada. Você não precisa instalar dezenas de programas.

### Passo 1: Instalar o Docker
1. Acesse o site do [Docker Desktop](https://www.docker.com/products/docker-desktop/) e faça o download.
2. Instale o programa no seu computador ou servidor (Windows ou Mac) seguindo as telas de "Avançar".
3. Abra o aplicativo Docker Desktop após a instalação e aguarde ele iniciar.

### Passo 2: Baixar e Rodar o Sistema
1. Faça o download deste repositório (botão verde **Code** > **Download ZIP**) e extraia a pasta no seu computador.
2. Abra o terminal (PowerShell ou CMD) e navegue até a pasta que você extraiu:
   ```bash
   cd caminho/para/a/pasta/do/sistema
   ```
3. Digite o comando mágico para iniciar a instalação:
   ```bash
   docker-compose up -d --build
   ```

> ⏳ **O que vai acontecer?** O Docker vai baixar o PostgreSQL e configurar todo o servidor do zero. O processo dura cerca de 2 a 5 minutos na primeira vez.

### Passo 3: Acessar o Sistema
- Abra o seu navegador e acesse: **`http://localhost:5000`**

---

## 🔑 Credenciais de Acesso Inicial

Após o sistema carregar, ele criará automaticamente um administrador de fábrica para o primeiro acesso:

- **E-mail:** `admin@hamoa.com`
- **Senha:** `admin`

> **Aviso:** Assim que acessar, vá ao painel de configurações para cadastrar novos usuários e não esqueça de trocar a senha ou inativar o usuário padrão! E lembre-se de configurar o **Servidor SMTP (E-mail)** nas Configurações para que as recuperações de senha funcionem.

---

## 💾 Persistência de Dados e Backups

Todos os seus dados estão 100% seguros:
- O banco de dados e os arquivos (boletos/notas fiscais) são salvos permanentemente no disco físico do seu computador através de volumes do Docker.
- O sistema já vem com uma ferramenta de **Disaster Recovery (Backup/Restore)** na aba de configurações. 
- Você pode gerar um Backup Completo em `.zip` e restaurá-lo diretamente pela interface gráfica do sistema.

---

## 📚 Documentação Técnica

Para desenvolvedores, a arquitetura interna e rotas do sistema encontram-se no arquivo [`DOCUMENTATION.md`](DOCUMENTATION.md). 

<div align="center">
  <p>Desenvolvido com ☕ e dedicação por <strong>Neumar Porto Permonian</strong></p>
</div>

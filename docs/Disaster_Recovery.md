# Plano de Recuperação de Desastres (Disaster Recovery)

Este documento descreve o procedimento passo a passo para restaurar o banco de dados do sistema **Hamoa Compras** a partir de um backup completo em caso de falha catastrófica ou corrupção de dados.

## 1. Localizando os Backups

Os backups são gerados automaticamente e sob demanda pelo sistema. 
- Eles ficam armazenados na pasta raiz do projeto no caminho: `backups/`
- Arquivos gerados para PostgreSQL têm o formato `backup_hamoa_YYYY-MM-DD_HH-MM-SS.sql.gz` ou arquivos descompactados `.sql`.

## 2. Preparando o Ambiente

Para restaurar o banco, é necessário ter a ferramenta de linha de comando `psql` (fornecida com o PostgreSQL) instalada. 
No ambiente Windows, a ferramenta geralmente está localizada em: `C:\Program Files\PostgreSQL\<versão>\bin\psql.exe`.

### Informações de Acesso Padrão:
- **Banco de Dados**: `hamoa_compras`
- **Usuário**: `postgres`
- **Senha**: `hamoa123` (ou conforme configurado no `.env`)
- **Porta**: `5432`
- **Host**: `localhost`

## 3. Descompactando o Backup (Se Necessário)

Se o seu backup for um arquivo `.gz`, você precisará extraí-lo primeiro.
Você pode usar uma ferramenta como o 7-Zip ou rodar um script Node.js para descompactar o arquivo `.sql` que está contido nele.

## 4. Limpando o Banco de Dados (Apenas em cenários de substituição total)

> **Atenção**: Se você for restaurar os dados por cima da base existente que foi comprometida, você deve limpar as tabelas primeiro. O próprio script de restauração não fará um DROP automático das tabelas, mas se o schema estiver populado, poderá ocorrer conflitos de "Relation already exists".

Para limpar o schema, execute no seu `psql`:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## 5. Restaurando o Backup

Para restaurar os dados, abra o Prompt de Comando (CMD) ou PowerShell na pasta raiz do projeto e execute o `psql`, passando o caminho do arquivo `.sql`. 

Comando de Exemplo:

```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d hamoa_compras -f "caminho\para\o\seu\arquivo\backup.sql"
```

O terminal solicitará a senha do usuário `postgres`. Ao digitar, a restauração iniciará, exibindo mensagens `SET`, `CREATE TABLE`, e `COPY` no terminal, indicando o sucesso.

## 6. Validação

Após a restauração, inicie o backend e o frontend da aplicação (`npm run dev`) e valide os pontos principais:
1. Acesse o sistema e navegue até a tela do Dashboard.
2. Certifique-se de que os usuários e perfis continuam aptos a fazer login.
3. Certifique-se de que a listagem de **Solicitações de Compras** carrega normalmente.
4. O processo estará validado com sucesso.

---
_Documento gerado como parte da validação de integridade e simulação de desastres (Simulação bem-sucedida em Junho de 2026)._

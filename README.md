# Poupay

Plataforma web para comparar preços de supermercados. O usuário monta listas de compras, compara o total entre os mercados que escolher, registra o que comprou e acompanha quanto economizou.

> Projeto da disciplina [nome da disciplina], [curso/instituição], [semestre].
> Integrantes: [nomes do grupo].

## Funcionalidades da API

- Cadastro e login (senha com hash, autenticação por token JWT)
- CRUD de supermercados e de produtos
- Preços por supermercado, com histórico preservado e data de atualização
- Listas de compras (cada usuário só acessa as próprias)
- Comparação do custo da lista entre supermercados
- Supermercados favoritos e seleção de mercados para comparar
- Registro de compras, histórico e economia por mês

O frontend (Next.js) está em desenvolvimento.

## Tecnologias

- Node.js, Express e TypeScript
- PostgreSQL 16 (via Docker)
- Validação com Zod, testes com Vitest
- Documentação com Swagger/OpenAPI

## Pré-requisitos

- Node.js 20 ou mais novo
- Git
- Docker Desktop (ou um PostgreSQL 16 instalado localmente)

## Como executar

### 1. Clonar o projeto

```bash
git clone https://github.com/RenanSzFreitas/poupay.git
cd poupay
```

### 2. Subir o banco de dados

```bash
docker compose up -d
docker compose ps
```

O serviço `db` deve aparecer como `running`.

### 3. Criar as tabelas

Windows (PowerShell):

```powershell
Get-Content database/schema.sql | docker compose exec -T db psql -U poupay -d poupay
```

Linux/macOS:

```bash
docker compose exec -T db psql -U poupay -d poupay < database/schema.sql
```

Sem Docker: crie um banco chamado `poupay` no seu PostgreSQL e rode
`psql -U postgres -d poupay -f database/schema.sql`.

### 4. Configurar e iniciar o backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` e troque o valor de `JWT_SECRET` por um segredo próprio. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Inicie o servidor:

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000`. Teste em `http://localhost:3000/health`.

### 5. Documentação da API (Swagger)

Abra `http://localhost:3000/docs`. Para testar as rotas protegidas: faça login em
`POST /auth/login`, copie o `token`, clique em **Authorize** e cole só o token.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão 3000) |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo usado para assinar os tokens (obrigatório, nunca versionar o valor real) |

O arquivo `.env` não vai para o Git. Use o `backend/.env.example` como modelo.

## Testes

```bash
cd backend
npm test
```

Os testes unitários cobrem as regras de negócio da comparação de preços e do cálculo de economia.

## Estrutura do projeto

```
poupay/
├── docker-compose.yml     # PostgreSQL para desenvolvimento
├── database/schema.sql    # Script de criação das tabelas
├── backend/
│   └── src/
│       ├── routes/        # Endpoints e validação das requisições
│       ├── services/      # Regras de negócio e acesso ao banco
│       ├── middlewares/   # Autenticação
│       └── docs/          # Especificação OpenAPI
└── frontend/              # Em desenvolvimento
```

## Principais regras de negócio

- **Comparação de lista:** um supermercado sem preço para algum item da lista aparece como incompleto e nunca vence a comparação. O sistema não presume valores.
- **Preços desatualizados:** preços com mais de 30 dias geram aviso na comparação.
- **Valores em dinheiro:** somados em centavos, para evitar erros de arredondamento.
- **Economia realizada:** total da cesta no mercado completo mais caro menos o valor pago.
- **Economia potencial:** valor pago menos o total da cesta no mercado completo mais barato.
- As economias só são calculadas quando pelo menos 2 mercados têm todos os itens da cesta com preço. Caso contrário, ficam nulas.

## Segurança

- Senhas armazenadas com hash (bcrypt)
- Autenticação por JWT (validade de 1 hora) nas rotas protegidas
- Consultas ao banco parametrizadas (proteção contra SQL Injection)
- Validação de todos os dados recebidos
- Cada usuário só acessa as próprias listas, favoritos e compras
- Credenciais em variáveis de ambiente, fora do repositório

## Dados de preços

Na primeira versão, os preços são cadastrados manualmente pela API. Os dados de teste são
identificados pelo campo `source` (valor `test`) e não representam preços reais.

## Uso de inteligência artificial no desenvolvimento

**Ferramenta utilizada:** Claude (Anthropic), em conversas de chat.

**Para que foi usada:** definir a ordem de desenvolvimento, gerar o código inicial de rotas,
serviços e scripts SQL, escrever testes unitários e a especificação OpenAPI, e ajudar a
diagnosticar erros de configuração.

**Limitações e problemas encontrados, e como foram corrigidos:**

| Problema | Correção |
|---|---|
| O `docker-compose.yml` criado pelo PowerShell ficou com codificação inválida e o Docker não conseguia lê-lo | Arquivo recriado pelo VS Code, em UTF-8 |
| O `tsconfig.json` gerado pelo `tsc --init` causava erros de importação no editor | Configuração do TypeScript ajustada manualmente |
| O driver `pg` devolvia colunas `BIGINT` como texto, e a validação rejeitava os IDs | Conversão de tipo configurada em `db.ts` |
| Dependências instaladas na pasta errada deixaram o `node_modules` incompleto | Pacotes reinstalados dentro de `backend/` |
| O código sugerido para o campo `use` da comparação foi aplicado só em parte, e o campo era ignorado | Revisão do arquivo e correção do handler |

**O que a equipe revisou e validou:** todo o código gerado foi executado e testado
manualmente (inclusive casos de erro) e por testes automatizados. [Descrevam aqui o que
cada integrante revisou ou alterou por conta própria.]

**Limitações da IA nesse processo:** o modelo não enxerga o ambiente de cada máquina, então
erros de instalação e de configuração só apareciam ao executar. As regras de negócio (por
exemplo, como calcular a economia) foram decisões do projeto, confirmadas pela equipe.
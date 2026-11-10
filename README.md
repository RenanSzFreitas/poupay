# Poupay

Plataforma web para comparar preços de supermercados. O usuário monta listas de compras, compara o total entre os mercados que escolher, registra o que comprou e acompanha quanto gastou e economizou.

> Projeto das disciplinas Aplicações Digitais: Planejamento e Produção, Empreendedorismo e Prática em Bancos de Dados.

> Ciência da Computação

> Centro Universitário do Sagrado Coração (Unisagrado), 4º semestre.

> Integrantes: Renan, Guilherme, Maria Eduarda e Rebeca.

## Funcionalidades

- Cadastro e login (senha com hash, autenticação por token JWT)
- Consulta de supermercados e produtos, com busca e filtros
- Supermercados favoritos e seleção dos mercados que entram na comparação
- Listas de compras (cada usuário só acessa as próprias)
- Comparação do custo da lista entre supermercados, de duas formas: tudo em um mercado ou o mais barato de cada item
- Registro de compras, com os preços realmente pagos
- Histórico e economia (realizada e potencial) por mês e por ano
- Preços por supermercado com histórico preservado e data de atualização

## Tecnologias

- **Backend:** Node.js, Express e TypeScript
- **Banco de dados:** PostgreSQL 16 (via Docker)
- **Frontend:** Next.js, React, TypeScript e Tailwind CSS
- **Qualidade:** validação com Zod, testes com Vitest
- **Documentação da API:** Swagger/OpenAPI

## Pré-requisitos

- Node.js 20 ou mais novo
- Git
- Docker Desktop (ou um PostgreSQL 16 instalado localmente)

## Como executar

O sistema tem três partes que precisam estar ligadas ao mesmo tempo: o banco, o backend (porta 3000) e o frontend (porta 3001). Os passos 4 e 5 usam dois terminais separados.

### 1. Clonar o projeto

```bash
git clone https://github.com/RenanSzFreitas/poupay.git
cd poupay
```

### 2. Subir o banco de dados

Abra o Docker Desktop e espere ele ficar rodando. Depois:

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

### 4. Iniciar o backend (terminal 1)

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `backend/.env` e troque o valor de `JWT_SECRET` por um segredo próprio. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Inicie o servidor:

```bash
npm run dev
```

Teste em `http://localhost:3000/health`.

### 5. Iniciar o frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3001`.

### 6. Documentação da API (Swagger)

Abra `http://localhost:3000/docs`. Para testar as rotas protegidas: faça login em
`POST /auth/login`, copie o `token`, clique em **Authorize** e cole só o token.

## Telas do frontend

| Rota | O que faz | Exige login |
|---|---|---|
| `/` | Página inicial | Não |
| `/cadastro` e `/login` | Criar conta e entrar | Não |
| `/supermercados` | Lista e busca de mercados; favoritos e seleção para comparar | Não (favoritar exige) |
| `/produtos` | Lista e busca de produtos, com filtro por categoria | Não |
| `/listas` | Minhas listas de compras | Sim |
| `/listas/[id]` | Itens da lista: adicionar, quantidades, marcar como comprado | Sim |
| `/listas/[id]/comparar` | Comparação de preços entre supermercados | Sim |
| `/listas/[id]/comprar/[marketId]` | Registrar a compra com os preços pagos | Sim |
| `/historico` | Gastos e economia por mês/ano e lista de compras | Sim |

## Variáveis de ambiente

**Backend** (`backend/.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão 3000) |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo usado para assinar os tokens (obrigatório, nunca versionar o valor real) |

**Frontend** (`frontend/.env.local`)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | Endereço da API (padrão `http://localhost:3000`). Ela é pública, então nunca coloque segredos nela |

Os arquivos `.env` e `.env.local` não vão para o Git. Use os `.env.example` como modelo.

## Testes

```bash
cd backend
npm test
```

Os testes unitários cobrem as regras de negócio da comparação de preços e do cálculo de economia. O frontend não tem testes automatizados nesta versão.

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
└── frontend/
    ├── app/               # Páginas (App Router do Next.js)
    ├── components/        # Componentes compartilhados (menu)
    └── lib/               # Cliente da API e controle de login
```

## Principais regras de negócio

- **Comparação de lista:** um supermercado sem preço para algum item da lista aparece como incompleto e nunca vence a comparação. O sistema não presume valores.
- **Preços desatualizados:** preços com mais de 30 dias geram aviso na comparação.
- **Valores em dinheiro:** somados em centavos, para evitar erros de arredondamento.
- **Economia realizada:** total da cesta no mercado completo mais caro menos o valor pago.
- **Economia potencial:** valor pago menos o total da cesta no mercado completo mais barato.
- As economias só são calculadas quando pelo menos 2 mercados têm todos os itens da cesta com preço. Caso contrário, ficam sem valor ("—" na tela), em vez de zero.
- O total pago de uma compra é calculado a partir dos preços informados item por item.

## Segurança

- Senhas armazenadas com hash (bcrypt)
- Autenticação por JWT (validade de 1 hora) nas rotas protegidas
- Consultas ao banco parametrizadas (proteção contra SQL Injection)
- Validação de todos os dados recebidos
- Cada usuário só acessa as próprias listas, favoritos e compras
- Credenciais em variáveis de ambiente, fora do repositório

Pontos a melhorar antes de um uso real: o token fica no `localStorage` do navegador (o mais seguro seria um cookie `httpOnly`) e o CORS está aberto para qualquer origem, o que só é adequado em desenvolvimento.

## Dados de preços

Na primeira versão, mercados, produtos e preços são cadastrados pela API (por exemplo, pelo Swagger). O frontend só consulta mercados e produtos. Os dados de teste são identificados pelo campo `source` (valor `test`) e não representam preços reais.

## Limitações desta versão

- Não há painel administrativo: o cadastro de mercados, produtos e preços é feito só pela API.
- A busca de mercados é manual (por nome ou cidade). Os campos de latitude e longitude existem no banco, mas a localização do usuário ainda não é usada.
- A comparação não considera o custo de deslocamento entre mercados.
- Os dados de preços são de teste.

## Roteiro de demonstração

Antes de começar, cadastre alguns mercados, produtos e preços pelo Swagger.

1. Crie uma conta em `/cadastro`.
2. Em **Supermercados**, favorite alguns mercados e marque **Comparar** nos que quiser usar.
3. Em **Listas**, crie uma lista e adicione produtos, ajustando as quantidades.
4. Clique em **Comparar preços**, use **Usar minha seleção** e compare. Mostre o ranking, um mercado marcado como incompleto e a divisão item a item.
5. Clique em **Comprei aqui**, ajuste os preços para o que foi pago e registre a compra. Mostre a economia realizada e a potencial.
6. Abra **Histórico** e mostre os cartões, o gráfico por mês e por ano e os itens de uma compra.

## Melhorias futuras

- Painel administrativo e cadastro colaborativo de preços pelos usuários
- Busca de supermercados por localização e cálculo do custo de deslocamento
- Alertas de redução de preços
- Integração com fontes de preços dos supermercados e importação de comprovantes de compra
- Sugestão de rotas e comparação entre regiões
- Plano Premium com pagamentos pela AbacatePay
- Token em cookie `httpOnly` e CORS restrito

## Uso de inteligência artificial no desenvolvimento

**Ferramenta utilizada:** Claude (Anthropic), em conversas de chat.

**Para que foi usada:** definir a ordem de desenvolvimento, gerar o código inicial de rotas, serviços, telas e scripts SQL, escrever testes unitários e a especificação OpenAPI, e ajudar a diagnosticar erros de configuração.

**Limitações e problemas encontrados, e como foram corrigidos:**

| Problema | Correção |
|---|---|
| O `docker-compose.yml` criado pelo PowerShell ficou com codificação inválida e o Docker não conseguia lê-lo | Arquivo recriado pelo VS Code, em UTF-8 |
| O `tsconfig.json` gerado pelo `tsc --init` causava erros de importação no editor | Configuração do TypeScript ajustada manualmente |
| O driver `pg` devolvia colunas `BIGINT` como texto, e a validação rejeitava os IDs | Conversão de tipo configurada em `db.ts` |
| Dependências instaladas na pasta errada deixaram o `node_modules` incompleto | Pacotes reinstalados dentro de `backend/` |
| O código sugerido para o campo `use` da comparação foi aplicado só em parte, e o campo era ignorado | Revisão do arquivo e correção do handler |
| A tela da lista falhou na versão atual do Next.js: um componente que lê o `id` da URL precisa estar dentro de um `Suspense` | Componente envolvido em `Suspense`, conforme a documentação do Next.js |
| O menu não era encontrado pelo editor porque o arquivo estava em outra pasta | Arquivo movido para `frontend/components` |

**O que a equipe revisou e validou:** todo o código gerado foi executado e testado manualmente (inclusive casos de erro) e, no backend, por testes automatizados. [Descrevam aqui o que cada integrante revisou ou alterou por conta própria.]

**Limitações da IA nesse processo:** o modelo não enxerga o ambiente de cada máquina, então erros de instalação e de configuração só apareciam ao executar. Parte do código precisou de ajuste por causa de versões novas das ferramentas. As regras de negócio (por exemplo, como calcular a economia) foram decisões do projeto, confirmadas pela equipe.

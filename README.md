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
- Assinatura Premium (pagamento pela AbacatePay, em Modo Teste): comparação automática e cálculo de economia
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
- **Pagamentos:** AbacatePay (assinaturas e webhooks), em Modo Teste

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
| `/assinatura` | Plano atual, comparação Grátis × Premium e botão de assinar | Sim |
| `/assinatura/obrigado` | Retorno do pagamento: confirma quando o Premium é liberado | Sim |

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

## Assinatura Premium e pagamentos (AbacatePay)

### Respostas rápidas

| Pergunta | Resposta |
|---|---|
| Em qual ambiente está? | **Modo Teste (Dev mode / sandbox)** da AbacatePay. Nenhum pagamento real é feito. A chave de API usada começa com `abc_dev_`. |
| Está em produção? | **Não.** Para cobrar de verdade, a AbacatePay exige a verificação da conta (com CNPJ) e a liberação de cartão e assinaturas. Isso fica como evolução. |
| Houve teste de pagamento? | **Sim**, com pagamento simulado no Modo Teste. Os detalhes estão em "Testes de pagamento realizados". |
| O Premium será mostrado na apresentação? | **Sim**, em Modo Teste, seguindo o roteiro de "Demonstração do Premium". |

### O que é grátis e o que é Premium

| Recurso | Grátis | Premium |
|---|:---:|:---:|
| Catálogo de supermercados e produtos | ✔ | ✔ |
| Listas de compras | ✔ | ✔ |
| Favoritos e seleção de supermercados | ✔ | ✔ |
| Registro de compras e histórico de gastos | ✔ | ✔ |
| Comparação automática da lista entre supermercados | | ✔ |
| Economia realizada e potencial em cada compra | | ✔ |

O bloqueio é feito **no backend**, e não só na tela: a rota de comparação responde `402` com o código `PREMIUM_REQUIRED` para quem não é assinante. O usuário grátis consegue registrar uma compra, mas sem o cálculo de economia (a resposta traz `savings_locked`).

### Plano

- Plano mensal de **R$ 29,90**, cobrado no cartão (valor do produto cadastrado no Modo Teste).
- O produto também tem uma opção anual no painel da AbacatePay, que o aplicativo ainda não oferece.

### Como funciona

1. O usuário grátis abre **Assinatura** e clica em **Assinar o Premium**.
2. O backend cria o checkout da assinatura na AbacatePay e devolve o endereço da página de pagamento.
3. O usuário paga na página da AbacatePay (no Modo Teste, com **Simular Pagamento**) e volta ao Poupay.
4. A AbacatePay avisa o backend por **webhook**. O backend confere o secret e a assinatura do aviso e preenche o campo `premium_until` do usuário.
5. A tela de retorno consulta o plano até ele ficar Premium e mostra "Pagamento confirmado!".

Quem libera o acesso é o webhook, e não o redirecionamento de volta para o site: voltar para a página de retorno não prova que houve pagamento.

### Regra de acesso (`premium_until`)

- O usuário é Premium enquanto `premium_until` estiver no futuro. O plano é lido do banco a cada requisição.
- Cada pagamento confirmado (primeira cobrança ou renovação) libera **1 mês + 3 dias de folga**.
- Se um aviso de renovação nunca chegar, o acesso termina sozinho na data.
- No cancelamento (`subscription.cancelled`), o usuário mantém o acesso até o fim do período já pago.

### Segurança do pagamento

- A chave de API fica só no `backend/.env`, que não vai para o Git. O `backend/.env.example` tem apenas valores de exemplo.
- O webhook confere duas camadas: o **secret** que vai na URL e a **assinatura HMAC-SHA256** do corpo da requisição.
- Eventos repetidos são ignorados (cada evento é registrado uma única vez em `billing_events`).
- Em produção, eventos simulados do Dev mode são ignorados.
- O backend recusa uma chave de produção (`abc_prod_`) fora do ambiente de produção.

### Variáveis de ambiente do pagamento (`backend/.env`)

| Variável | Descrição |
|---|---|
| `ABACATEPAY_API_KEY` | Chave de API da AbacatePay (Modo Teste: `abc_dev_...`) |
| `ABACATEPAY_PRODUCT_ID` | ID (`prod_...`) do produto mensal criado no painel |
| `ABACATEPAY_WEBHOOK_SECRET` | Secret do webhook; precisa ser igual ao cadastrado no painel |
| `ABACATEPAY_HMAC_PUBLIC_KEY` | Chave pública HMAC, publicada na documentação de webhooks da AbacatePay |
| `FRONTEND_URL` | Endereço do frontend, usado nos retornos do pagamento (padrão `http://localhost:3001`) |

### Tabelas

- `users.premium_until`: até quando o acesso Premium vale.
- `billing_subscriptions`: liga o usuário ao checkout e à assinatura da AbacatePay.
- `billing_events`: eventos de webhook já processados.

### Testes de pagamento realizados

- [x] Criação do checkout da assinatura pela API do Poupay (Modo Teste)
- [x] Pagamento simulado na página da AbacatePay e retorno ao Poupay
- [x] Liberação do Premium por aviso assinado, enviado por script (`backend/scripts/simular-webhook.mjs`)
- [x] Proteção contra aviso repetido (script com `--duplicado`): o segundo envio não tem efeito
- [x] Aviso com assinatura inválida é recusado (401)
- [x] Comparação bloqueada para usuário grátis (402) e liberada para Premium
- [ ] Aviso real da AbacatePay chegando por túnel público (preencher: feito ou pendente)

### Como testar localmente

O webhook precisa de um endereço público com HTTPS, e o `localhost` não é público. Há dois caminhos:

1. **Aviso simulado** (sem internet): com o backend rodando, `node scripts/simular-webhook.mjs bill_ID_DO_CHECKOUT`, na pasta `backend`. O ID do checkout está na tabela `billing_subscriptions`. Serve só para desenvolvimento.
2. **Aviso real:** abrir um túnel (`cloudflared tunnel --url http://localhost:3000`), cadastrar no painel da AbacatePay, com o Modo Teste ligado, o webhook `https://ENDERECO_DO_TUNEL/webhooks/abacatepay`, com o mesmo secret do `.env` e os eventos `subscription.completed`, `subscription.renewed` e `subscription.cancelled`. O endereço do túnel muda a cada reinício, e a URL do painel precisa ser atualizada.

Para voltar um usuário ao plano grátis:

```sql
UPDATE users SET premium_until = NULL WHERE email = 'teste@email.com';
```

### Demonstração do Premium

Mostrar o Premium na apresentação, sempre em Modo Teste (nenhum dinheiro é movimentado):

1. Antes, deixar o usuário de demonstração no plano grátis (comando acima) e conferir que banco, backend, frontend e, se usar o aviso real, o túnel estão no ar.
2. Entrar como usuário grátis, abrir uma lista e clicar em **Comparar preços**: aparece o aviso de recurso Premium.
3. Abrir **Assinatura** e mostrar a comparação entre os planos Grátis e Premium.
4. Clicar em **Assinar o Premium**, mostrar a página de pagamento da AbacatePay e usar **Simular Pagamento** (ou o cartão de teste `4242 4242 4242 4242`).
5. Voltar ao Poupay: a tela confirma o pagamento e o plano vira Premium.
6. Abrir a mesma lista e comparar: agora a comparação funciona, com o ranking dos mercados e a divisão item a item.
7. Registrar uma compra e mostrar a economia realizada e a potencial, que só aparecem no Premium.

Plano B, se a internet falhar durante o pagamento: depois de clicar em **Assinar**, rodar `node scripts/simular-webhook.mjs` com o ID do checkout, e o Premium é liberado do mesmo jeito.

### Limitações e próximos passos

- Só funciona em Modo Teste. Ir para produção exige a conta verificada, a liberação de cartão e assinaturas, uma URL fixa para o webhook, a chave de produção, termos de uso e política de privacidade.
- Ainda não há botão de cancelar a assinatura no aplicativo (o cancelamento é tratado quando a AbacatePay avisa).
- Reembolsos, disputas e falhas de cobrança ainda não são tratados.
- O plano anual existe no painel, mas não é oferecido pelo aplicativo.

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
| Clicar em Assinar duas vezes gerou erro: a AbacatePay devolveu o mesmo checkout e o banco recusou o ID repetido | Identificador único por tentativa e gravação que ignora checkout já existente |
| O menu apresentava erro de hidratação do React (servidor e navegador desenhavam o menu de forma diferente) | Hook de login ajustado para mostrar o mesmo estado do servidor durante a hidratação |
| A chave de API da AbacatePay quase foi para o `.env.example` e, assim, para o GitHub | Busca por segredos antes do commit, chave removida do arquivo e substituída por uma nova |

**O que a equipe revisou e validou:** todo o código gerado foi executado e testado manualmente (inclusive casos de erro) e, no backend, por testes automatizados. [Descrevam aqui o que cada integrante revisou ou alterou por conta própria.]

**Limitações da IA nesse processo:** o modelo não enxerga o ambiente de cada máquina, então erros de instalação e de configuração só apareciam ao executar. Parte do código precisou de ajuste por causa de versões novas das ferramentas. As regras de negócio (por exemplo, como calcular a economia) foram decisões do projeto, confirmadas pela equipe.

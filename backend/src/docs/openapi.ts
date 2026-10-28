const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const err = (name: string) => ({ $ref: `#/components/responses/${name}` });

const json = (description: string, schema: object) => ({
  description,
  content: { 'application/json': { schema } },
});

const body = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const pathId = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const pathItemId = { name: 'itemId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const query = (name: string, description: string) => ({
  name, in: 'query', required: false, description, schema: { type: 'string' },
});
const auth = [{ bearerAuth: [] }];
const noContent = { description: 'Removido com sucesso' };

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Poupay API',
    version: '1.0.0',
    description:
      'API da plataforma Poupay, de comparação de preços de supermercados. ' +
      'Para testar rotas protegidas: faça login em /auth/login, copie o token, ' +
      'clique em "Authorize" e cole só o token.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Auth' },
    { name: 'Supermercados' },
    { name: 'Produtos' },
    { name: 'Preços' },
    { name: 'Listas de compras' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      BadRequest: json('Dados inválidos', ref('Error')),
      Unauthorized: json('Token ausente, inválido ou expirado (ou credenciais incorretas)', ref('Error')),
      NotFound: json('Recurso não encontrado', ref('Error')),
      Conflict: json('Conflito: o registro já existe', ref('Error')),
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      LoginResult: {
        type: 'object',
        properties: { token: { type: 'string' }, user: ref('User') },
      },
      MarketInput: {
        type: 'object',
        required: ['name', 'city'],
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
        },
      },
      Market: {
        allOf: [ref('MarketInput'), { type: 'object', properties: { id: { type: 'integer' } } }],
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'category', 'unit', 'size'],
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          category: { type: 'string' },
          unit: { type: 'string', enum: ['un', 'g', 'kg', 'ml', 'l'] },
          size: { type: 'number', exclusiveMinimum: 0 },
        },
      },
      Product: {
        allOf: [ref('ProductInput'), { type: 'object', properties: { id: { type: 'integer' } } }],
      },
      PriceInput: {
        type: 'object',
        required: ['market_id', 'product_id', 'price'],
        properties: {
          market_id: { type: 'integer' },
          product_id: { type: 'integer' },
          price: { type: 'number', exclusiveMinimum: 0 },
          is_promotion: { type: 'boolean' },
          is_available: { type: 'boolean' },
          source: { type: 'string', enum: ['manual', 'test', 'user', 'integration'] },
        },
      },
      Price: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          market_id: { type: 'integer' },
          product_id: { type: 'integer' },
          price: { type: 'string', example: '24.90', description: 'Texto, para preservar a precisão' },
          is_promotion: { type: 'boolean' },
          is_available: { type: 'boolean' },
          source: { type: 'string' },
          recorded_at: { type: 'string', format: 'date-time' },
        },
      },
      ListInput: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
      ShoppingList: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          name: { type: 'string' },
          item_count: { type: 'integer' },
          items: { type: 'array', items: ref('ListItem') },
        },
      },
      ListItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          product_id: { type: 'integer' },
          name: { type: 'string' },
          quantity: { type: 'integer' },
          is_purchased: { type: 'boolean' },
        },
      },
      AddItemInput: {
        type: 'object',
        required: ['product_id'],
        properties: {
          product_id: { type: 'integer' },
          quantity: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
        },
      },
      UpdateItemInput: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 1, maximum: 1000 },
          is_purchased: { type: 'boolean' },
        },
      },
      CompareInput: {
        type: 'object',
        properties: {
          market_ids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Supermercados a comparar. Se omitido, compara todos.',
          },
        },
      },
      CompareResult: {
        type: 'object',
        description:
          'single_market: total da lista em cada mercado (mercados completos primeiro). ' +
          'best_single_market: melhor mercado completo, ou null. ' +
          'split_by_product: o mais barato de cada item, com a economia extra em relação ao melhor mercado único.',
        properties: {
          list: { type: 'object' },
          compared_markets: { type: 'integer' },
          single_market: { type: 'array', items: { type: 'object' } },
          best_single_market: { type: 'object', nullable: true },
          split_by_product: { type: 'object' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Cadastrar usuário',
        requestBody: body(ref('RegisterInput')),
        responses: { 201: json('Usuário criado', ref('User')), 400: err('BadRequest'), 409: err('Conflict') },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Fazer login e receber o token',
        requestBody: body(ref('LoginInput')),
        responses: { 200: json('Login realizado', ref('LoginResult')), 400: err('BadRequest'), 401: err('Unauthorized') },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Dados do usuário logado', security: auth,
        responses: { 200: json('Usuário', ref('User')), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },

    '/markets': {
      get: {
        tags: ['Supermercados'], summary: 'Listar supermercados',
        parameters: [query('search', 'Busca por nome ou cidade')],
        responses: { 200: json('Lista', { type: 'array', items: ref('Market') }) },
      },
      post: {
        tags: ['Supermercados'], summary: 'Cadastrar supermercado', security: auth,
        requestBody: body(ref('MarketInput')),
        responses: { 201: json('Criado', ref('Market')), 400: err('BadRequest'), 401: err('Unauthorized') },
      },
    },
    '/markets/{id}': {
      get: {
        tags: ['Supermercados'], summary: 'Consultar um supermercado', parameters: [pathId],
        responses: { 200: json('Supermercado', ref('Market')), 400: err('BadRequest'), 404: err('NotFound') },
      },
      patch: {
        tags: ['Supermercados'], summary: 'Atualizar supermercado', security: auth, parameters: [pathId],
        requestBody: body(ref('MarketInput')),
        responses: { 200: json('Atualizado', ref('Market')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
      delete: {
        tags: ['Supermercados'], summary: 'Excluir supermercado', security: auth, parameters: [pathId],
        responses: { 204: noContent, 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },
    '/markets/{id}/prices': {
      get: {
        tags: ['Preços'], summary: 'Preços atuais de um supermercado (o mais recente de cada produto)', parameters: [pathId],
        responses: { 200: json('Preços', { type: 'array', items: { type: 'object' } }), 400: err('BadRequest'), 404: err('NotFound') },
      },
    },

    '/products': {
      get: {
        tags: ['Produtos'], summary: 'Listar produtos com filtros',
        parameters: [
          query('search', 'Busca por nome ou marca'),
          query('category', 'Filtro por categoria'),
          query('brand', 'Filtro por marca'),
        ],
        responses: { 200: json('Lista', { type: 'array', items: ref('Product') }) },
      },
      post: {
        tags: ['Produtos'], summary: 'Cadastrar produto', security: auth,
        requestBody: body(ref('ProductInput')),
        responses: { 201: json('Criado', ref('Product')), 400: err('BadRequest'), 401: err('Unauthorized') },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Produtos'], summary: 'Consultar um produto', parameters: [pathId],
        responses: { 200: json('Produto', ref('Product')), 400: err('BadRequest'), 404: err('NotFound') },
      },
      patch: {
        tags: ['Produtos'], summary: 'Atualizar produto', security: auth, parameters: [pathId],
        requestBody: body(ref('ProductInput')),
        responses: { 200: json('Atualizado', ref('Product')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
      delete: {
        tags: ['Produtos'], summary: 'Excluir produto', security: auth, parameters: [pathId],
        responses: { 204: noContent, 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },
    '/products/{id}/prices': {
      get: {
        tags: ['Preços'], summary: 'Preço atual de um produto em cada mercado, do mais barato ao mais caro', parameters: [pathId],
        responses: { 200: json('Preços', { type: 'array', items: { type: 'object' } }), 400: err('BadRequest'), 404: err('NotFound') },
      },
    },

    '/prices': {
      post: {
        tags: ['Preços'], summary: 'Registrar um preço (o histórico é preservado)', security: auth,
        requestBody: body(ref('PriceInput')),
        responses: { 201: json('Registrado', ref('Price')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },

    '/shopping-lists': {
      get: {
        tags: ['Listas de compras'], summary: 'Listar as listas do usuário', security: auth,
        responses: { 200: json('Listas', { type: 'array', items: ref('ShoppingList') }), 401: err('Unauthorized') },
      },
      post: {
        tags: ['Listas de compras'], summary: 'Criar lista', security: auth,
        requestBody: body(ref('ListInput')),
        responses: { 201: json('Criada', ref('ShoppingList')), 400: err('BadRequest'), 401: err('Unauthorized') },
      },
    },
    '/shopping-lists/{id}': {
      get: {
        tags: ['Listas de compras'], summary: 'Ver lista com os itens', security: auth, parameters: [pathId],
        responses: { 200: json('Lista', ref('ShoppingList')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
      patch: {
        tags: ['Listas de compras'], summary: 'Renomear lista', security: auth, parameters: [pathId],
        requestBody: body(ref('ListInput')),
        responses: { 200: json('Atualizada', ref('ShoppingList')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
      delete: {
        tags: ['Listas de compras'], summary: 'Excluir lista', security: auth, parameters: [pathId],
        responses: { 204: noContent, 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },
    '/shopping-lists/{id}/items': {
      post: {
        tags: ['Listas de compras'], summary: 'Adicionar produto à lista', security: auth, parameters: [pathId],
        requestBody: body(ref('AddItemInput')),
        responses: { 201: json('Item adicionado', ref('ListItem')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound'), 409: err('Conflict') },
      },
    },
    '/shopping-lists/{id}/items/{itemId}': {
      patch: {
        tags: ['Listas de compras'], summary: 'Alterar quantidade ou marcar como comprado', security: auth,
        parameters: [pathId, pathItemId],
        requestBody: body(ref('UpdateItemInput')),
        responses: { 200: json('Atualizado', ref('ListItem')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
      delete: {
        tags: ['Listas de compras'], summary: 'Remover item da lista', security: auth,
        parameters: [pathId, pathItemId],
        responses: { 204: noContent, 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },
    '/shopping-lists/{id}/compare': {
      post: {
        tags: ['Listas de compras'],
        summary: 'Comparar o custo da lista entre supermercados',
        description:
          'Mercados sem preço para algum item ficam marcados como incompletos e nunca vencem a comparação. ' +
          'Preços com mais de 30 dias geram aviso de desatualizado.',
        security: auth, parameters: [pathId],
        requestBody: { required: false, content: { 'application/json': { schema: ref('CompareInput') } } },
        responses: { 200: json('Comparação', ref('CompareResult')), 400: err('BadRequest'), 401: err('Unauthorized'), 404: err('NotFound') },
      },
    },
  },
};
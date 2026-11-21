-- Dados de demonstração (fictícios) do Poupay.
-- ATENÇÃO: este script APAGA o catálogo atual (supermercados e produtos) e tudo que
-- depende dele: preços, itens das listas, favoritos, seleção e compras.
-- Usuários, listas e assinaturas são mantidos. Use só em desenvolvimento e demonstração.

SET client_encoding = 'UTF8';

BEGIN;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

TRUNCATE TABLE markets, products RESTART IDENTITY CASCADE;

-- Supermercados (ids 1 a 4, nesta ordem)
INSERT INTO markets (name, address, city, latitude, longitude, image_url) VALUES
  ('Mercado Quintal Verde',    'Rua das Palmeiras, 120',   'Bauru', -22.3201, -49.0702, '/images/markets/quintal-verde.png'),
  ('Supermercado Pé de Milho', 'Avenida do Comércio, 845', 'Bauru', -22.3123, -49.0555, '/images/markets/pe-de-milho.png'),
  ('Empório Casa Nova',        'Rua dos Ipês, 56',         'Bauru', -22.3304, -49.0641, '/images/markets/casa-nova.png'),
  ('Mercadão Vila Feliz',      'Avenida Central, 2300',    'Bauru', -22.2987, -49.0489, '/images/markets/vila-feliz.png');

-- Produtos (ids 1 a 16, nesta ordem)
INSERT INTO products (name, brand, category, unit, size, image_url) VALUES
  ('Arroz Tipo 1',                 'Grãos do Vale',  'Grãos',      'kg', 5,   '/images/products/arroz-tipo-1.png'),
  ('Feijão Carioca',               'Grãos do Vale',  'Grãos',      'kg', 1,   '/images/products/feijao-carioca.png'),
  ('Macarrão Espaguete',           'Massa Boa',      'Massas',     'g',  500, '/images/products/macarrao-espaguete.png'),
  ('Açúcar Cristal',               'Doce Campo',     'Mercearia',  'kg', 1,   '/images/products/acucar-cristal.png'),
  ('Café Torrado e Moído',         'Aroma da Serra', 'Mercearia',  'g',  500, '/images/products/cafe-torrado.png'),
  ('Óleo de Soja',                 'Sol Dourado',    'Mercearia',  'ml', 900, '/images/products/oleo-de-soja.png'),
  ('Leite Integral',               'Fazenda Bela',   'Laticínios', 'l',  1,   '/images/products/leite-integral.png'),
  ('Manteiga com Sal',             'Fazenda Bela',   'Laticínios', 'g',  200, '/images/products/manteiga-com-sal.png'),
  ('Pão de Forma',                 'Pão Fofo',       'Padaria',    'g',  500, '/images/products/pao-de-forma.png'),
  ('Suco de Laranja',              'Pomar Real',     'Bebidas',    'l',  1,   '/images/products/suco-de-laranja.png'),
  ('Refrigerante de Limão',        'Borbulha',       'Bebidas',    'l',  2,   '/images/products/refrigerante-de-limao.png'),
  ('Shampoo Brilho Natural',       'Flor de Seda',   'Higiene',    'ml', 350, '/images/products/shampoo-brilho-natural.png'),
  ('Condicionador Brilho Natural', 'Flor de Seda',   'Higiene',    'ml', 350, '/images/products/condicionador-brilho-natural.png'),
  ('Sabonete em Barra',            'Flor de Seda',   'Higiene',    'g',  90,  '/images/products/sabonete-em-barra.png'),
  ('Creme Dental',                 'Sorriso Fresco', 'Higiene',    'g',  90,  '/images/products/creme-dental.png'),
  ('Detergente Líquido',           'Lar Limpo',      'Limpeza',    'ml', 500, '/images/products/detergente-liquido.png');

-- Preços: (mercado, produto, preço, promoção?, dias atrás)
INSERT INTO market_prices (market_id, product_id, price, is_promotion, source, recorded_at)
SELECT v.market_id, v.product_id, v.price, v.promo, 'test', NOW() - (v.days_ago * INTERVAL '1 day')
FROM (VALUES
  -- 1: Quintal Verde (arroz já teve outro preço há 20 dias: o histórico é preservado)
  (1,  1, 28.90, false, 20),
  (1,  1, 26.90, false,  2), (1,  2,  8.49, false,  2), (1,  3,  4.79, false,  2),
  (1,  4,  4.99, false,  2), (1,  5, 18.90, false,  2), (1,  6,  7.99, false,  2),
  (1,  7,  5.29, false,  2), (1,  8, 11.90, false,  2), (1,  9,  7.99, false,  2),
  (1, 10,  6.99, true,   1), (1, 11,  8.49, false,  2), (1, 12, 18.90, false,  2),
  (1, 13, 21.50, false,  2), (1, 14,  2.99, false,  2), (1, 15,  4.99, false,  2),
  (1, 16,  2.89, false,  2),
  -- 2: Pé de Milho (sem preço de Creme Dental)
  (2,  1, 24.50, false,  3), (2,  2,  7.99, false,  3), (2,  3,  4.49, false,  3),
  (2,  4,  4.69, false,  3), (2,  5, 19.50, false,  3), (2,  6,  7.49, false,  3),
  (2,  7,  4.99, false,  3), (2,  8, 12.50, false,  3), (2,  9,  8.49, false,  3),
  (2, 10,  6.49, false,  3), (2, 11,  7.99, false,  3), (2, 12, 17.90, false,  3),
  (2, 13, 22.90, false,  3), (2, 14,  2.79, false,  3), (2, 16,  2.69, false,  3),
  -- 3: Casa Nova (o preço do café tem 45 dias: aparece como desatualizado)
  (3,  1, 27.80, false,  4), (3,  2,  8.90, false,  4), (3,  3,  5.20, false,  4),
  (3,  4,  5.10, false,  4), (3,  5, 17.90, false, 45), (3,  6,  8.29, false,  4),
  (3,  7,  5.49, false,  4), (3,  8, 10.90, false,  4), (3,  9,  7.49, false,  4),
  (3, 10,  7.29, false,  4), (3, 11,  8.99, false,  4), (3, 12, 19.90, false,  4),
  (3, 13, 20.90, false,  4), (3, 14,  3.19, false,  4), (3, 15,  5.29, false,  4),
  (3, 16,  2.99, false,  4),
  -- 4: Vila Feliz (sem preço de Manteiga)
  (4,  1, 25.90, false,  1), (4,  2,  8.29, false,  1), (4,  3,  4.59, false,  1),
  (4,  4,  4.79, false,  1), (4,  5, 18.50, false,  1), (4,  6,  7.69, false,  1),
  (4,  7,  5.19, false,  1), (4,  9,  8.19, false,  1), (4, 10,  6.79, false,  1),
  (4, 11,  7.89, true,   1), (4, 12, 18.50, false,  1), (4, 13, 21.90, false,  1),
  (4, 14,  2.89, false,  1), (4, 15,  4.79, false,  1), (4, 16,  2.79, false,  1)
) AS v(market_id, product_id, price, promo, days_ago);

COMMIT;

SELECT 'supermercados' AS tabela, COUNT(*) AS total FROM markets
UNION ALL SELECT 'produtos', COUNT(*) FROM products
UNION ALL SELECT 'precos', COUNT(*) FROM market_prices;
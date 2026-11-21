-- Exemplos de DML (INSERT, UPDATE e DELETE) com transações - Poupay

\echo '=== 1. INSERT ==='
BEGIN;
INSERT INTO markets (name, address, city, latitude, longitude)
VALUES ('Mercado Exemplo DML', 'Rua do Teste, 100', 'Bauru', -22.3150, -49.0600)
RETURNING id, name, address, city;
COMMIT;

\echo 'Conferindo o registro depois do COMMIT:'
SELECT id, name, address, city FROM markets WHERE name = 'Mercado Exemplo DML';


\echo '=== 2. UPDATE ==='
\echo 'Antes:'
SELECT id, name, address FROM markets WHERE name = 'Mercado Exemplo DML';

BEGIN;
UPDATE markets
SET address = 'Avenida do Teste, 200', updated_at = NOW()
WHERE name = 'Mercado Exemplo DML'
RETURNING id, name, address;
COMMIT;

\echo 'Depois:'
SELECT id, name, address FROM markets WHERE name = 'Mercado Exemplo DML';


\echo '=== 3. DELETE ==='
BEGIN;
DELETE FROM markets
WHERE name = 'Mercado Exemplo DML'
RETURNING id, name;
COMMIT;

\echo 'Conferindo (deve ser 0):'
SELECT COUNT(*) AS mercados_exemplo_restantes FROM markets WHERE name = 'Mercado Exemplo DML';


\echo '=== 4. TRANSACAO COM ROLLBACK (o DELETE e desfeito) ==='
\echo 'Precos do Mercado Quintal Verde antes:'
SELECT COUNT(*) AS precos FROM market_prices
WHERE market_id = (SELECT id FROM markets WHERE name = 'Mercado Quintal Verde');

BEGIN;
DELETE FROM market_prices
WHERE market_id = (SELECT id FROM markets WHERE name = 'Mercado Quintal Verde');

\echo 'Dentro da transacao, depois do DELETE:'
SELECT COUNT(*) AS precos FROM market_prices
WHERE market_id = (SELECT id FROM markets WHERE name = 'Mercado Quintal Verde');
ROLLBACK;

\echo 'Depois do ROLLBACK (voltou ao valor de antes):'
SELECT COUNT(*) AS precos FROM market_prices
WHERE market_id = (SELECT id FROM markets WHERE name = 'Mercado Quintal Verde');


\echo '=== 5. TRANSACAO COM ERRO (tudo ou nada) ==='
BEGIN;
INSERT INTO markets (name, city) VALUES ('Mercado Que Nao Deve Existir', 'Bauru');
-- Este INSERT falha: o mercado e o produto 999999 nao existem
INSERT INTO market_prices (market_id, product_id, price) VALUES (999999, 999999, 10.00);
ROLLBACK;

\echo 'O primeiro INSERT tambem foi desfeito (deve ser 0):'
SELECT COUNT(*) AS mercados_criados FROM markets WHERE name = 'Mercado Que Nao Deve Existir';
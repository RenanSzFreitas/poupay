import { describe, it, expect } from 'vitest';
import { buildComparison, type Row } from './comparison.service';

const NOW = new Date('2026-10-28T12:00:00Z');
const list = { id: 1, name: 'Lista de teste' };

function row(overrides: Partial<Row>): Row {
  return {
    market_id: 1,
    market_name: 'Mercado A',
    product_id: 1,
    product_name: 'Arroz',
    quantity: 1,
    price: '10.00',
    is_available: true,
    is_promotion: false,
    recorded_at: new Date('2026-10-20T12:00:00Z'),
    ...overrides,
  };
}

// Mercado A não tem leite. Mercado B tem tudo.
function cenarioBase(): Row[] {
  return [
    row({ market_id: 1, market_name: 'Mercado A', product_id: 1, product_name: 'Arroz', quantity: 1, price: '24.90' }),
    row({ market_id: 1, market_name: 'Mercado A', product_id: 2, product_name: 'Feijao', quantity: 2, price: '8.00' }),
    row({ market_id: 1, market_name: 'Mercado A', product_id: 3, product_name: 'Leite', quantity: 3, price: null, is_available: null, is_promotion: null, recorded_at: null }),
    row({ market_id: 2, market_name: 'Mercado B', product_id: 1, product_name: 'Arroz', quantity: 1, price: '22.50' }),
    row({ market_id: 2, market_name: 'Mercado B', product_id: 2, product_name: 'Feijao', quantity: 2, price: '9.50' }),
    row({ market_id: 2, market_name: 'Mercado B', product_id: 3, product_name: 'Leite', quantity: 3, price: '5.00' }),
  ];
}

describe('buildComparison', () => {
  it('soma o total de cada mercado multiplicando pela quantidade', () => {
    const r = buildComparison(list, cenarioBase(), NOW);
    const b = r.single_market.find((m) => m.market_name === 'Mercado B');
    expect(b?.total).toBe('56.50');
  });

  it('coloca o mercado completo na frente, mesmo com total maior que o incompleto', () => {
    const r = buildComparison(list, cenarioBase(), NOW);
    expect(r.single_market[0].market_name).toBe('Mercado B');
    expect(r.single_market[1].market_name).toBe('Mercado A');
    expect(r.single_market[1].total).toBe('40.90');
    expect(r.best_single_market?.market_name).toBe('Mercado B');
  });

  it('marca o mercado sem preço para um item como incompleto, sem inventar valor', () => {
    const r = buildComparison(list, cenarioBase(), NOW);
    const a = r.single_market.find((m) => m.market_name === 'Mercado A');
    expect(a?.complete).toBe(false);
    expect(a?.missing_count).toBe(1);

    const leite = (a?.items as any[]).find((i) => i.name === 'Leite');
    expect(leite.status).toBe('sem_preco');
    expect(leite.unit_price).toBeNull();
    expect(leite.subtotal).toBeNull();
  });

  it('trata produto indisponível como item faltando', () => {
    const r = buildComparison(
      list,
      [row({ price: '5.00', is_available: false })],
      NOW
    );
    expect(r.single_market[0].missing_count).toBe(1);
    expect((r.single_market[0].items as any[])[0].status).toBe('indisponivel');
    expect(r.single_market[0].total).toBe('0.00');
  });

  it('calcula o menor preço por produto e a economia em relação ao melhor mercado único', () => {
    const r = buildComparison(list, cenarioBase(), NOW);
    expect(r.split_by_product.total).toBe('53.50');
    expect(r.split_by_product.potential_extra_savings).toBe('3.00');

    const feijao = (r.split_by_product.items as any[]).find((i) => i.name === 'Feijao');
    expect(feijao.market_name).toBe('Mercado A');
  });

  it('soma em centavos, sem erro de arredondamento (0,10 + 0,20 = 0,30)', () => {
    const r = buildComparison(
      list,
      [
        row({ product_id: 1, product_name: 'Item 1', price: '0.10' }),
        row({ product_id: 2, product_name: 'Item 2', price: '0.20' }),
      ],
      NOW
    );
    expect(r.single_market[0].total).toBe('0.30');
  });

  it('avisa quando o preço tem mais de 30 dias', () => {
    const antigo = buildComparison(
      list,
      [row({ recorded_at: new Date('2026-08-01T12:00:00Z') })],
      NOW
    );
    expect(antigo.single_market[0].has_stale_prices).toBe(true);

    const recente = buildComparison(list, [row({})], NOW);
    expect(recente.single_market[0].has_stale_prices).toBe(false);
  });

  it('lista produtos sem preço em nenhum mercado e não declara vencedor', () => {
    const r = buildComparison(
      list,
      [
        row({ market_id: 1, market_name: 'Mercado A', price: null, is_available: null, recorded_at: null }),
        row({ market_id: 2, market_name: 'Mercado B', price: null, is_available: null, recorded_at: null }),
      ],
      NOW
    );
    expect(r.split_by_product.without_price).toHaveLength(1);
    expect(r.best_single_market).toBeNull();
    expect(r.split_by_product.potential_extra_savings).toBeNull();
  });
});
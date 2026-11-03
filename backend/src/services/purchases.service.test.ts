import { describe, it, expect } from 'vitest';
import { withSavings } from './purchases.service';

function compra(overrides: object) {
  return {
    total_paid: '53.50',
    reference_highest_total: '56.50',
    reference_lowest_total: '50.00',
    reference_market_count: 2,
    ...overrides,
  };
}

describe('withSavings', () => {
  it('calcula a economia realizada (contra o mais caro) e a potencial (contra o mais barato)', () => {
    const r = withSavings(compra({}));
    expect(r.realized_savings).toBe('3.00');
    expect(r.potential_savings).toBe('3.50');
  });

  it('não deixa a economia potencial ficar negativa quando pagou menos que o mais barato', () => {
    const r = withSavings(compra({ total_paid: '48.00' }));
    expect(r.potential_savings).toBe('0.00');
    expect(r.realized_savings).toBe('8.50');
  });

  it('mostra economia realizada negativa quando pagou mais que o mais caro', () => {
    const r = withSavings(compra({ total_paid: '60.00' }));
    expect(r.realized_savings).toBe('-3.50');
    expect(r.potential_savings).toBe('10.00');
  });

  it('não inventa economia quando há menos de 2 mercados com a cesta completa', () => {
    const r = withSavings(compra({ reference_market_count: 1 }));
    expect(r.realized_savings).toBeNull();
    expect(r.potential_savings).toBeNull();
  });

  it('não inventa economia quando não há nenhum mercado de referência', () => {
    const r = withSavings(
      compra({ reference_market_count: 0, reference_highest_total: null, reference_lowest_total: null })
    );
    expect(r.realized_savings).toBeNull();
    expect(r.potential_savings).toBeNull();
  });
});
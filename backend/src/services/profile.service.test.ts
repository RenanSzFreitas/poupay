import { describe, it, expect } from 'vitest';
import { isValidCpf, onlyDigits } from './profile.service';

describe('isValidCpf', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('recusa sequências repetidas e tamanho errado', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('1234567890')).toBe(false);
  });
});

describe('onlyDigits', () => {
  it('remove a máscara', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
  });
});

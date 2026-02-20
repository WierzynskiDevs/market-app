import { useEffect, useState } from 'react';

/** Atraso recomendado para busca (ms) — só filtra após o usuário parar de digitar. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Retorna o valor apenas após `delayMs` ms sem alteração (debounce).
 * Útil para busca: evita filtrar a cada tecla e reduz travamentos.
 * @param value Valor atual (ex: texto do input)
 * @param delayMs Atraso em ms (ex: SEARCH_DEBOUNCE_MS)
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

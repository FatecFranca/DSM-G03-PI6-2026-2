export function formatarDataBrasil(
  dataISO: string,
  options: {
    includeTime?: boolean;
    includeSeconds?: boolean;
  } = {}
): string {
  if (!dataISO) return ''

  const { includeTime = true, includeSeconds = false } = options

  try {
    let data = new Date(dataISO)
    
    // ✅ Se a data tem 'Z', significa que está em UTC, então ajustamos
    if (dataISO.includes('Z')) {
      data = new Date(data.getTime() + (data.getTimezoneOffset() * 60000)) // Somar pois no BD já está no formato Brasil
    }
    
    if (isNaN(data.getTime())) return ''

    const formatOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }

    if (includeTime) {
      formatOptions.hour = '2-digit'
      formatOptions.minute = '2-digit'
      if (includeSeconds) {
        formatOptions.second = '2-digit'
      }
    }

    return data.toLocaleString('pt-BR', formatOptions)
  } catch {
    return dataISO
  }
}

// Formata número decimal com vírgula
export function formatarDecimal(valor: number | null | undefined, casas: number = 2): string {
  if (valor === null || valor === undefined) return 'N/A';
  return valor.toFixed(casas).replace('.', ',');
}

// Converte número em letra(s) do alfabeto no estilo "coluna de planilha"
// 0 → A, 1 → B, ..., 25 → Z, 26 → AA, 27 → AB, ...
export function numeroParaLetra(numero: number): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const base = letras.length; // 26

  if (numero < 0) {
    return `?${numero}`; // Fallback para números negativos
  }

  let resultado = '';
  let n = numero;

  // Sistema "bijective base-26" (A=1, B=2, ..., Z=26, AA=27, ...)
  // Como aqui A=0, fazemos o ajuste somando 1 antes de cada divisão.
  n = n + 1;

  while (n > 0) {
    const resto = (n - 1) % base;
    resultado = letras[resto] + resultado;
    n = Math.floor((n - 1) / base);
  }

  return resultado;
}
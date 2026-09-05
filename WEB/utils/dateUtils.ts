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
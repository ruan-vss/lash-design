const DANGEROUS_SPREADSHEET_PREFIX = /^[-=+@\t\r]/;

const neutralizeSpreadsheetFormula = (value) => {
  const text = String(value);
  // CSV aberto em Excel/Sheets pode executar fórmulas mesmo com a célula entre aspas.
  // Prefixo com apóstrofo força interpretação como texto.
  return DANGEROUS_SPREADSHEET_PREFIX.test(text) ? `'${text}` : text;
};

export const buildCsvBuffer = (headers, rows) => {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const safe = neutralizeSpreadsheetFormula(val).replace(/"/g, '""');
    return `"${safe}"`;
  };

  const headerLine = headers.map((h) => escapeCell(h.label)).join(';');
  const dataLines = rows.map((row) => headers.map((h) => escapeCell(row[h.key])).join(';'));
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  return Buffer.from(csvContent, 'utf-8');
};

/**
 * Serializa alterações de agenda por data usando advisory locks transacionais do PostgreSQL.
 * Isso evita corrida quando ainda não existe nenhuma reserva no dia (caso em que FOR UPDATE
 * sobre linhas existentes não protegeria o intervalo vazio).
 */
export const lockScheduleDates = async (db, dates) => {
  const uniqueDates = [...new Set((Array.isArray(dates) ? dates : [dates]).filter(Boolean))].sort();
  for (const date of uniqueDates) {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [String(date)]);
  }
};

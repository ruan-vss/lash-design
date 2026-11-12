// Guarda o token de acesso da cliente em sessionStorage (some ao fechar a aba)
// para que ele não permaneça na URL, no histórico nem em links compartilhados.
const key = (id) => `@LashSaaS:bt:${id}`;

export const saveBookingToken = (id, token) => {
  if (!id || !token) return;
  try { sessionStorage.setItem(key(id), token); } catch { /* storage indisponível */ }
};

export const readBookingToken = (id) => {
  if (!id) return null;
  try { return sessionStorage.getItem(key(id)); } catch { return null; }
};

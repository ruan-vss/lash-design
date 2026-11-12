import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { saveBookingToken, readBookingToken } from '../utils/bookingToken';

/**
 * Lê o token da querystring (link legado/redirect), guarda em sessionStorage
 * e remove da URL. Retorna o token para uso nas chamadas à API.
 */
export const useBookingToken = (bookingId) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlToken = searchParams.get('token');

  // Salva de forma síncrona para a primeira chamada à API já enxergar o token.
  const token = useMemo(() => {
    if (urlToken) saveBookingToken(bookingId, urlToken);
    return urlToken || readBookingToken(bookingId);
  }, [bookingId, urlToken]);

  useEffect(() => {
    if (urlToken) {
      const next = new URLSearchParams(searchParams);
      next.delete('token');
      setSearchParams(next, { replace: true });
    }
  }, [urlToken, searchParams, setSearchParams]);

  return token;
};

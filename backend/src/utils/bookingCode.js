import crypto from 'crypto';

// 64 bits aleatórios: muito mais resistente a enumeração/colisão que códigos de 4 dígitos.
export const generateBookingCode = () => `LASH-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

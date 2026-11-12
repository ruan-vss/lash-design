import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBookingCode } from '../src/utils/bookingCode.js';
import { hasTimeOverlap } from '../src/utils/timeUtils.js';

test('códigos de reserva são longos e não triviais', () => {
  const codes = new Set(Array.from({ length: 250 }, () => generateBookingCode()));
  assert.equal(codes.size, 250);
  for (const code of codes) assert.match(code, /^LASH-[A-F0-9]{16}$/);
});

test('detecção de conflito considera intervalos adjacentes como não sobrepostos', () => {
  assert.equal(hasTimeOverlap('10:00', '11:00', '10:30', '11:30'), true);
  assert.equal(hasTimeOverlap('10:00', '11:00', '11:00', '12:00'), false);
});

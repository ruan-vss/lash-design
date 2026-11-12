import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTransition } from '../src/controllers/adminBookingController.js';

test('transições normais permitidas', () => {
  assert.equal(resolveTransition('PENDING_APPROVAL', 'CONFIRMED', 'RECEPTIONIST').ok, true);
  assert.equal(resolveTransition('CONFIRMED', 'COMPLETED', 'PROFESSIONAL').ok, true);
  assert.equal(resolveTransition('CANCELLED', 'PENDING_APPROVAL', 'ADMIN').ok, true);
});

test('bloqueia transições inválidas', () => {
  const r = resolveTransition('CANCELLED', 'COMPLETED', 'ADMIN');
  assert.equal(r.ok, false);
  assert.equal(r.status, 409);
  assert.equal(resolveTransition('PENDING_APPROVAL', 'COMPLETED', 'ADMIN').ok, false);
  assert.equal(resolveTransition('NO_SHOW', 'PENDING_APPROVAL', 'ADMIN').ok, false);
});

test('estados finais: só ADMIN corrige para CONFIRMED', () => {
  assert.equal(resolveTransition('COMPLETED', 'CONFIRMED', 'ADMIN').kind, 'CORRECTION');
  const denied = resolveTransition('COMPLETED', 'CONFIRMED', 'RECEPTIONIST');
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);
  assert.equal(resolveTransition('NO_SHOW', 'CONFIRMED', 'PROFESSIONAL').ok, false);
});

test('mesmo status é permitido (edição de notas)', () => {
  assert.equal(resolveTransition('COMPLETED', 'COMPLETED', 'RECEPTIONIST').ok, true);
});

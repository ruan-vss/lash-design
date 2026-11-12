import test from 'node:test';
import assert from 'node:assert/strict';
import { adminSchemas } from '../src/validators/apiValidators.js';

test('filtros vazios de reservas são tratados como não informados', () => {
  const parsed = adminSchemas.listBookings.query.safeParse({
    status: '',
    date: '',
    viewMode: '',
    page: '1',
    limit: '15',
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.status, undefined);
  assert.equal(parsed.data.date, undefined);
  assert.equal(parsed.data.viewMode, undefined);
});

test('filtros vazios do financeiro são tratados como não informados', () => {
  const parsed = adminSchemas.transactions.query.safeParse({
    method: '',
    status: '',
    page: '1',
    limit: '20',
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.method, undefined);
  assert.equal(parsed.data.status, undefined);
});

test('datas vazias de relatórios são tratadas como não informadas', () => {
  const parsed = adminSchemas.reports.query.safeParse({ startDate: '', endDate: '' });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.startDate, undefined);
  assert.equal(parsed.data.endDate, undefined);
});

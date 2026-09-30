import test from 'node:test'
import assert from 'node:assert/strict'
import { amountInCents, reviewInstallments } from '../src/utils/cuotas.ts'
const row = (amount, dueDate = '2026-10-30') => ({ id: amount, amount, dueDate })
test('suma cuotas sin errores de precisión decimal', () => {
  assert.deepEqual(reviewInstallments([row('0.10'), row('0.20')], '2026-09-30', 0.3).errors, [])
  assert.equal(amountInCents('12,50'), 1250)
})
test('detecta importes faltantes y exceso', () => {
  assert.equal(reviewInstallments([row('50')], '2026-09-30', 100).differenceCents, 5000)
  assert.equal(reviewInstallments([row('101')], '2026-09-30', 100).differenceCents, -100)
})
test('rechaza importes negativos, vacíos y más de dos decimales', () => {
  for (const amount of ['-1', '', '1.001', 'NaN', '1e2']) assert.equal(amountInCents(amount), null)
  assert.ok(reviewInstallments([row('0')], '2026-09-30', 100).errors.length)
})
test('valida vencimiento real y posterior o igual a emisión', () => {
  for (const date of ['', '2026-02-30', '2026-09-29']) {
    assert.ok(reviewInstallments([row('100', date)], '2026-09-30', 100).errors.some(e => e.startsWith('Cuota 1:')))
  }
  assert.deepEqual(reviewInstallments([row('100', '2026-09-30')], '2026-09-30', 100).errors, [])
})
test('borrador antiguo sin cuotas necesita completar cronograma', () => {
  assert.ok(reviewInstallments([], '2026-09-30', 100).errors.includes('Agrega al menos una cuota.'))
})

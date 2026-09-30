import test from 'node:test'
import assert from 'node:assert/strict'
import { draftSnapshot } from '../src/utils/draftSnapshot.ts'
test('ignora el orden de claves JSONB también en ítems y cuotas', () => {
  const before = { items: [{ quantity: 2, unitPrice: 10 }], installments: [{ amount: '20', dueDate: '2026-10-01' }] }
  const after = { installments: [{ dueDate: '2026-10-01', amount: '20' }], items: [{ unitPrice: 10, quantity: 2 }] }
  assert.equal(draftSnapshot(before), draftSnapshot(after))
})
test('detecta cambios de importes y orden de cuotas', () => {
  assert.notEqual(draftSnapshot({ amount: '20' }), draftSnapshot({ amount: '21' }))
  assert.notEqual(draftSnapshot([{ id: 'a' }, { id: 'b' }]), draftSnapshot([{ id: 'b' }, { id: 'a' }]))
})

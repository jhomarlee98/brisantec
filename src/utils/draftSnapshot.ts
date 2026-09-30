// JSONB does not preserve object key order. Compare values, not serialization order.
export function draftSnapshot(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)))
    }
    return entry
  })
}

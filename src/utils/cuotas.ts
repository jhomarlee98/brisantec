export type Installment = { id: string; dueDate: string; amount: string }

// Parse decimal input without adding binary floating-point amounts.
export function amountInCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function reviewInstallments(installments: Installment[], issueDate: string, total: number) {
  const totalCents = Math.round(total * 100)
  let scheduledCents = 0
  const errors: string[] = []
  if (!validDate(issueDate)) errors.push('Define una fecha de emisión válida.')
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) errors.push('Agrega ítems con un total mayor que cero.')
  if (installments.length === 0) errors.push('Agrega al menos una cuota.')
  installments.forEach((installment, index) => {
    const label = `Cuota ${index + 1}`
    const cents = amountInCents(installment.amount)
    if (cents === null || cents <= 0) errors.push(`${label}: ingresa un importe positivo con hasta dos decimales.`)
    else scheduledCents += cents
    if (!validDate(installment.dueDate)) errors.push(`${label}: define una fecha de vencimiento válida.`)
    else if (validDate(issueDate) && installment.dueDate < issueDate) errors.push(`${label}: el vencimiento no puede ser anterior a la emisión.`)
  })
  if (!Number.isSafeInteger(scheduledCents)) errors.push('El importe programado es demasiado grande.')
  const differenceCents = totalCents - scheduledCents
  if (differenceCents !== 0) errors.push('La suma de las cuotas debe coincidir con el total del comprobante.')
  return { scheduledCents, differenceCents, errors }
}

import { Printer, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { DraftContent } from '../utils/borradores'
import type { Client } from '../utils/clientes'
import { amountInCents, reviewInstallments } from '../utils/cuotas'

type Props = {
  draft: DraftContent
  client: Client | null
  totals: { taxable: number; igv: number; total: number }
  onClose: () => void
}

export default function DocumentPreview({ draft, client, totals, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: draft.currency }).format(value)
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : 'Pendiente'
  const installments = draft.installments ?? []
  const creditReview = reviewInstallments(installments, draft.issueDate, totals.total)
  const documentName = draft.documentType === '01' ? 'Factura' : 'Boleta'
  const pending = [
    ...(!client ? ['Selecciona un cliente.'] : []),
    ...(draft.documentType === '01' && client?.documentType !== 'RUC' ? ['La factura requiere un cliente con RUC.'] : []),
    ...(!draft.issueDate ? ['Define la fecha del comprobante.'] : []),
    ...(draft.items.length === 0 ? ['Agrega productos o servicios.'] : []),
    ...(draft.paymentCondition === 'CREDITO' ? creditReview.errors : []),
  ]

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const previousTitle = document.title
    document.body.style.overflow = 'hidden'
    document.body.classList.add('document-preview-open')
    document.title = `BRISANTEC - Borrador ${documentName}`
    element?.showModal()
    closeButton.current?.focus()
    return () => {
      element?.close()
      document.body.style.overflow = previousOverflow
      document.body.classList.remove('document-preview-open')
      document.title = previousTitle
      previousFocus?.focus()
    }
  }, [documentName])

  return createPortal(
    <dialog ref={dialog} className="document-preview" aria-labelledby="preview-heading"
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="preview-toolbar">
        <h2 id="preview-heading" className="text-sm font-semibold">Vista previa del borrador</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
            <Printer className="size-4" /> Imprimir / PDF
          </button>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Cerrar vista previa" className="rounded-xl p-2 hover:bg-slate-100"><X className="size-5" /></button>
        </div>
      </div>
      <article className="preview-paper">
        <header className="preview-header">
          <div><p className="preview-brand">BRISANTEC</p><p className="preview-muted">Documento de trabajo</p></div>
          <div className="preview-document-type"><h1>{documentName}</h1><p>BORRADOR · SIN EMITIR</p><p className="preview-muted">Sin serie ni correlativo asignado</p></div>
        </header>
        <p className="preview-disclaimer">BORRADOR — NO VÁLIDO COMO COMPROBANTE DE PAGO</p>
        <section className="preview-customer" aria-label="Datos del cliente">
          <div><span>Cliente</span><p>{client?.name || 'Pendiente de seleccionar'}</p></div>
          <div><span>Documento</span><p>{client ? `${client.documentType} ${client.documentNumber}` : 'Pendiente'}</p></div>
          <div className="preview-wide"><span>Dirección</span><p>{draft.address || 'No indicada'}</p></div>
          <div><span>Fecha</span><p>{date(draft.issueDate)}</p></div>
          <div><span>Moneda / pago</span><p>{draft.currency} · {draft.paymentCondition === 'CREDITO' ? 'Crédito' : 'Contado'}</p></div>
          {draft.purchaseOrder && <div className="preview-wide"><span>Orden de compra</span><p>{draft.purchaseOrder}</p></div>}
          {draft.currency === 'USD' && draft.exchangeRate && <div><span>Tipo de cambio indicado</span><p>{draft.exchangeRate}</p></div>}
        </section>
        <div className="preview-table-wrap">
          <table className="preview-items">
            <caption>Detalle de productos y servicios · precios con IGV</caption>
            <thead><tr><th scope="col">Descripción</th><th scope="col">Unidad</th><th scope="col">Cant.</th><th scope="col">P. unitario</th><th scope="col">Importe</th></tr></thead>
            <tbody>
              {draft.items.map((item) => <tr key={item.id}>
                <td><p>{item.description}</p><small>{item.type === 'PRODUCTO' ? 'Producto' : 'Servicio'}{item.code ? ` · ${item.code}` : ''}</small></td>
                <td>{item.unit}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.quantity * item.unitPrice)}</td>
              </tr>)}
              {draft.items.length === 0 && <tr><td colSpan={5}>Sin ítems agregados.</td></tr>}
            </tbody>
          </table>
        </div>
        <dl className="preview-totals">
          <div><dt>Valor de venta</dt><dd>{money(totals.taxable)}</dd></div>
          <div><dt>IGV</dt><dd>{money(totals.igv)}</dd></div>
          <div className="preview-grand-total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
        </dl>
        {draft.paymentCondition === 'CREDITO' && <section className="preview-credit">
          <h2>Cronograma de cuotas</h2>
          <table className="preview-items"><thead><tr><th scope="col">Cuota</th><th scope="col">Vencimiento</th><th scope="col">Importe</th></tr></thead>
            <tbody>{installments.map((installment, index) => {
              const cents = amountInCents(installment.amount)
              return <tr key={installment.id}><td>{index + 1}</td><td>{date(installment.dueDate)}</td><td>{cents === null ? 'Pendiente' : money(cents / 100)}</td></tr>
            })}</tbody>
          </table>
        </section>}
        {pending.length > 0 && <section className="preview-pending"><h2>Datos pendientes de revisión</h2><ul>{pending.map((entry, index) => <li key={index}>{entry}</li>)}</ul></section>}
        <footer className="preview-footer">Vista previa para revisión. No ha sido enviada a SUNAT. Imprimir no guarda los cambios del formulario ni registra un pago.</footer>
      </article>
    </dialog>, document.body,
  )
}

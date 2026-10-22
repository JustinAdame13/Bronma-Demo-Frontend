import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Bell, Check, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { bronmaApi, cents, currency, demoMode } from '../bronma'
import type { Configuration, DashboardDto, ImportResult, Page, Reminder } from '../bronma'
import { ErrorState, Loading, Notice, PageTitle, useOnline } from '../ui'

const agingNames: Record<DashboardDto['antiguedad'][number]['rango'], string> = {
  AL_CORRIENTE: 'Al corriente', VENCIDO_1_30: '1 a 30 días', VENCIDO_31_60: '31 a 60 días', VENCIDO_MAS_60: 'Más de 60 días',
}

export function CollectionDashboard() {
  const query = useQuery({ queryKey: ['bronma', 'dashboard'], queryFn: () => bronmaApi<DashboardDto>('/dashboard') })
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorState error={query.error} retry={query.refetch} />
  const data = query.data
  // La grafica es del saldo VENCIDO: lo al corriente se muestra aparte en las metricas
  const aging = data.antiguedad.filter(a => a.rango !== 'AL_CORRIENTE')
  const max = aging.reduce((m, a) => cents(a.monto) > m ? cents(a.monto) : m, 1n)
  return <div className="collection-content">
    <PageTitle title="Cartera" description={`Corte al ${data.fecha} · Importes en MXN`}><Link className="button outlined" to="/mapa">Ver clientes en el mapa</Link></PageTitle>
    <div className="collection-metrics">
      {[
        ['Cartera total', currency(data.cartera.total), `${data.cartera.clientesConSaldo} ${data.cartera.clientesConSaldo === 1 ? 'cliente' : 'clientes'} con saldo`],
        ['Vencido', currency(data.cartera.vencida), `${data.cartera.porcentajeVencido}% · ${data.cartera.clientesConVencido} con atraso`],
        ['Recuperado por recordatorios', currency(data.cobranza.recuperadoPorRecordatorios), `Del ${data.desde} al ${data.hasta}`],
        ['Días promedio de cobro', data.cobranza.diasPromedioCobro ?? 'Sin pagos', `Venta a pago · ${data.cobranza.pagos} ${data.cobranza.pagos === 1 ? 'pago' : 'pagos'} en el periodo`],
      ].map(([title, value, caption]) => <article className="collection-metric" key={title}><span>{title}</span><strong>{value}</strong><small>{caption}</small></article>)}
    </div>
    {cents(data.cartera.saldoAFavor) > 0n && <Notice message={`Los clientes tienen ${currency(data.cartera.saldoAFavor)} a favor (pagos de más o anticipos). Se aplicará solo en sus siguientes notas.`} />}
    <div className="collection-dashboard-grid">
      <section className="panel aging-panel">
        <div className="section-heading"><div><h2>Antigüedad del saldo vencido</h2><p>Distribución por días de atraso</p></div></div>
        <div className="aging-bars">{aging.map((row, i) => <div key={row.rango}><span>{agingNames[row.rango]}<b>{currency(row.monto)}</b></span><div><i style={{ width: `${Number(cents(row.monto) * 10000n / max) / 100}%`, background: ['#aeb5af', '#a18a60', '#a96252'][i] }} /></div><small>{row.clientes} {row.clientes === 1 ? 'cliente' : 'clientes'}</small></div>)}</div>
      </section>
      <section className="panel debtors-panel">
        <div className="section-heading"><div><h2>Clientes con mayor saldo</h2><p>Los 10 saldos más altos</p></div><Link className="text-link" to="/mapa">Ver clientes</Link></div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Clientes con mayor saldo"><table><thead><tr><th>Cliente</th><th>Saldo total</th><th>Vencido</th><th>Riesgo</th></tr></thead><tbody>{data.topDeudores.map((c, i) => <tr key={c.clienteId}><td><span className="row-number">{String(i + 1).padStart(2, '0')}</span>{c.nombreNegocio}</td><td>{currency(c.saldo)}</td><td className="overdue">{currency(c.saldoVencido)}</td><td><span className={`collection-status ${c.nivelRiesgo === 'ALTO' ? 'overdue' : c.nivelRiesgo === 'MEDIO' ? 'soon' : 'current'}`}>{c.nivelRiesgo === 'ALTO' ? 'Alto' : c.nivelRiesgo === 'MEDIO' ? 'Medio' : c.nivelRiesgo === 'BAJO' ? 'Bajo' : 'Sin evaluar'}</span></td></tr>)}</tbody></table></div>
      </section>
    </div>
  </div>
}

export function Reminders() {
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['bronma', 'recordatorios', estado, pagina], queryFn: () => bronmaApi<Page<Reminder>>(`/recordatorios?pagina=${pagina}${estado ? `&estado=${estado}` : ''}`) })
  return <div className="collection-content"><PageTitle title="Recordatorios" description="Mensajes de cobranza por WhatsApp"><Link className="button outlined" to="/configuracion">Configuración de envíos</Link></PageTitle><section className="panel"><div className="collection-tabs">{[['', 'Todos'], ['PENDIENTE', 'Pendientes'], ['ENVIADO', 'Enviados'], ['FALLIDO', 'Con error'], ['CANCELADO', 'Cancelados']].map(([value, label]) => <button key={value} aria-pressed={estado === value} onClick={() => { setEstado(value); setPagina(0); setSelected(null) }}>{label}</button>)}</div>{query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} retry={query.refetch} /> : <><div className="table-scroll" tabIndex={0} role="region" aria-label="Recordatorios de cobranza"><table><thead><tr><th>Cliente / nota</th><th>Fecha programada</th><th>Estado</th><th>Mensaje</th></tr></thead><tbody>{query.data.contenido.map(r => <tr key={r.id}><td><strong>{r.clienteNombre}</strong><small className="table-subtitle">{r.folio}</small></td><td>{r.programadoPara}</td><td><span className={`collection-status ${r.estado === 'FALLIDO' ? 'overdue' : r.estado === 'PENDIENTE' ? 'soon' : 'current'}`}>{{ PENDIENTE: 'Pendiente', ENVIADO: 'Enviado', FALLIDO: 'Con error', CANCELADO: 'Cancelado' }[r.estado]}</span></td><td><button className="text-link" onClick={() => setSelected(selected === r.id ? null : r.id)} aria-expanded={selected === r.id}>{selected === r.id ? 'Ocultar' : 'Ver mensaje'}<ChevronRight size={15} /></button>{selected === r.id && <div className="reminder-message"><p>{r.mensaje}</p>{r.error && <Notice error message={r.error} />}</div>}</td></tr>)}</tbody></table></div>{!query.data.contenido.length && <div className="map-empty"><Bell /><strong>No hay recordatorios en este estado.</strong></div>}<div className="collection-pagination"><span>{query.data.totalElementos} recordatorios</span><button className="icon-button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={18} /></button><span>Página {pagina + 1} de {Math.max(1, query.data.totalPaginas)}</span><button className="icon-button" aria-label="Página siguiente" disabled={pagina + 1 >= query.data.totalPaginas} onClick={() => setPagina(p => p + 1)}><ChevronRight size={18} /></button></div></>}</section>{demoMode && <p className="demo-footnote">Estados de ejemplo. Esta demo no envía mensajes.</p>}</div>
}

export function ImportPortfolio() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const online = useOnline()
  const cache = useQueryClient()
  async function upload() {
    if (!file || demoMode || busy || !online) return
    setBusy(true); setError(''); setResult(null)
    try { const body = new FormData(); body.append('archivo', file); setResult(await bronmaApi<ImportResult>('/importaciones', { method: 'POST', body })); await cache.invalidateQueries({ queryKey: ['bronma'] }) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos importar el archivo.') }
    finally { setBusy(false) }
  }
  return <div className="collection-content narrow-content"><PageTitle title="Importar cartera" description="Carga de ventas a crédito desde Excel o CSV" /><section className="panel import-panel"><h2>Archivo de ventas</h2><p>Los códigos de cliente y folios de origen permiten actualizar los registros existentes sin duplicarlos.</p><label className="upload-area"><span>Archivo</span><input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={e => { const next = e.target.files?.[0]; setError(''); setResult(null); if (next && (!/\.(xlsx|xls|csv)$/i.test(next.name) || next.size > 4 * 1024 * 1024 || next.size === 0)) { setError('Elige un archivo .xlsx, .xls o .csv no vacío y de hasta 4 MB.'); setFile(null); e.target.value = ''; return } setFile(next || null) }} /><small>Formato .xlsx, .xls o .csv. Tamaño máximo: 4 MB.</small></label>{demoMode && <p className="demo-footnote import-demo-note">La importación no está disponible en esta demostración. Puedes revisar el formato y tamaño del archivo.</p>}{error && <Notice error message={error} />}<button className="button primary" disabled={!file || demoMode || busy || !online} onClick={upload}><Upload size={17} />{busy ? 'Importando…' : 'Importar cartera'}</button></section>{result && <section className="panel import-results"><h2>Resultado de la importación</h2><div className="collection-metrics">{[['Filas', result.filasTotal], ['Creadas', result.creadas], ['Actualizadas', result.actualizadas], ['Sin cambios', result.sinCambios ?? 0], ['De contado (omitidas)', result.omitidas ?? 0], ['Con error', result.errores]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{result.detalleErrores.map((e, i) => <Notice key={`${e.fila}-${i}`} error message={`Fila ${e.fila}${e.folio ? ` · ${e.folio}` : ''}: ${e.error}`} />)}</section>}<p className="demo-footnote">El archivo debe contener las columnas acordadas para la importación.</p></div>
}

export function CollectionSettings() {
  const query = useQuery({ queryKey: ['bronma', 'configuracion'], queryFn: () => bronmaApi<Configuration>('/configuracion') })
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorState error={query.error} retry={query.refetch} />
  return <SettingsForm key={query.dataUpdatedAt} initial={query.data} />
}
function SettingsForm({ initial }: { initial: Configuration }) {
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const online = useOnline()
  const cache = useQueryClient()
  const providers = useQuery({ queryKey: ['bronma', 'proveedores'], queryFn: () => bronmaApi<string[]>('/configuracion/ia/proveedores') })
  async function save(ia?: string) {
    if (busy || !online) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (ia !== undefined) { const updated = await bronmaApi<Configuration>('/configuracion/ia', { method: 'PATCH', body: JSON.stringify({ proveedorIa: ia, modeloIa: null }) }); setForm(updated) }
      else { cents(form.limiteCreditoDefault); await bronmaApi('/configuracion', { method: 'PUT', body: JSON.stringify(form) }) }
      setMessage(demoMode ? 'Configuración actualizada en esta demo.' : 'Configuración guardada.'); await cache.invalidateQueries({ queryKey: ['bronma', 'configuracion'], refetchType: 'none' })
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar.') }
    finally { setBusy(false) }
  }
  return <div className="collection-content narrow-content"><PageTitle title="Configuración" description="Crédito y recordatorios de Grupo BRONMA" /><section className="panel"><h2>Datos de la operación</h2><form className="stack-form settings-form" onSubmit={e => { e.preventDefault(); void save() }}><label>Nombre de empresa<input value={form.nombreEmpresa} required maxLength={120} disabled={busy} onChange={e => setForm({ ...form, nombreEmpresa: e.target.value })} /></label><div className="settings-pair"><label>Plazo de crédito (días)<input type="number" min={1} max={365} step={1} required disabled={busy} value={form.plazoCreditoDefaultDias} onChange={e => setForm({ ...form, plazoCreditoDefaultDias: Number(e.target.value) })} /></label><label>Límite de crédito (MXN)<input inputMode="decimal" pattern="[0-9]+\.[0-9]{2}" required disabled={busy} value={form.limiteCreditoDefault} onChange={e => setForm({ ...form, limiteCreditoDefault: e.target.value })} /></label></div><label>Hora de recordatorios (Torreón)<input type="time" step={1} required disabled={busy} value={form.horaEnvioRecordatorios} onChange={e => setForm({ ...form, horaEnvioRecordatorios: e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value })} /></label><label className="checkbox-label"><input type="checkbox" disabled={busy} checked={form.whatsappHabilitado} onChange={e => setForm({ ...form, whatsappHabilitado: e.target.checked })} /><span>Habilitar recordatorios de WhatsApp</span></label><p className="field-help">Zona horaria: {form.zonaHoraria}. El servidor administra los envíos.</p><button className="button primary" disabled={busy || !online}><Check size={17} />{busy ? 'Guardando…' : 'Guardar configuración'}</button></form></section><section className="panel settings-ai"><div><h2>Análisis de riesgo</h2><p>Proveedor de IA que complementa la evaluación de Ayax.</p><label>Proveedor<select aria-label="Proveedor de IA" disabled={busy || !online || providers.isPending || providers.isError} value={form.iaActiva ? form.proveedorIa : 'NINGUNO'} onChange={e => { void save(e.target.value) }}><option value="NINGUNO">Desactivada</option>{providers.data?.map(p => <option key={p}>{p}</option>)}</select></label>{providers.isError && <p role="alert">No pudimos cargar los proveedores.</p>}{demoMode && <small>La demo no realiza llamadas a proveedores de IA.</small>}</div></section>{error && <Notice error message={error} />}{message && <Notice message={message} />}</div>
}

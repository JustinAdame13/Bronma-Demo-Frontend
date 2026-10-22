import { today, shiftDate } from './api'
import mapFixture from './mocks/mapa-clientes.json'

export type Risk = 'BAJO' | 'MEDIO' | 'ALTO'
export type MapClient = {
  id: number; nombreNegocio: string; rutaId: number; rutaColor: string
  latitud: number | null; longitud: number | null; ordenVisita: number | null
  saldo: string; saldoVencido: string; diasAtrasoMax: number; proximoVencimiento: string | null
  nivelRiesgo: Risk | null; estadoCredito: 'ACTIVO' | 'REDUCIDO' | 'SUSPENDIDO'; prioridad: number | null
  /** Lo vencido o que vence hoy (lo que hay que cobrar en la visita). Opcional en la demo. */
  montoACobrar?: string
}
export type RouteDto = { id: number; codigoOrigen: string; nombre: string; color: string; repartidor: { id: number; nombre: string } | null; activo: boolean; totalClientes: number }
export type Note = { id: number; folioOrigen: string; clienteId: number; fechaEmision: string; fechaVencimiento: string; monto: string; saldo: string; estado: string; vencida: boolean; diasAtraso: number }
export type Evaluation = { score: number; nivel: Risk; accionRecomendada: string; explicacion: string }
export type ClientDetail = MapClient & { codigoOrigen: string; contacto: string; direccion: string; telefonoWhatsapp: string | null; aceptaWhatsapp: boolean; limiteCreditoEfectivo: string; plazoDiasEfectivo: number; notasAbiertas: Note[]; riesgo: Evaluation | null
  /** Pagos de más o anticipos sin aplicar; el backend los usa solos en la siguiente nota. */
  saldoAFavor?: string }
export type Reminder = { id: number; clienteId: number; clienteNombre: string; folio: string; programadoPara: string; estado: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'CANCELADO'; mensaje: string; error: string | null }
export type Page<T> = { contenido: T[]; pagina: number; tamano: number; totalElementos: number; totalPaginas: number }
export type AgingRange = 'AL_CORRIENTE' | 'VENCIDO_1_30' | 'VENCIDO_31_60' | 'VENCIDO_MAS_60'
/** GET /dashboard de Spring Boot: la cartera es foto de hoy; la cobranza, del periodo [desde, hasta]. Montos como string decimal. */
export type DashboardDto = {
  fecha: string; desde: string; hasta: string
  cartera: { total: string; vencida: string; alCorriente: string; porcentajeVencido: string; clientesConSaldo: number; clientesConVencido: number; saldoAFavor: string }
  antiguedad: { rango: AgingRange; monto: string; notas: number; clientes: number }[]
  topDeudores: { clienteId: number; nombreNegocio: string; rutaId: number | null; rutaNombre: string | null; saldo: string; saldoVencido: string; diasAtrasoMax: number; nivelRiesgo: Risk | null; prioridad: number }[]
  cobranza: { cobrado: string; pagos: number; recuperadoPorRecordatorios: string; recordatoriosEnviados: number; diasPromedioCobro: string | null }
  porRuta: { rutaId: number; rutaNombre: string; color: string; cartera: string; vencido: string; clientesConSaldo: number; cobradoPeriodo: string }[]
  clientesPorRiesgo: Record<Risk, number>
}
export type Configuration = { nombreEmpresa: string; zonaHoraria: string; plazoCreditoDefaultDias: number; limiteCreditoDefault: string; whatsappHabilitado: boolean; horaEnvioRecordatorios: string; proveedorIa: string; modeloIa: string | null; iaActiva: boolean }
export type ImportResult = { id: number; archivoNombre: string; filasTotal: number; creadas: number; actualizadas: number; sinCambios?: number; omitidas?: number; clientesNuevos?: number; rutasNuevas?: number; errores: number; detalleErrores: { fila: number; folio: string | null; error: string }[] }
export type Payment = { clienteId: number; monto: string; metodo: string; origen: 'OFICINA' | 'RUTA'; comentario: string; uuidDispositivo: string; aplicaciones: null; registradoPorId?: number }

export const demoMode = import.meta.env.VITE_USE_MOCKS === 'true' || (!import.meta.env.VITE_API_URL && import.meta.env.VITE_USE_MOCKS !== 'false')
const base = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
export const statusNames = { overdue: 'Requiere atención', soon: 'Por vencer', current: 'Al corriente' }
export type ClientStatus = keyof typeof statusNames
export function clientStatus(client: MapClient, date = today()): ClientStatus {
  if (client.diasAtrasoMax > 0 || client.nivelRiesgo === 'ALTO') return 'overdue'
  if (client.proximoVencimiento && client.proximoVencimiento >= date && client.proximoVencimiento <= shiftDate(date, 3)) return 'soon'
  return 'current'
}
export function hasLocation(client: MapClient): client is MapClient & { latitud: number; longitud: number } {
  return typeof client.latitud === 'number' && Number.isFinite(client.latitud) && Math.abs(client.latitud) <= 90 && typeof client.longitud === 'number' && Number.isFinite(client.longitud) && Math.abs(client.longitud) <= 180
}
export function priorityClients(clients: MapClient[]) {
  return [...clients].sort((a, b) => (b.prioridad ?? -1) - (a.prioridad ?? -1) || a.nombreNegocio.localeCompare(b.nombreNegocio, 'es'))
}
export function cents(value: string): bigint {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error('Escribe un importe válido con dos decimales.')
  return BigInt(value.replace('.', ''))
}
export function decimal(value: bigint) { return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}` }
export function currency(value: string) {
  if (!/^\d+\.\d{2}$/.test(value)) return 'Sin dato'
  const [whole, fraction] = value.split('.')
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).formatToParts(BigInt(whole)).map(part => part.type === 'fraction' ? fraction : part.value).join('')
}
export class BronmaError extends Error {
  constructor(message: string, public campos: Record<string, string> = {}, public status = 400) { super(message) }
}

// shortcut: la demo vive en memoria; conectar VITE_API_URL para persistir cambios en Spring Boot.
const clients = structuredClone(mapFixture) as MapClient[]
for (const client of clients) if (client.proximoVencimiento) client.proximoVencimiento = shiftDate(today(), Math.round((Date.parse(client.proximoVencimiento) - Date.parse('2026-10-21')) / 86400000))
const routes: RouteDto[] = [
  { id: 2, codigoOrigen: 'R-02', nombre: 'Ruta Centro', color: '#bd923d', repartidor: { id: 5, nombre: 'Pedro López' }, activo: true, totalClientes: 6 },
  { id: 3, codigoOrigen: 'R-03', nombre: 'Ruta Norte', color: '#5b8c86', repartidor: { id: 6, nombre: 'Ana Martínez' }, activo: true, totalClientes: 5 },
  { id: 4, codigoOrigen: 'R-04', nombre: 'Ruta Oriente', color: '#9370a6', repartidor: { id: 7, nombre: 'Luis García' }, activo: true, totalClientes: 4 },
]
let configuration: Configuration = { nombreEmpresa: 'Grupo BRONMA', zonaHoraria: 'America/Monterrey', plazoCreditoDefaultDias: 7, limiteCreditoDefault: '5000.00', whatsappHabilitado: false, horaEnvioRecordatorios: '09:00:00', proveedorIa: 'NINGUNO', modeloIa: null, iaActiva: false }
const notes = new Map<number, Note[]>()
for (const c of clients) {
  const amounts = [c.saldoVencido, decimal(cents(c.saldo) - cents(c.saldoVencido))]
  notes.set(c.id, amounts.flatMap((amount, i) => cents(amount) === 0n ? [] : [{ id: 300 + c.id * 2 + i, folioOrigen: `BR-${10230 + c.id}${i ? '-B' : ''}`, clienteId: c.id, fechaEmision: shiftDate(today(), -14), fechaVencimiento: i === 0 ? shiftDate(today(), -c.diasAtrasoMax) : c.proximoVencimiento || shiftDate(today(), 7), monto: amount, saldo: amount, estado: 'ABIERTA', vencida: i === 0, diasAtraso: i === 0 ? c.diasAtrasoMax : 0 }]))
}
const reminders: Reminder[] = clients.filter(c => clientStatus(c) !== 'current').map((c, i) => ({ id: 40 + i, clienteId: c.id, clienteNombre: c.nombreNegocio, folio: `BR-${10230 + c.id}`, programadoPara: today(), estado: (['PENDIENTE', 'ENVIADO', 'PENDIENTE', 'FALLIDO'] as const)[i % 4], mensaje: `Hola ${c.nombreNegocio}, te recordamos tu saldo pendiente de ${currency(c.saldo)} con BRONMA. Gracias por tu preferencia.`, error: i % 4 === 3 ? 'Número de WhatsApp no disponible.' : null }))
const receipts = new Map<string, unknown>()
const favorDemo = new Map<number, bigint>()
let policy = [{ id: 1, diasOffset: -3, plantilla: 'Hola {cliente}, tu nota {folio} por {saldo} vence el {vencimiento}. Gracias por tu preferencia.', activo: true, nombrePlantillaWhatsapp: null }]
function page<T>(items: T[], query: URLSearchParams): Page<T> {
  const pagina = Math.max(0, Number(query.get('pagina')) || 0), tamano = 20
  return { contenido: items.slice(pagina * tamano, (pagina + 1) * tamano), pagina, tamano, totalElementos: items.length, totalPaginas: Math.ceil(items.length / tamano) }
}
async function demoRequest(path: string, options: RequestInit) {
  const url = new URL(path, 'http://demo.local'), method = options.method || 'GET'
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : null
  const filtered = clients.filter(c => !url.searchParams.get('rutaId') || c.rutaId === Number(url.searchParams.get('rutaId')))
  if (url.pathname === '/rutas') return routes
  if (url.pathname === '/mapa/clientes') return structuredClone(filtered)
  const detail = url.pathname.match(/^\/clientes\/(\d+)(\/ubicacion)?$/)
  if (detail) {
    const client = clients.find(c => c.id === Number(detail[1]))
    if (!client) throw new BronmaError('No encontramos este cliente.', {}, 404)
    if (detail[2] && method === 'PATCH') {
      if (body.precisionMetros > 100) throw new BronmaError('Precisión insuficiente; intenta de nuevo al aire libre.', {}, 422)
      if (!Number.isFinite(body.latitud) || Math.abs(body.latitud) > 90 || !Number.isFinite(body.longitud) || Math.abs(body.longitud) > 180 || !['GPS', 'MANUAL'].includes(body.fuente)) throw new BronmaError('La ubicación no es válida.')
      client.latitud = body.latitud; client.longitud = body.longitud
      return { id: client.id, latitud: client.latitud, longitud: client.longitud, ubicacionFuente: body.fuente, ubicacionFijadaEn: new Date().toISOString() }
    }
    return { ...client, codigoOrigen: `C-${String(client.id).padStart(4, '0')}`, contacto: 'Contacto de demostración', direccion: 'Torreón, Coahuila · Dirección de ejemplo', telefonoWhatsapp: null, aceptaWhatsapp: false, limiteCreditoEfectivo: '15000.00', plazoDiasEfectivo: 7, saldoAFavor: decimal(favorDemo.get(client.id) ?? 0n), notasAbiertas: structuredClone(notes.get(client.id)), riesgo: client.nivelRiesgo ? { score: client.nivelRiesgo === 'ALTO' ? 86 : client.nivelRiesgo === 'MEDIO' ? 54 : 18, nivel: client.nivelRiesgo, accionRecomendada: client.diasAtrasoMax ? 'COBRAR_PROXIMA_VISITA' : 'SIN_ACCION', explicacion: client.diasAtrasoMax ? `Presenta ${client.diasAtrasoMax} días de atraso. Prioriza el seguimiento en la próxima visita.` : 'No presenta atrasos registrados. Mantén el seguimiento habitual.' } : null }
  }
  if (url.pathname === '/pagos' && method === 'POST') {
    if (!body.uuidDispositivo) throw new BronmaError('Falta el identificador del pago.')
    if (receipts.has(body.uuidDispositivo)) return receipts.get(body.uuidDispositivo)
    const client = clients.find(c => c.id === body.clienteId)
    if (!client) throw new BronmaError('No encontramos este cliente.', {}, 404)
    if (!['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO'].includes(body.metodo)) throw new BronmaError('Selecciona un método válido.')
    const amount = cents(body.monto)
    if (amount <= 0n) throw new BronmaError('El pago debe ser mayor que cero.', { monto: 'Revisa el importe.' }, 422)
    // Igual que el backend: lo que pasa de la deuda queda como saldo a favor
    const aplicado = amount > cents(client.saldo) ? cents(client.saldo) : amount
    const favor = amount - aplicado
    favorDemo.set(client.id, (favorDemo.get(client.id) ?? 0n) + favor)
    client.saldo = decimal(cents(client.saldo) - aplicado)
    const due = cents(client.saldoVencido) - aplicado
    client.saldoVencido = decimal(due > 0n ? due : 0n)
    if (due <= 0n) client.diasAtrasoMax = 0
    if (cents(client.saldo) === 0n) { client.proximoVencimiento = null; client.nivelRiesgo = 'BAJO'; client.prioridad = 0 }
    let remaining = aplicado
    for (const note of notes.get(client.id) || []) {
      if (!remaining) break
      const applied = remaining > cents(note.saldo) ? cents(note.saldo) : remaining
      note.saldo = decimal(cents(note.saldo) - applied); remaining -= applied
      note.estado = cents(note.saldo) === 0n ? 'PAGADA' : 'PARCIAL'
    }
    const result = { id: receipts.size + 1, clienteId: client.id, monto: body.monto, montoAplicado: decimal(aplicado), saldoAFavor: decimal(favor), saldoCliente: client.saldo, saldoAFavorCliente: decimal(favorDemo.get(client.id) ?? 0n) }
    receipts.set(body.uuidDispositivo, result)
    return result
  }
  if (url.pathname === '/dashboard') {
    const sum = (values: string[]) => decimal(values.reduce((total, v) => total + cents(v), 0n))
    const total = sum(filtered.map(c => c.saldo)), vencida = sum(filtered.map(c => c.saldoVencido))
    const rangos: [AgingRange, (c: MapClient) => boolean][] = [
      ['AL_CORRIENTE', c => c.diasAtrasoMax === 0],
      ['VENCIDO_1_30', c => c.diasAtrasoMax > 0 && c.diasAtrasoMax <= 30],
      ['VENCIDO_31_60', c => c.diasAtrasoMax > 30 && c.diasAtrasoMax <= 60],
      ['VENCIDO_MAS_60', c => c.diasAtrasoMax > 60],
    ]
    const porRiesgo = { BAJO: 0, MEDIO: 0, ALTO: 0 } as Record<Risk, number>
    for (const c of filtered) if (c.nivelRiesgo) porRiesgo[c.nivelRiesgo]++
    return {
      fecha: today(), desde: shiftDate(today(), -29), hasta: today(),
      cartera: { total, vencida, alCorriente: decimal(cents(total) - cents(vencida)), porcentajeVencido: cents(total) === 0n ? '0.00' : decimal(cents(vencida) * 10000n / cents(total)), clientesConSaldo: filtered.filter(c => cents(c.saldo) > 0n).length, clientesConVencido: filtered.filter(c => cents(c.saldoVencido) > 0n).length, saldoAFavor: '0.00' },
      antiguedad: rangos.map(([rango, test]) => { const group = filtered.filter(c => cents(c.saldo) > 0n && test(c)); return { rango, monto: sum(group.map(c => rango === 'AL_CORRIENTE' ? c.saldo : c.saldoVencido)), notas: group.length, clientes: group.length } }),
      topDeudores: [...filtered].sort((a, b) => cents(a.saldo) > cents(b.saldo) ? -1 : cents(a.saldo) < cents(b.saldo) ? 1 : 0).slice(0, 10).map(c => ({ clienteId: c.id, nombreNegocio: c.nombreNegocio, rutaId: c.rutaId, rutaNombre: routes.find(r => r.id === c.rutaId)?.nombre ?? null, saldo: c.saldo, saldoVencido: c.saldoVencido, diasAtrasoMax: c.diasAtrasoMax, nivelRiesgo: c.nivelRiesgo, prioridad: c.prioridad ?? 0 })),
      cobranza: { cobrado: '42380.00', pagos: 37, recuperadoPorRecordatorios: '18450.00', recordatoriosEnviados: 64, diasPromedioCobro: '9.40' },
      porRuta: routes.map(r => { const group = filtered.filter(c => c.rutaId === r.id); return { rutaId: r.id, rutaNombre: r.nombre, color: r.color, cartera: sum(group.map(c => c.saldo)), vencido: sum(group.map(c => c.saldoVencido)), clientesConSaldo: group.filter(c => cents(c.saldo) > 0n).length, cobradoPeriodo: '0.00' } }),
      clientesPorRiesgo: porRiesgo,
    } satisfies DashboardDto
  }
  if (url.pathname === '/recordatorios') return page(reminders.filter(r => !url.searchParams.get('estado') || r.estado === url.searchParams.get('estado')), url.searchParams)
  if (url.pathname === '/recordatorios/politica') {
    if (method === 'GET') return structuredClone(policy)
  }
  if (/^\/recordatorios\/politica\/\d+$/.test(url.pathname) && method === 'PUT') {
    policy = policy.map(p => p.id === Number(url.pathname.split('/').at(-1)) ? { ...p, plantilla: body.plantilla, activo: body.activo } : p)
    return structuredClone(policy[0])
  }
  if (url.pathname === '/configuracion/ia/proveedores') return []
  if (url.pathname === '/configuracion/ia' && method === 'PATCH') { configuration = { ...configuration, proveedorIa: 'NINGUNO', iaActiva: false }; return configuration }
  if (url.pathname === '/configuracion') { if (method === 'PUT') configuration = { ...configuration, ...body }; return structuredClone(configuration) }
  throw new BronmaError('Esta operación requiere conectar el backend de BRONMA.', {}, 503)
}
export async function bronmaApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (demoMode) return await demoRequest(path, options) as T
  try {
    const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers }, signal: options.signal || AbortSignal.timeout(30_000) })
    if (response.status === 204) return null as T
    const data = await response.json()
    if (!response.ok) throw new BronmaError(response.status >= 500 ? 'El servicio no está disponible. Intenta de nuevo.' : data.mensaje || 'No pudimos completar la operación.', data.campos || {}, response.status)
    return data as T
  } catch (cause) {
    if (cause instanceof BronmaError) throw cause
    throw new BronmaError('No pudimos conectar con BRONMA. Revisa tu conexión. Si guardabas un pago, reintenta sin cerrar el formulario para conservar su identificador.', {}, 502)
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { bronmaApi, cents, clientStatus, currency, decimal, hasLocation, priorityClients } from './bronma'
import type { ClientDetail, MapClient } from './bronma'
import fixture from './mocks/mapa-clientes.json'

const client = fixture[0] as MapClient
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('Contrato de estados del mapa', () => {
  it('prioriza atraso y riesgo alto sobre vencimientos próximos', () => {
    expect(clientStatus(client, '2026-10-21')).toBe('overdue')
    expect(clientStatus({ ...client, diasAtrasoMax: 0, nivelRiesgo: 'ALTO' }, '2026-10-21')).toBe('overdue')
  })
  it.each(['2026-10-21', '2026-10-24'])('incluye hoy y el tercer día: %s', date => {
    expect(clientStatus({ ...client, diasAtrasoMax: 0, proximoVencimiento: date }, '2026-10-21')).toBe('soon')
  })
  it.each([null, '2026-10-20', '2026-10-25'])('no inventa vencimientos para %s', date => {
    expect(clientStatus({ ...client, diasAtrasoMax: 0, proximoVencimiento: date, nivelRiesgo: null }, '2026-10-21')).toBe('current')
  })
  it('admite coordenadas cero, rechaza ubicaciones nulas o fuera de rango', () => {
    expect(hasLocation({ ...client, latitud: 0, longitud: 0 })).toBe(true)
    for (const latitud of [null, NaN, Infinity, 91]) expect(hasLocation({ ...client, latitud })).toBe(false)
  })
  it('ordena por prioridad del backend, deja null al final y no modifica los datos', () => {
    const input = [{ ...client, id: 1, prioridad: null }, { ...client, id: 2, prioridad: 99 }, { ...client, id: 3, prioridad: 0 }]
    expect(priorityClients(input).map(c => c.id)).toEqual([2, 3, 1])
    expect(input[0].id).toBe(1)
  })
})
describe('Importes y pagos de demostración', () => {
  it('conserva centavos e importes superiores al entero seguro', () => {
    expect(cents('9007199254740993.29')).toBe(900719925474099329n)
    expect(currency('9007199254740993.29')).toContain('9,007,199,254,740,993.29')
    expect(decimal(cents('0.30') - cents('0.10'))).toBe('0.20')
    expect(() => cents('1e4')).toThrow()
  })
  it('el mismo UUID reintentado no duplica el abono y un pago excesivo se rechaza', async () => {
    const before = await bronmaApi<ClientDetail>('/clientes/1')
    const body = JSON.stringify({ clienteId: 1, monto: '500.25', metodo: 'EFECTIVO', origen: 'RUTA', uuidDispositivo: 'test-pago-retry' })
    const first = await bronmaApi('/pagos', { method: 'POST', body })
    expect(await bronmaApi('/pagos', { method: 'POST', body })).toEqual(first)
    const after = await bronmaApi<ClientDetail>('/clientes/1')
    expect(cents(before.saldo) - cents(after.saldo)).toBe(50025n)
    expect(after.notasAbiertas.reduce((sum, note) => sum + cents(note.saldo), 0n)).toBe(cents(after.saldo))
    expect(after.notasAbiertas.filter(n => n.vencida).reduce((sum, note) => sum + cents(note.saldo), 0n)).toBe(cents(after.saldoVencido))
    await expect(bronmaApi('/pagos', { method: 'POST', body: JSON.stringify({ clienteId: 1, monto: '9999999.00', metodo: 'EFECTIVO', uuidDispositivo: 'test-excess' }) })).rejects.toMatchObject({ status: 422 })
  })
  it('no guarda GPS con precisión insuficiente', async () => {
    const before = await bronmaApi<ClientDetail>('/clientes/6')
    await expect(bronmaApi('/clientes/6/ubicacion', { method: 'PATCH', body: JSON.stringify({ latitud: 25.54, longitud: -103.41, fuente: 'GPS', precisionMetros: 101 }) })).rejects.toMatchObject({ status: 422 })
    expect((await bronmaApi<ClientDetail>('/clientes/6')).latitud).toBe(before.latitud)
    await bronmaApi('/clientes/6/ubicacion', { method: 'PATCH', body: JSON.stringify({ latitud: 25.54, longitud: -103.41, fuente: 'MANUAL' }) })
    expect((await bronmaApi<ClientDetail>('/clientes/6')).latitud).toBe(25.54)
  })
})
it('modo real conserva el contrato decimal y devuelve los errores por campo sin activar mocks', async () => {
  vi.stubEnv('VITE_USE_MOCKS', 'false'); vi.stubEnv('VITE_API_URL', 'https://bronma.test/api/v1')
  vi.resetModules()
  const { bronmaApi: liveApi } = await import('./bronma')
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mensaje: 'Pago mayor al saldo.', campos: { monto: 'Máximo 10.00' } }), { status: 422 }))
  vi.stubGlobal('fetch', fetcher)
  const body = JSON.stringify({ monto: '10.01' })
  await expect(liveApi('/pagos', { method: 'POST', body })).rejects.toMatchObject({ status: 422, campos: { monto: 'Máximo 10.00' } })
  expect(fetcher.mock.calls[0][0]).toBe('https://bronma.test/api/v1/pagos')
  expect(fetcher.mock.calls[0][1].body).toBe(body)
})

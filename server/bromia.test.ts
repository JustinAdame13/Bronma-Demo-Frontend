import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, expect, it, vi } from 'vitest'
import { bromiaTools, createBromiaRouter } from './bromia'
import type { Host } from './host'

const call = vi.fn().mockResolvedValue([])
const app = express(); app.use(express.json()); app.use('/api/bromia', createBromiaRouter(undefined, () => ({ call }) as unknown as Host))
let server: Server
async function url() {
  if (!server) { server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r)) }
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/bromia`
}
afterAll(async () => { if (server) await new Promise<void>(r => { server.close(() => r()); server.closeAllConnections() }) })
it('identifica BRONMIA y explica la configuración pendiente', async () => {
  const base = await url()
  expect(await (await fetch(`${base}/health`)).json()).toEqual({ service: 'BRONMIA', providerConfigured: false })
  const res = await fetch(`${base}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Cartera vencida' }) })
  expect(res.status).toBe(503)
  expect(await res.json()).toMatchObject({ error: expect.stringContaining('OLLAMA_API_KEY'), actionMayHaveRun: false })
})
it('rechaza acciones de escritura antes de consultar herramientas', async () => {
  const res = await fetch(`${await url()}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Registrar', action: { type: 'REGISTER_SALE', payload: { productoId: 1 } } }) })
  expect(res.status).toBe(400)
  expect(call).not.toHaveBeenCalled()
})
it('solo expone lecturas BRONMA y valida el ID de riesgo', async () => {
  const tools = bromiaTools({ call } as unknown as Host)
  await tools.find(t => t.name === 'cartera')!.execute({}, { message: '' })
  expect(call).toHaveBeenCalledWith('/dashboard')
  expect(() => tools.find(t => t.name === 'riesgo')!.execute({ clienteId: '../pagos' }, { message: '' })).toThrow()
  expect(tools.map(t => t.name)).toEqual(['clientes', 'cartera', 'rutas', 'recordatorios', 'riesgo'])
})

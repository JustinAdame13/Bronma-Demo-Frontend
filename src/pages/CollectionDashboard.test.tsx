// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CollectionDashboard } from './CollectionPages'
import * as backend from '../bronma'
import type { DashboardDto } from '../bronma'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

// Respuesta con la forma exacta de GET /api/v1/dashboard de Spring Boot
const respuesta: DashboardDto = {
  fecha: '2026-10-22', desde: '2026-09-23', hasta: '2026-10-22',
  cartera: { total: '4650.00', vencida: '3250.00', alCorriente: '1400.00', porcentajeVencido: '69.90', clientesConSaldo: 3, clientesConVencido: 2, saldoAFavor: '150.00' },
  antiguedad: [
    { rango: 'AL_CORRIENTE', monto: '1400.00', notas: 2, clientes: 1 },
    { rango: 'VENCIDO_1_30', monto: '1250.00', notas: 1, clientes: 1 },
    { rango: 'VENCIDO_31_60', monto: '2000.00', notas: 1, clientes: 1 },
    { rango: 'VENCIDO_MAS_60', monto: '0.00', notas: 0, clientes: 0 },
  ],
  topDeudores: [{ clienteId: 1, nombreNegocio: 'Abarrotes La Peña', rutaId: 1, rutaNombre: 'Ruta Centro', saldo: '2050.00', saldoVencido: '1250.00', diasAtrasoMax: 14, nivelRiesgo: 'MEDIO', prioridad: 37 }],
  cobranza: { cobrado: '550.00', pagos: 2, recuperadoPorRecordatorios: '300.00', recordatoriosEnviados: 1, diasPromedioCobro: null },
  porRuta: [],
  clientesPorRiesgo: { BAJO: 2, MEDIO: 1, ALTO: 0 },
}

it('muestra el dashboard con la respuesta real del backend', async () => {
  vi.spyOn(backend, 'bronmaApi').mockResolvedValue(respuesta)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><CollectionDashboard /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('Cartera total')).toBeTruthy()
  expect(screen.getByText('$4,650.00')).toBeTruthy()
  expect(screen.getByText('69.90% · 2 con atraso')).toBeTruthy()
  expect(screen.getByText('Sin pagos')).toBeTruthy()
  expect(screen.getByText('31 a 60 días')).toBeTruthy()
  expect(screen.queryByText('Al corriente')).toBeNull() // la grafica es solo de lo vencido
  expect(screen.getByText(/\$150\.00 a favor/)).toBeTruthy()
  expect(screen.getByText('Abarrotes La Peña')).toBeTruthy()
})

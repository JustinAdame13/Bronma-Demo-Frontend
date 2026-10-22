// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'

// Contra el backend real (fuera de la demo en memoria), para que el botón esté activo
vi.mock('../bronma', async original => ({ ...(await original<typeof import('../bronma')>()), demoMode: false, bronmaApi: vi.fn() }))

import { Reminders } from './CollectionPages'
import { bronmaApi } from '../bronma'

afterEach(() => { cleanup(); vi.mocked(bronmaApi).mockReset() })

const pagina = { contenido: [{ id: 1, clienteId: 7, clienteNombre: 'Abarrotes El Sol', folio: 'DEMO-1', programadoPara: '2026-10-22', estado: 'PENDIENTE', mensaje: null, error: null }], pagina: 0, tamano: 20, totalElementos: 1, totalPaginas: 1 }

it('ejecuta la corrida con "Enviar ahora" y muestra el resumen', async () => {
  vi.mocked(bronmaApi).mockImplementation(async (path: string) => path === '/recordatorios/ejecutar'
    ? { fecha: '2026-10-22', enviador: 'consola', generados: 3, enviados: 12, fallidos: 0, cancelados: 1, aviso: null }
    : pagina)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Reminders /></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('Abarrotes El Sol')).toBeTruthy()

  fireEvent.click(screen.getByText('Ver mensaje'))
  expect(screen.getByText(/se genera al enviarlo/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /Enviar ahora/ }))
  expect(await screen.findByText(/Corrida del 2026-10-22: 12 enviados, 0 con error, 3 nuevos programados, 1 cancelado\./)).toBeTruthy()
  expect(vi.mocked(bronmaApi)).toHaveBeenCalledWith('/recordatorios/ejecutar', { method: 'POST' })
})

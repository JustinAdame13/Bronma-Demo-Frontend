// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentForm } from './CollectionMap'
import * as backend from '../bronma'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ClientDetail } from '../bronma'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function mount(children: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>) }
const client = { id: 1, nombreNegocio: 'Cliente prueba', saldo: '100.00' } as ClientDetail
it('rechaza un pago en cero sin llamar al backend', async () => {
  const api = vi.spyOn(backend, 'bronmaApi')
  mount(<PaymentForm client={client} origin="OFICINA" onClose={() => {}} onSaved={() => {}} />)
  await userEvent.type(screen.getByLabelText('Monto en MXN'), '0')
  await userEvent.click(screen.getByRole('button', { name: 'Registrar pago de prueba' }))
  expect(screen.getByRole('alert').textContent).toContain('mayor que cero')
  expect(api).not.toHaveBeenCalled()
})
it('avisa que lo que pasa del saldo quedará a favor', async () => {
  mount(<PaymentForm client={client} origin="OFICINA" onClose={() => {}} onSaved={() => {}} />)
  await userEvent.type(screen.getByLabelText('Monto en MXN'), '100.01')
  expect(screen.getByText(/quedará como saldo a favor/).textContent).toContain('$0.01')
})
it('reutiliza el UUID y el importe exacto cuando falla la conexión y se reintenta', async () => {
  const api = vi.spyOn(backend, 'bronmaApi').mockRejectedValueOnce(new Error('Se perdió la conexión.')).mockResolvedValueOnce({})
  const saved = vi.fn()
  mount(<PaymentForm client={client} origin="RUTA" onClose={() => {}} onSaved={saved} />)
  await userEvent.type(screen.getByLabelText('Monto en MXN'), '10.29')
  await userEvent.click(screen.getByRole('button', { name: 'Registrar pago de prueba' }))
  expect(await screen.findByText('Se perdió la conexión.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Registrar pago de prueba' }))
  expect(saved).toHaveBeenCalledOnce()
  const first = JSON.parse(api.mock.calls[0][1]!.body as string)
  const retry = JSON.parse(api.mock.calls[1][1]!.body as string)
  expect(first.uuidDispositivo).toBe(retry.uuidDispositivo)
  expect(retry).toMatchObject({ monto: '10.29', origen: 'RUTA', metodo: 'EFECTIVO', aplicaciones: null })
})

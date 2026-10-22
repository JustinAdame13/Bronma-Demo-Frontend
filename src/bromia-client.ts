import { createMayaClient } from '../vendor/maya-portable/src/browser/index.js'
import type { MayaClient } from '../vendor/maya-portable/src/browser/client.js'
import { bronmaApi, clientStatus, currency, demoMode, priorityClients } from './bronma'
import type { DashboardDto, MapClient } from './bronma'

export const bromiaPrompts = ['¿A quién debo cobrar primero?', 'Muéstrame la cartera vencida', '¿Qué clientes están por vencer?', '¿Cómo registro un pago?']
// shortcut: respuestas guiadas en demo; en modo real BRONMIA consulta el proveedor del servidor.
export const bromiaClient: MayaClient = demoMode ? {
  async process(request) {
    const clients = await bronmaApi<MapClient[]>('/mapa/clientes')
    const text = request.message.toLocaleLowerCase('es-MX')
    if (/pago|registr/.test(text)) return { type: 'a2ui_screen', screenId: crypto.randomUUID(), assistantMessage: 'Para registrar un pago, selecciona un cliente en el mapa y elige «Registrar pago». Captura el importe y el método; revisa los datos antes de confirmar. En esta demo el pago es de prueba.', components: [{ id: 'open', type: 'ActionButton', props: { label: 'Abrir mapa de clientes', action: { type: 'OPEN_PAGE', payload: { path: '/mapa' } } } }], suggestedPrompts: bromiaPrompts.slice(0, 3) }
    if (!/cobr|cartera|client|venc|riesgo|ruta|saldo/.test(text)) return { type: 'a2ui_screen', screenId: crypto.randomUUID(), assistantMessage: 'Soy BRONMIA, tu asistente de cobranza BRONMA. En la demo puedo mostrar prioridades, cartera vencida y próximos vencimientos, o explicarte cómo registrar un pago. Elige una consulta para comenzar.', components: [], suggestedPrompts: bromiaPrompts }
    const soon = /por vencer|pr[oó]xim|vencer/.test(text)
    const selected = priorityClients(clients.filter(c => clientStatus(c) === (soon ? 'soon' : 'overdue'))).slice(0, 5)
    const dashboard = await bronmaApi<DashboardDto>('/dashboard')
    return { type: 'a2ui_screen', screenId: crypto.randomUUID(), assistantMessage: `Consulta guiada de demostración: ${soon ? 'estos clientes tienen vencimientos en los próximos 3 días' : `tu cartera vencida es de ${currency(dashboard.cartera.vencida)}. Estos clientes requieren atención, ordenados por la prioridad proporcionada`}.`, components: selected.map(c => ({ id: `client-${c.id}`, type: 'Card', props: { title: c.nombreNegocio }, children: [{ id: `balance-${c.id}`, type: 'Text', props: { text: `Saldo: ${currency(c.saldo)} · Vencido: ${currency(c.saldoVencido)} · ${c.diasAtrasoMax} días de atraso.` } }] })), suggestedPrompts: bromiaPrompts }
  },
} : createMayaClient({ endpoint: '/api/bromia/chat' })

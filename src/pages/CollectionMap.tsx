import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Upload, Check, ChevronRight, Crosshair, List, LocateFixed, Map as MapIcon, MapPin, Navigation, Search, Store, Wallet, X } from 'lucide-react'
import { divIcon, latLngBounds } from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import { bronmaApi, BronmaError, cents, clientStatus, currency, decimal, demoMode, hasLocation, priorityClients, statusNames } from '../bronma'
import type { ClientDetail, ClientStatus, MapClient, Payment, RouteDto } from '../bronma'
import { ErrorState, Loading, Modal, Notice, useOnline } from '../ui'

type LocationDraft = { latitud: number; longitud: number; fuente: 'GPS' | 'MANUAL'; precisionMetros?: number }
const actionNames: Record<string, string> = { SIN_ACCION: 'Mantener seguimiento habitual', COBRAR_PROXIMA_VISITA: 'Cobrar en la próxima visita', OFRECER_DESCUENTO_PRONTO_PAGO: 'Revisar descuento por pronto pago', REDUCIR_CREDITO: 'Revisar el límite de crédito', SUSPENDER_CREDITO: 'Revisar suspensión del crédito' }
export function StatusPill({ client }: { client: MapClient }) { const status = clientStatus(client); return <span className={`collection-status ${status}`}><i />{statusNames[status]}</span> }
function MapView({ clients, selected, fitKey, picking, onPick }: { clients: MapClient[]; selected?: MapClient; fitKey: string; picking: boolean; onPick: (draft: LocationDraft) => void }) {
  const map = useMap()
  const boundsKey = clients.filter(hasLocation).map(c => `${c.id}:${c.latitud}:${c.longitud}`).join('|')
  useEffect(() => {
    const located = clients.filter(hasLocation)
    if (located.length) map.fitBounds(latLngBounds(located.map(c => [c.latitud, c.longitud])), { padding: [65, 65], maxZoom: 15, animate: false })
    else map.setView([25.55, -103.41], 13)
  }, [map, fitKey, boundsKey]) // Coordinates drive fitting; hover and selection preserve the current zoom.
  useEffect(() => { if (selected && hasLocation(selected)) map.panTo([selected.latitud, selected.longitud]) }, [map, selected?.id, selected?.latitud, selected?.longitud])
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect() }, [map])
  useMapEvents({ click: e => { if (picking) onPick({ latitud: e.latlng.lat, longitud: e.latlng.lng, fuente: 'MANUAL' }) } })
  return null
}
export default function CollectionMap() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const routeParams = useParams()
  const routeId = routeParams.id || params.get('rutaId') || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClientStatus | 'all'>(params.get('avisos') ? 'overdue' : 'all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const [fitVersion, setFitVersion] = useState(0)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<LocationDraft | null>(null)
  const [locationError, setLocationError] = useState('')
  const [locationBusy, setLocationBusy] = useState(false)
  const [payment, setPayment] = useState(false)
  const [notice, setNotice] = useState('')
  const online = useOnline()
  const cache = useQueryClient()
  const routes = useQuery({ queryKey: ['bronma', 'rutas'], queryFn: () => bronmaApi<RouteDto[]>('/rutas?activo=true') })
  const query = useQuery({ queryKey: ['bronma', 'mapa', routeId], queryFn: () => bronmaApi<MapClient[]>(`/mapa/clientes${routeId ? `?rutaId=${encodeURIComponent(routeId)}` : ''}`) })
  const detail = useQuery({ queryKey: ['bronma', 'cliente', selectedId], queryFn: () => bronmaApi<ClientDetail>(`/clientes/${selectedId}`), enabled: selectedId !== null })
  const clients = query.data || []
  const visible = useMemo(() => priorityClients(clients.filter(c => (status === 'all' || clientStatus(c) === status) && c.nombreNegocio.toLocaleLowerCase('es-MX').includes(search.toLocaleLowerCase('es-MX')))), [clients, status, search])
  const selected = clients.find(c => c.id === selectedId)
  const located = visible.filter(hasLocation)
  const currentRoute = routes.data?.find(r => String(r.id) === routeId)
  useEffect(() => { setSelectedId(null); setDraft(null); setPicking(false); setLocationError('') }, [routeId])
  useEffect(() => { if (params.get('avisos')) setStatus('overdue') }, [params])
  function select(id: number) { setSelectedId(id); setDraft(null); setPicking(false); setLocationError(''); setNotice('') }
  async function saveLocation() {
    if (!draft || !selected || !online) return
    setLocationBusy(true); setLocationError('')
    try { await bronmaApi(`/clientes/${selected.id}/ubicacion`, { method: 'PATCH', body: JSON.stringify(draft) }); setDraft(null); setPicking(false); setNotice(demoMode ? 'Ubicación actualizada en la demo.' : 'Ubicación guardada.'); await cache.invalidateQueries({ queryKey: ['bronma'] }) }
    catch (e) { setLocationError(e instanceof Error ? e.message : 'No pudimos guardar la ubicación.') }
    finally { setLocationBusy(false) }
  }
  function locate() {
    setLocationError(''); setPicking(false)
    if (!navigator.geolocation) { setLocationError('Este navegador no permite consultar tu ubicación. Usa «Fijar en el mapa».'); return }
    setLocationBusy(true)
    navigator.geolocation.getCurrentPosition(position => {
      setLocationBusy(false)
      if (position.coords.accuracy > 100) { setLocationError(`Precisión de ${Math.round(position.coords.accuracy)} m. Intenta de nuevo al aire libre; necesitamos 100 m o menos.`); return }
      setDraft({ latitud: position.coords.latitude, longitud: position.coords.longitude, fuente: 'GPS', precisionMetros: position.coords.accuracy })
    }, error => { setLocationBusy(false); setLocationError(error.code === 1 ? 'No autorizaste el GPS. Puedes fijar la ubicación en el mapa.' : 'No pudimos obtener tu ubicación. Comprueba el GPS y vuelve a intentar.') }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  }
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorState error={query.error} retry={query.refetch} />
  return <div className="collection-page">
    <div className="map-page-toolbar"><h1>Mapa de clientes</h1><Link className="button primary map-import" to="/importar" aria-label="Importar cartera"><Upload size={16} /><span>Importar cartera</span></Link></div>
    <div className="collection-summary"><div><strong>{clients.length}</strong><span>clientes en cartera</span></div><div className="overdue"><strong>{clients.filter(c => clientStatus(c) === 'overdue').length}</strong><span>requieren atención</span></div><div className="soon"><strong>{clients.filter(c => clientStatus(c) === 'soon').length}</strong><span>próximos a vencer</span></div></div>
    <div className="map-workspace" data-mobile-view={mobileView}>
      <aside className="client-sidebar" aria-label="Clientes por prioridad">
        <div className="client-sidebar-heading"><h2>Clientes</h2><span className="client-count">{visible.length}</span></div>
        <label className="route-select"><MapPin size={17} /><span className="sr-only">Seleccionar ruta</span><select value={routeId} onChange={e => { const next = new URLSearchParams(params); if (e.target.value) next.set('rutaId', e.target.value); else next.delete('rutaId'); if (routeParams.id) navigate(`/mapa?${next}`); else setParams(next) }}><option value="">Todas las rutas</option>{routes.data?.map(r => <option value={r.id} key={r.id}>{r.nombre}</option>)}</select></label>
        {routes.isError && <Notice error message="No pudimos cargar las rutas. El mapa muestra los clientes disponibles." />}
        {currentRoute && <div className="route-owner"><span className="route-color" style={{ background: currentRoute.color }} />{currentRoute.repartidor?.nombre || 'Sin repartidor asignado'}<span>{currentRoute.codigoOrigen}</span></div>}
        <label className="client-search"><Search size={17} /><input placeholder="Buscar cliente…" aria-label="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="client-filters" aria-label="Filtrar por estado">{([['all', 'Todos'], ['overdue', 'Con avisos'], ['soon', 'Por vencer']] as const).map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div>
        <div className="client-list-caption"><span>{visible.length} clientes</span><span>Prioridad de cobro ↓</span></div>
        <ol className="client-list">{visible.map(c => { const state = clientStatus(c); return <li key={c.id}><button className={`client-card ${selectedId === c.id || hover === c.id ? 'selected' : ''}`} aria-pressed={selectedId === c.id} onClick={() => { select(c.id); setMobileView('map') }} onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}><span className={`client-store ${state}`}><Store size={18} /></span><span className="client-card-copy"><strong>{c.nombreNegocio}</strong><small>{c.diasAtrasoMax > 0 ? `${c.diasAtrasoMax} días de atraso` : state === 'soon' ? 'Vence en los próximos 3 días' : 'Sin atrasos'}{!hasLocation(c) && <span className="unlocated"> · Sin ubicación</span>}</small><span className="client-card-bottom"><b>{currency(c.saldo)}</b><span className={`client-row-status ${state}`}><span className={`status-dot ${state}`} />{c.estadoCredito === 'SUSPENDIDO' ? 'Suspendido' : c.nivelRiesgo === 'ALTO' ? 'Riesgo alto' : state === 'soon' ? 'Por vencer' : state === 'overdue' ? 'Vencido' : 'Al corriente'}</span></span></span><ChevronRight size={15} /></button></li> })}</ol>
        {!visible.length && <div className="map-empty"><Search size={24} /><strong>Sin coincidencias</strong><p>Prueba otro nombre o cambia los filtros.</p><button className="text-link" onClick={() => { setSearch(''); setStatus('all') }}>Limpiar filtros</button></div>}
      </aside>
      <section className={`map-stage ${picking ? 'picking' : ''}`} aria-label="Mapa de clientes de Torreón">
        <div className="map-location-label"><MapPin size={16} /><div><strong>Torreón, Coahuila</strong><span>{currentRoute?.nombre || 'Todas las rutas'} · {located.length} ubicaciones</span></div></div>
        <button className="map-recenter" aria-label="Centrar mapa en los clientes" title="Centrar mapa" onClick={() => setFitVersion(v => v + 1)}><Crosshair size={19} /></button>
        <MapContainer center={[25.55, -103.41]} zoom={13} zoomControl={false} className="bronma-map">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' eventHandlers={{ tileerror: () => setLocationError('No se pudo cargar parte del mapa. La lista de clientes sigue disponible.') }} />
          <ZoomControl position="bottomright" />
          <MapView clients={visible} selected={selected} fitKey={`${routeId}:${status}:${fitVersion}`} picking={picking} onPick={setDraft} />
          {routes.data?.filter(r => !routeId || String(r.id) === routeId).map(r => { const stops = located.filter(c => c.rutaId === r.id && c.ordenVisita !== null).sort((a, b) => a.ordenVisita! - b.ordenVisita!); return <Polyline key={r.id} positions={stops.map(c => [c.latitud, c.longitud] as LatLngTuple)} pathOptions={{ color: r.color, weight: 3, opacity: .7, dashArray: '7 9' }} /> })}
          <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14} showCoverageOnHover={false} maxClusterRadius={38}>{located.map(c => { const state = clientStatus(c), active = hover === c.id || selectedId === c.id; return <Marker key={c.id} position={[c.latitud, c.longitud]} title={`${c.nombreNegocio}: ${statusNames[state]}`} alt={`${c.nombreNegocio}: ${statusNames[state]}`} zIndexOffset={active ? 1000 : 0} icon={divIcon({ className: 'bronma-marker', html: `<span aria-hidden="true" class="map-pin ${state}${active ? ' active' : ''}${c.estadoCredito === 'SUSPENDIDO' ? ' suspended' : ''}"><span>${Number.isSafeInteger(c.ordenVisita) && c.ordenVisita! > 0 ? c.ordenVisita : '•'}</span>${state !== 'current' ? '<b class="pin-notification">!</b>' : ''}</span>`, iconSize: [36, 46], iconAnchor: [18, 42] })} eventHandlers={{ click: () => select(c.id), mouseover: () => setHover(c.id), mouseout: () => setHover(null) }}><Tooltip direction="top" offset={[0, -42]}>{c.nombreNegocio}<br />{currency(c.saldo)} · {statusNames[state]}</Tooltip></Marker> })}</MarkerClusterGroup>
          {draft && <Marker position={[draft.latitud, draft.longitud]} draggable eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); setDraft({ latitud: p.lat, longitud: p.lng, fuente: 'MANUAL' }) } }} icon={divIcon({ className: 'bronma-marker', html: '<span class="map-pin draft"><span>+</span></span>', iconSize: [36, 46], iconAnchor: [18, 42] })} />}
        </MapContainer>
        <div className="map-legend"><span><i className="overdue" />Requiere atención</span><span><i className="soon" />Por vencer</span><span><i className="current" />Al corriente</span></div>
        
        {picking && <div className="map-picking-message" role="status">Haz clic en el mapa para fijar la ubicación. Arrastra la chincheta para ajustar.</div>}
        {locationError && !selected && <div className="map-tile-error" role="alert">{locationError}</div>}
      </section>
      {selected && <aside className="client-detail" aria-label={`Detalle de ${selected.nombreNegocio}`}><div className="detail-heading"><span>Expediente</span><button className="icon-button" aria-label="Cerrar detalle" onClick={() => { setSelectedId(null); setDraft(null); setPicking(false) }}><X size={20} /></button></div><h2>{selected.nombreNegocio}</h2><StatusPill client={selected} /><div className="detail-balance"><span>Saldo por cobrar</span><strong>{currency(selected.saldo)}</strong><small>Vencido <b>{currency(selected.saldoVencido)}</b></small></div>
        {detail.isPending && <Loading />}{detail.isError && <ErrorState error={detail.error} retry={detail.refetch} />}
        {detail.data && <><div className="detail-contact"><MapPin size={16} /><span>{detail.data.direccion}</span></div>{detail.data.saldoAFavor && /^\d+\.\d{2}$/.test(detail.data.saldoAFavor) && cents(detail.data.saldoAFavor) > 0n && <Notice message={`Tiene ${currency(detail.data.saldoAFavor)} a favor. Se aplicará solo a su siguiente nota.`} />}<div className="risk-card"><div><strong>Riesgo de crédito</strong><span>{detail.data.riesgo ? `${detail.data.riesgo.score}/100` : 'Pendiente'}</span></div><p>{detail.data.riesgo?.explicacion || 'Este cliente todavía no tiene una evaluación.'}</p>{detail.data.riesgo && <b>{actionNames[detail.data.riesgo.accionRecomendada] || detail.data.riesgo.accionRecomendada}</b>}</div><div className="detail-notes"><h3>Notas abiertas <span>{detail.data.notasAbiertas.filter(n => n.estado !== 'PAGADA').length}</span></h3>{detail.data.notasAbiertas.filter(n => n.estado !== 'PAGADA').map(n => <div key={n.id}><span><strong>{n.folioOrigen}</strong><small>{n.vencida ? `${n.diasAtraso} días de atraso` : `Vence ${n.fechaVencimiento}`}</small></span><b>{currency(n.saldo)}</b></div>)}</div></>}
        <button className="button primary detail-pay" disabled={!online || !detail.data} onClick={() => setPayment(true)}><Wallet size={17} />Registrar pago</button>
        {hasLocation(selected) && <a className="button outlined" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitud},${selected.longitud}`} target="_blank" rel="noreferrer"><Navigation size={16} />Cómo llegar</a>}
        <div className="detail-location"><h3>Ubicación del negocio</h3><div><button className="button subtle" disabled={!online || locationBusy} onClick={() => { setPicking(true); setDraft(null); setMobileView('map'); setLocationError('') }}><MapPin size={15} />Fijar en el mapa</button><button className="button subtle" disabled={!online || locationBusy} onClick={locate}><LocateFixed size={15} />{locationBusy ? 'Buscando…' : 'Estoy aquí'}</button></div>{draft && <div className="location-confirm"><p>{draft.fuente === 'GPS' ? `GPS · precisión ${Math.round(draft.precisionMetros!)} m` : 'Ubicación manual'}<br />{draft.latitud.toFixed(6)}, {draft.longitud.toFixed(6)}</p><button className="button primary" disabled={locationBusy || !online} onClick={saveLocation}><Check size={16} />Guardar ubicación</button><button className="button subtle" onClick={() => { setDraft(null); setPicking(false) }}>Cancelar</button></div>}</div>
        {locationError && <Notice error message={locationError} />}{notice && <Notice message={notice} />}
      </aside>}
      <div className="mobile-map-tabs"><button aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}><MapIcon size={17} />Mapa</button><button aria-pressed={mobileView === 'list'} onClick={() => setMobileView('list')}><List size={17} />Lista ({visible.length})</button></div>
    </div>
    {payment && detail.data && <PaymentForm client={detail.data} route={currentRoute} origin={routeParams.id ? 'RUTA' : 'OFICINA'} onClose={() => setPayment(false)} onSaved={favor => { setPayment(false); setNotice(`${demoMode ? 'Pago simulado registrado. Los datos se reinician al recargar.' : 'Pago registrado correctamente.'}${favor ? ` Quedaron ${currency(favor)} a favor del cliente.` : ''}`); void cache.invalidateQueries({ queryKey: ['bronma'] }) }} />}
  </div>
}
export function PaymentForm({ client, route, origin, onClose, onSaved }: { client: ClientDetail; route?: RouteDto; origin: Payment['origen']; onClose: () => void; onSaved: (saldoAFavor: string | null) => void }) {
  const [uuid] = useState(() => crypto.randomUUID())
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [comentario, setComentario] = useState('')
  const [registradoPorId, setRegistradoPorId] = useState(String(route?.repartidor?.id || ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const online = useOnline()
  const users = useQuery({ queryKey: ['bronma', 'usuarios'], queryFn: () => bronmaApi<{ id: number; nombre: string; activo: boolean }[]>('/usuarios'), enabled: !demoMode })
  const montoNormalizado = /^\d+(\.\d{1,2})?$/.test(monto) ? `${monto.split('.')[0]}.${(monto.split('.')[1] || '').padEnd(2, '0')}` : ''
  const excedente = montoNormalizado && cents(montoNormalizado) > cents(client.saldo) ? cents(montoNormalizado) - cents(client.saldo) : 0n
  async function submit() {
    if (busy || !online) return
    setError(''); setFields({})
    const normalized = /^\d+(\.\d{1,2})?$/.test(monto) ? `${monto.split('.')[0]}.${(monto.split('.')[1] || '').padEnd(2, '0')}` : ''
    if (!normalized || cents(normalized) <= 0n) { setFields({ monto: 'Escribe un importe mayor que cero.' }); return }
    if (!demoMode && !/^[1-9]\d*$/.test(registradoPorId)) { setFields({ registradoPorId: 'Selecciona quién registra el pago.' }); return }
    setBusy(true)
    try { const saved = await bronmaApi<{ saldoAFavor?: string } | null>('/pagos', { method: 'POST', body: JSON.stringify({ clienteId: client.id, monto: normalized, metodo, origen: origin, comentario: comentario.trim(), uuidDispositivo: uuid, aplicaciones: null, ...(registradoPorId ? { registradoPorId: Number(registradoPorId) } : {}) }) }); onSaved(saved?.saldoAFavor && /^\d+\.\d{2}$/.test(saved.saldoAFavor) && cents(saved.saldoAFavor) > 0n ? saved.saldoAFavor : null) }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar el pago.'); if (e instanceof BronmaError) setFields(e.campos) }
    finally { setBusy(false) }
  }
  return <Modal title="Registrar pago" description={client.nombreNegocio} onClose={onClose} busy={busy}><form className="stack-form" onSubmit={e => { e.preventDefault(); void submit() }}><div className="payment-balance">Saldo actual<strong>{currency(client.saldo)}</strong></div>{demoMode && <p className="form-note">Pago de demostración. No se enviará al backend.</p>}<label>Monto en MXN<input autoFocus inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" required aria-invalid={!!fields.monto} aria-describedby={fields.monto ? 'payment-amount-error' : undefined} disabled={busy} /></label>{fields.monto && <p id="payment-amount-error" role="alert">{fields.monto}</p>}{!fields.monto && excedente > 0n && <p className="form-note">{cents(client.saldo) === 0n ? 'El cliente no debe nada: todo el pago' : `Lo que pasa de ${currency(client.saldo)}`} quedará como saldo a favor ({currency(decimal(excedente))}) y se aplicará solo en su siguiente nota.</p>}<label>Método de pago<select value={metodo} onChange={e => setMetodo(e.target.value)} disabled={busy}><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="DEPOSITO">Depósito</option></select></label>{!demoMode && <label>Registrado por<select value={registradoPorId} onChange={e => setRegistradoPorId(e.target.value)} required disabled={busy || users.isPending || users.isError}><option value="">Selecciona tu nombre</option>{users.data?.filter(u => u.activo).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>{users.isError && <span role="alert">No pudimos cargar los usuarios. Cierra y vuelve a abrir el formulario.</span>}{fields.registradoPorId && <span role="alert">{fields.registradoPorId}</span>}</label>}<label>Comentario (opcional)<textarea value={comentario} onChange={e => setComentario(e.target.value)} maxLength={500} rows={2} disabled={busy} /></label>{error && <Notice error message={error} />}<div className="modal-actions"><button type="button" className="button outlined" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy || !online}>{busy ? 'Guardando…' : demoMode ? 'Registrar pago de prueba' : 'Confirmar pago'}</button></div></form></Modal>
}

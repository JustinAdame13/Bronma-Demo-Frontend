import { useEffect } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { Bell, ChartNoAxesCombined, MapPin, MessageCircle, Settings2, Upload, WifiOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { bronmaApi, clientStatus } from './bronma'
import type { MapClient } from './bronma'
import { useOnline } from './ui'
import CollectionMap from './pages/CollectionMap'
import { CollectionDashboard, CollectionSettings, ImportPortfolio, Reminders } from './pages/CollectionPages'
import Softy from './Softy'

const navigation = [
  { to: '/mapa', label: 'Mapa de clientes', icon: MapPin },
  { to: '/dashboard', label: 'Cartera', icon: ChartNoAxesCombined },
  { to: '/recordatorios', label: 'Recordatorios', icon: MessageCircle },
  { to: '/importar', label: 'Importar', icon: Upload },
  { to: '/configuracion', label: 'Configuración', icon: Settings2 },
]
export default function App() {
  const location = useLocation()
  const online = useOnline()
  const clients = useQuery({ queryKey: ['bronma', 'mapa', ''], queryFn: () => bronmaApi<MapClient[]>('/mapa/clientes') })
  const alerts = clients.data?.filter(c => clientStatus(c) === 'overdue').length
  const mapPage = location.pathname === '/mapa' || location.pathname.startsWith('/ruta/')
  useEffect(() => { document.title = `${location.pathname === '/bromia' ? 'Bronma IA' : navigation.find(n => location.pathname.startsWith(n.to))?.label || 'Cobranza inteligente'} · BRONMA`; window.scrollTo({ top: 0 }); document.getElementById('main-content')?.focus({ preventScroll: true }) }, [location.pathname])
  return <div className={`bronma-shell workspace-shell${mapPage ? ' map-page-shell' : ''}`}><a className="skip-link" href="#main-content">Ir al contenido</a><header className="bronma-header"><Link to="/mapa" className="bronma-brand" aria-label="BRONMA · Inicio"><img src="/brand/bronma.png" alt="BRONMA" /><span>COBRANZA INTELIGENTE</span></Link><div className="bronma-header-actions"><Link to="/mapa?avisos=1" className="notification-button" aria-label={alerts === undefined ? 'Ver avisos de clientes' : `Ver ${alerts} clientes con avisos`}><Bell size={20} />{!!alerts && <span>{alerts}</span>}</Link><div className="header-divider" /><div className="operator-label"><strong>Equipo BRONMA</strong><span>Centro de cobranza</span></div></div></header><div className="bronma-nav-row"><nav className="bronma-nav" aria-label="Navegación principal">{navigation.map(n => <NavLink key={n.to} to={n.to} title={n.label} className={mapPage && n.to === '/mapa' ? 'active' : undefined}><n.icon size={18} /><span>{n.label}</span></NavLink>)}</nav><NavLink to="/bromia" className="bromia-entry"><img className="bromia-entry-logo" src="/brand/bronma-icon.svg" alt="" width="22" height="22" /><span>Bronma IA</span></NavLink></div>{!online && <div className="offline-banner" role="alert"><WifiOff size={18} />Sin conexión. Puedes consultar los datos cargados; conéctate para guardar.</div>}<main id="main-content" className="bronma-main" tabIndex={-1}><Routes><Route path="/" element={<Navigate to="/mapa" replace />} /><Route path="/mapa" element={<CollectionMap />} /><Route path="/ruta/:id" element={<CollectionMap />} /><Route path="/clientes" element={<Navigate to="/mapa" replace />} /><Route path="/dashboard" element={<CollectionDashboard />} /><Route path="/recordatorios" element={<Reminders />} /><Route path="/importar" element={<ImportPortfolio />} /><Route path="/configuracion" element={<CollectionSettings />} /><Route path="/ajustes" element={<Navigate to="/configuracion" replace />} /><Route path="/bromia" element={<Softy />} /><Route path="/softy" element={<Navigate to="/bromia" replace />} /><Route path="*" element={<div className="empty"><h1>No encontramos esta página</h1><Link className="button primary" to="/mapa">Volver al mapa</Link></div>} /></Routes></main></div>
}

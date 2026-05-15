import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ThemedToaster } from './components/ThemedToaster'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { DMO } from './pages/DMO'
import { Clientes } from './pages/Clientes'
import { Propiedades } from './pages/Propiedades'
import { Visitas } from './pages/Visitas'
import { Pipeline } from './pages/Pipeline'
import { Autorizaciones } from './pages/Autorizaciones'
import { Configuracion } from './pages/Configuracion'
import { Coaches } from './pages/Coaches'
import { DMOTemplates } from './pages/DMOTemplates'
import { AsignacionesDMO } from './pages/AsignacionesDMO'
import { DatosIA } from './pages/DatosIA'
import { MiPerfil } from './pages/MiPerfil'
import { Equipo } from './pages/Equipo'
import { Inbox } from './pages/Inbox'

function PrivateLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="flex flex-col items-center gap-3 animate-fade-in-up">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold animate-pulse-glow"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-accent)',
            fontFamily: 'Georgia, serif',
            fontSize: 22,
          }}
        >
          B
        </div>
        <div
          className="w-32 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border-color)' }}
        >
          <div className="h-full animate-shimmer" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dmo" element={<DMO />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/propiedades" element={<Propiedades />} />
        <Route path="/visitas" element={<Visitas />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/autorizaciones" element={<Autorizaciones />} />
        <Route path="/coaches" element={<Coaches />} />
        <Route path="/dmo-templates" element={<DMOTemplates />} />
        <Route path="/asignaciones-dmo" element={<AsignacionesDMO />} />
        <Route path="/datos-ia" element={<DatosIA />} />
        <Route path="/mi-perfil" element={<MiPerfil />} />
        <Route path="/equipo" element={<Equipo />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<PrivateLayout />} />
      </Routes>
      <ThemedToaster />
    </>
  )
}

import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Menu, X, ChevronLeft, ChevronRight,
  LayoutDashboard, ClipboardList, Users, Building2, Calendar,
  GitBranch, FileText, Settings, LogOut, GraduationCap, Layers, UserCog,
  MessageSquare, Brain,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from './ThemeSwitcher'
import { AvailabilityToggle } from './AvailabilityToggle'
import { BeykerLogo } from './BeykerLogo'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Mi DMO', to: '/dmo', icon: ClipboardList },
  { label: 'Inbox WhatsApp', to: '/inbox', icon: MessageSquare },
  { label: 'Clientes', to: '/clientes', icon: Users },
  { label: 'Propiedades', to: '/propiedades', icon: Building2 },
  { label: 'Visitas', to: '/visitas', icon: Calendar },
  { label: 'Pipeline', to: '/pipeline', icon: GitBranch },
  { label: 'Autorizaciones', to: '/autorizaciones', icon: FileText },
  { label: 'Coaches', to: '/coaches', icon: GraduationCap, roles: ['admin', 'gerente'] },
  { label: 'Templates DMO', to: '/dmo-templates', icon: Layers, roles: ['admin', 'gerente'] },
  { label: 'Asignaciones DMO', to: '/asignaciones-dmo', icon: UserCog, roles: ['admin', 'gerente'] },
  { label: 'Datos IA', to: '/datos-ia', icon: Brain, roles: ['admin', 'gerente'] },
  { label: 'Configuracion', to: '/configuracion', icon: Settings },
]

// BeykerLogo viene de ./BeykerLogo.tsx (SVG inline con CSS vars)

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const visible = navItems.filter((n) => !n.roles || n.roles.includes(user?.role ?? ''))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 md:px-6 bg-[var(--bg-topbar)] border-b border-[var(--border-color)] z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-card)] transition-all duration-200 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BeykerLogo />
          <div className="hidden sm:block min-w-0">
            <div className="font-bold text-base leading-tight truncate">Coldwell Banker Beyker</div>
            <div className="text-xs text-[var(--text-secondary)] truncate">Plataforma de gestión</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AvailabilityToggle />
          <ThemeSwitcher />
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-color)]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
              >
                {user.nombre[0]}{user.apellido[0]}
              </div>
              <div className="hidden md:block min-w-0">
                <div className="text-sm font-semibold truncate">{user.nombre} {user.apellido}</div>
                <div className="text-xs text-[var(--text-secondary)] capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-all duration-200 active:scale-95"
                title="Salir"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className={`hidden lg:flex flex-shrink-0 flex-col bg-[var(--bg-sidebar)] text-[var(--text-sidebar)] border-r border-[var(--border-color)] transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
          <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
            {visible.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-[var(--color-primary)] font-semibold'
                      : 'hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="flex-shrink-0 p-3 border-t border-white/10">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-95"
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-64 flex flex-col bg-[var(--bg-sidebar)] text-[var(--text-sidebar)]">
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
                <span className="font-bold">Menú</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-primary)] font-semibold'
                          : 'hover:bg-white/10'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)] overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

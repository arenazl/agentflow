import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Home, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BeykerLogo } from '../components/BeykerLogo'

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('gerente@beyker.demo')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Background: foto inmobiliaria con overlay navy */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 37, 84, 0.92) 0%, rgba(0, 26, 58, 0.95) 100%)',
        }}
      />

      {/* Gold glow accents */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #c9a45a, transparent)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #c9a45a, transparent)' }}
      />

      <div className="relative h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Glass card */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl border animate-fade-in-up"
            style={{
              backgroundColor: 'rgba(15, 29, 58, 0.85)',
              borderColor: 'rgba(201, 164, 90, 0.3)',
            }}
          >
            <div
              className="h-1"
              style={{ background: 'linear-gradient(90deg, transparent, #c9a45a, transparent)' }}
            />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <BeykerLogo size={56} rounded={10} bg="#002554" fg="#c9a45a" />
                <div className="min-w-0">
                  <div className="font-bold text-lg text-white leading-tight">Coldwell Banker Beyker</div>
                  <div className="text-xs text-slate-300">Plataforma de gestión</div>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                <Sparkles className="h-4 w-4 inline mr-1 text-[#c9a45a]" />
                Aliados en tu camino, expertos en cada decisión.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-3 py-2.5 rounded-lg border bg-black/30 text-white focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'rgba(201, 164, 90, 0.3)',
                      // @ts-ignore
                      '--tw-ring-color': '#c9a45a',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 text-slate-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 rounded-lg border bg-black/30 text-white focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'rgba(201, 164, 90, 0.3)',
                      // @ts-ignore
                      '--tw-ring-color': '#c9a45a',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #c9a45a, #d9b878)',
                    color: '#002554',
                  }}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <span className="relative">{loading ? 'Ingresando...' : 'Ingresar'}</span>
                </button>
              </form>

              <div
                className="mt-6 p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'rgba(201, 164, 90, 0.08)',
                  borderColor: 'rgba(201, 164, 90, 0.25)',
                }}
              >
                <div className="font-semibold mb-1.5 text-[#c9a45a] uppercase tracking-wider text-[10px]">Cuentas demo</div>
                <div className="space-y-0.5 text-slate-300 font-mono">
                  <div>gerente@beyker.demo · admin123</div>
                  <div>lautaro@beyker.demo · admin123</div>
                  <div>admin@beyker.demo · admin123</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4 text-xs text-slate-400 flex items-center justify-center gap-1">
            <Home className="h-3 w-3" />
            <span>Florida 826, CABA</span>
          </div>
        </div>
      </div>
    </div>
  )
}

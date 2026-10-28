import { useEffect, useState, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider'
import { PrintProvider } from '@/components/print/PrintProvider'
import { Layout } from '@/components/Layout'
import { store, useSettings } from '@/data/store'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { OrdersPage } from '@/features/orders/OrdersPage'
import { OrderEditor } from '@/features/orders/OrderEditor'
import { QuotesPage } from '@/features/quotes/QuotesPage'
import { QuoteEditor } from '@/features/quotes/QuoteEditor'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { PartsPage } from '@/features/parts/PartsPage'
import { ServicesPage } from '@/features/services/ServicesPage'
import { CleanupPage } from '@/features/cleanup/CleanupPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ensureDefaultAdmin } from '@/services/auth'

async function bootstrap(): Promise<void> {
  await store.init()
  await ensureDefaultAdmin()
}

/** Aplica tema, cor primária, densidade e arredondamento configurados */
function ThemeSync() {
  const { appearance } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      root.dataset.theme = appearance.theme === 'system' ? (media.matches ? 'dark' : 'light') : appearance.theme
    }
    apply()
    root.dataset.density = appearance.density
    root.style.setProperty('--primary', appearance.primary)
    root.style.setProperty('--radius', `${appearance.radius}px`)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])

  return null
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  if (!user) return <LoginPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="ordens" element={<OrdersPage />} />
        <Route path="ordens/nova" element={<OrderEditor key="new" />} />
        <Route path="ordens/:id" element={<OrderEditor />} />
        <Route path="orcamentos" element={<QuotesPage />} />
        <Route path="orcamentos/novo" element={<QuoteEditor key="new" />} />
        <Route path="orcamentos/:id" element={<QuoteEditor />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="pecas" element={<PartsPage />} />
        <Route path="servicos" element={<ServicesPage />} />
        <Route path="limpeza" element={<CleanupPage />} />
        <Route
          path="configuracoes"
          element={
            <AdminOnly>
              <SettingsPage />
            </AdminOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const [ready, setReady] = useState(store.ready)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) bootstrap().then(() => setReady(true), (e) => setError(String(e)))
  }, [ready])

  if (error) return <div className="splash">Erro ao carregar os dados: {error}</div>
  if (!ready)
    return (
      <div className="splash">
        <Loader2 className="spin" />
      </div>
    )

  return (
    <HashRouter>
      <ThemeSync />
      <FeedbackProvider>
        <PrintProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </PrintProvider>
      </FeedbackProvider>
    </HashRouter>
  )
}

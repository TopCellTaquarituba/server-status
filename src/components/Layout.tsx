import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, FileText, KeyRound, LayoutDashboard, LogOut, Package, Plus, Settings, ShieldCheck, Smartphone, Users, Wrench } from 'lucide-react'
import { Button } from '@/components/ui'
import { useCollection, useSettings } from '@/data/store'
import { ROLES } from '@/domain/defaults'
import { useAuth, useCurrentUser } from '@/features/auth/AuthContext'
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal'
import { initials } from '@/lib/format'
import { cx } from '@/lib/utils'
import { isClosed } from '@/services/orders'
import { isLowStock } from '@/services/catalog'

export function Layout() {
  const user = useCurrentUser()
  const { logout, isAdmin } = useAuth()
  const settings = useSettings()
  const orders = useCollection('orders')
  const parts = useCollection('parts')
  const navigate = useNavigate()
  const [pwdOpen, setPwdOpen] = useState(false)

  const openOrders = orders.filter((o) => !isClosed(o.status)).length
  const lowStock = parts.filter(isLowStock).length
  const company = settings.company

  const nav = [
    { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
    { to: '/ordens', label: 'Ordens de serviço', icon: ClipboardList, count: openOrders },
    { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/pecas', label: 'Peças & produtos', icon: Package, count: lowStock || undefined },
    { to: '/servicos', label: 'Serviços', icon: Wrench },
    { to: '/limpeza', label: 'Limpeza Android', icon: ShieldCheck },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {company.logo ? (
            <img src={company.logo} className="brand-logo" alt="" />
          ) : (
            <div className="brand-mark">
              <Smartphone size={20} />
            </div>
          )}
          <div className="brand-text">
            <strong>{company.tradeName || company.name}</strong>
            <span>Gestão de serviços</span>
          </div>
        </div>

        <Button variant="primary" icon={<Plus />} onClick={() => navigate('/ordens/nova')} style={{ width: '100%', height: 42 }}>
          Nova ordem de serviço
        </Button>

        <nav className="nav">
          <div className="nav-label">Operação</div>
          {nav.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('nav-item', isActive && 'active')}>
              <Icon />
              {label}
              {count ? <span className="count">{count}</span> : null}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="nav-label">Sistema</div>
              <NavLink to="/configuracoes" className={({ isActive }) => cx('nav-item', isActive && 'active')}>
                <Settings />
                Configurações
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">{initials(user.name)}</div>
            <div className="info">
              <strong>{user.name}</strong>
              <span>{ROLES[user.role]}</span>
            </div>
            <Button size="sm" variant="ghost" iconOnly icon={<KeyRound />} onClick={() => setPwdOpen(true)} title="Alterar senha" aria-label="Alterar senha" />
            <Button size="sm" variant="ghost" iconOnly icon={<LogOut />} onClick={logout} title="Sair" aria-label="Sair" />
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <ChangePasswordModal user={user} open={pwdOpen || user.mustChangePassword} forced={user.mustChangePassword} onClose={() => setPwdOpen(false)} />
    </div>
  )
}

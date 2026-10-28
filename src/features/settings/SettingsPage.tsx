import { useState, type ReactNode } from 'react'
import { Building2, ClipboardList, Database, Palette, Printer, QrCode, ShieldCheck, Smartphone, Tag, Tags } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import { cx } from '@/lib/utils'
import { AppearanceSection } from './AppearanceSection'
import { BackupSection } from './BackupSection'
import { CleanupSection } from './CleanupSection'
import { CompanySection } from './CompanySection'
import { OrderLabelSection, ProductLabelSection } from './LabelsSection'
import { OrdersSection } from './OrdersSection'
import { PrintersSection } from './PrintersSection'
import { StatusPageSection } from './StatusPageSection'
import { UsersSection } from './UsersSection'

type SectionKey = 'company' | 'appearance' | 'printers' | 'productLabel' | 'orderLabel' | 'orders' | 'tracking' | 'cleanup' | 'users' | 'backup'

const SECTIONS: { key: SectionKey; label: string; icon: ReactNode; render: () => ReactNode }[] = [
  { key: 'company', label: 'Empresa', icon: <Building2 />, render: () => <CompanySection /> },
  { key: 'appearance', label: 'Aparência', icon: <Palette />, render: () => <AppearanceSection /> },
  { key: 'printers', label: 'Impressoras', icon: <Printer />, render: () => <PrintersSection /> },
  { key: 'productLabel', label: 'Etiquetas de produtos', icon: <Tags />, render: () => <ProductLabelSection /> },
  { key: 'orderLabel', label: 'Etiqueta do aparelho', icon: <Tag />, render: () => <OrderLabelSection /> },
  { key: 'orders', label: 'Ordens & orçamentos', icon: <ClipboardList />, render: () => <OrdersSection /> },
  { key: 'tracking', label: 'Acompanhamento do cliente', icon: <QrCode />, render: () => <StatusPageSection /> },
  { key: 'cleanup', label: 'Limpeza Android', icon: <Smartphone />, render: () => <CleanupSection /> },
  { key: 'users', label: 'Usuários', icon: <ShieldCheck />, render: () => <UsersSection /> },
  { key: 'backup', label: 'Backup & dados', icon: <Database />, render: () => <BackupSection /> },
]

export function SettingsPage() {
  const [section, setSection] = useState<SectionKey>('company')
  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]

  return (
    <div className="page">
      <PageHeader title="Configurações" subtitle="Personalize o sistema para a sua assistência" />
      <div className="settings-layout">
        <nav className="card vtabs">
          {SECTIONS.map((s) => (
            <button key={s.key} type="button" className={cx('vtab', s.key === section && 'active')} onClick={() => setSection(s.key)}>
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>
        <div key={current.key}>{current.render()}</div>
      </div>
    </div>
  )
}

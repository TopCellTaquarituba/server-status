import { useEffect, useRef, useState } from 'react'
import { Database, Download, FolderOpen, Sparkles, Upload } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useCurrentUser } from '@/features/auth/AuthContext'
import { getDataDir, isDesktop, openDataDir } from '@/infra/platform'
import { exportBackup, importBackup } from '@/services/backup'
import { loadDemoData } from '@/services/seed'
import { readFileAsText } from '@/lib/utils'

export function BackupSection() {
  const { confirm, run } = useFeedback()
  const user = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dir, setDir] = useState<string | null>(null)

  useEffect(() => {
    void getDataDir().then(setDir)
  }, [])

  const onImport = async (file?: File) => {
    if (!file) return
    const ok = await confirm({
      title: 'Restaurar backup?',
      message: 'Todos os dados atuais serão substituídos pelos dados do arquivo. Recomendamos exportar um backup antes.',
      confirmLabel: 'Restaurar',
      danger: true,
    })
    if (fileRef.current) fileRef.current.value = ''
    if (!ok) return
    await run(async () => importBackup(await readFileAsText(file)), 'Backup restaurado com sucesso')
  }

  return (
    <div className="stack">
      <Card title="Backup e dados" icon={<Database />} subtitle="Os dados ficam salvos neste computador">
        <div className="stack">
          {isDesktop ? (
            <div className="alert tone-green">
              <Database />
              <div>
                Backup automático diário ativo (últimos 30 dias).
                {dir && (
                  <>
                    <br />
                    <span className="mono small">{dir}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="alert tone-amber">
              <Database />
              <div>Modo navegador: os dados ficam no armazenamento do navegador. Use o app desktop para backup automático em arquivo.</div>
            </div>
          )}
          <div className="row wrap">
            <Button icon={<Download />} onClick={exportBackup}>
              Exportar backup (.json)
            </Button>
            <Button icon={<Upload />} onClick={() => fileRef.current?.click()}>
              Restaurar backup
            </Button>
            {isDesktop && (
              <Button variant="ghost" icon={<FolderOpen />} onClick={openDataDir}>
                Abrir pasta de dados
              </Button>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>
      </Card>

      <Card title="Demonstração" icon={<Sparkles />} subtitle="Adiciona clientes, peças, serviços e ordens de exemplo">
        <Button
          icon={<Sparkles />}
          onClick={async () => {
            if (await confirm({ title: 'Carregar dados de demonstração?', message: 'Os registros de exemplo serão adicionados aos dados atuais.' }))
              await run(() => loadDemoData(user.name), 'Dados de demonstração carregados')
          }}
        >
          Carregar dados de exemplo
        </Button>
      </Card>
    </div>
  )
}

import { Field, Input, Select, Textarea } from '@/components/ui'
import { PatternLock } from '@/components/shared/PatternLock'
import { useSettings } from '@/data/store'
import { PASSWORD_TYPES } from '@/domain/defaults'
import type { Device, PasswordType } from '@/domain/types'
import { isValidImei } from '@/lib/validation'
import { onlyDigits } from '@/lib/format'

export function DeviceFields({ device, onChange, compact }: { device: Device; onChange: (patch: Partial<Device>) => void; compact?: boolean }) {
  const { orders } = useSettings()
  const imeiError = device.imei && !isValidImei(device.imei) ? 'IMEI inválido (confira os 15 dígitos — *#06#)' : null

  return (
    <div className="form-grid">
      <Field label="Tipo" span={3}>
        <Select value={device.type} onChange={(e) => onChange({ type: e.target.value })}>
          {orders.deviceTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="Marca" span={4}>
        <Input value={device.brand} onChange={(e) => onChange({ brand: e.target.value })} list="brands" placeholder="Samsung, Apple, Motorola..." />
        <datalist id="brands">
          {['Samsung', 'Apple', 'Motorola', 'Xiaomi', 'LG', 'Asus', 'Realme', 'Nokia', 'Positivo', 'Multilaser', 'Infinix', 'Huawei'].map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </Field>
      <Field label="Modelo" required span={5}>
        <Input value={device.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Ex.: Galaxy A54 5G" />
      </Field>
      {!compact && (
        <>
          <Field label="IMEI" span={4} error={imeiError}>
            <Input value={device.imei} onChange={(e) => onChange({ imei: onlyDigits(e.target.value).slice(0, 15) })} className="mono" placeholder="15 dígitos" />
          </Field>
          <Field label="Nº de série" span={4}>
            <Input value={device.serial} onChange={(e) => onChange({ serial: e.target.value })} />
          </Field>
          <Field label="Cor" span={4}>
            <Input value={device.color} onChange={(e) => onChange({ color: e.target.value })} />
          </Field>
          <Field label="Acessórios entregues" span={6}>
            <Input value={device.accessories} onChange={(e) => onChange({ accessories: e.target.value })} placeholder="Capinha, chip, cartão de memória, carregador..." />
          </Field>
          <Field label="Senha de desbloqueio" span={6}>
            <Select value={device.passwordType} onChange={(e) => onChange({ passwordType: e.target.value as PasswordType, password: '' })}>
              {Object.entries(PASSWORD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          {device.passwordType === 'padrao' && (
            <Field label="Desenho do padrão" span={12} as="div">
              <PatternLock value={device.password} onChange={(password) => onChange({ password })} />
            </Field>
          )}
          {(device.passwordType === 'pin' || device.passwordType === 'senha') && (
            <Field label={PASSWORD_TYPES[device.passwordType]} span={6} hint="Exibida apenas na via da loja">
              <Input value={device.password} onChange={(e) => onChange({ password: e.target.value })} className="mono" />
            </Field>
          )}
          <Field label="Estado físico do aparelho" span={12}>
            <Textarea rows={2} value={device.condition} onChange={(e) => onChange({ condition: e.target.value })} placeholder="Riscos, trincas, amassados, marcas de uso..." />
          </Field>
        </>
      )}
    </div>
  )
}

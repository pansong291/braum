import { createRoot } from 'react-dom/client'
import { StrictMode, useMemo, useState } from 'react'
import { Button, Checkbox, FluentProvider, Input, Label, makeStyles, Textarea, tokens, useId, webLightTheme } from '@fluentui/react-components'

if (import.meta.env.PROD) {
  document.title = '激活码生成'
}

type Product = {
  id?: string
  name: string
  code: string
}

const products: Product[] = [
  { code: 'DB', name: 'DataGrip' },
  { code: 'PS', name: 'PhpStorm' },
  { code: 'YTD', name: 'YouTrack' },
  { code: 'DM', name: 'dotMemory' },
  { code: 'CWME', name: 'Code With Me Lobby' },
  { code: 'DP', name: 'dotTrace' },
  { code: 'DS', name: 'DataSpell' },
  { code: 'AC', name: 'AppCode' },
  { code: 'AIR', name: 'Air' },
  { code: 'RC', name: 'ReSharper C++' },
  { code: 'RD', name: 'Rider' },
  { code: 'II', name: 'IntelliJ IDEA' },
  { code: 'RSU', name: 'ReSharper Tools' },
  { code: 'TCC0', name: 'TeamCity Cloud' },
  { code: 'RM', name: 'RubyMine' },
  { code: 'PC', name: 'PyCharm' },
  { code: 'RR', name: 'RustRover' },
  { code: 'RS0', name: 'ReSharper' },
  { code: 'FL', name: 'Fleet' },
  { code: 'WS', name: 'WebStorm' },
  { code: 'GO', name: 'GoLand' },
  { code: 'CL', name: 'CLion' },
  { code: 'TC', name: 'TeamCity' },
  { code: 'DC', name: 'dotCover' },
  { id: '7499', name: 'GitToolBox', code: 'PGITTOOLBOX' },
  { id: '10080', name: 'Rainbow Brackets', code: 'PRAINBOWBRACKET' }
]

const storageKeys = {
  privateKey: 'active-code.private-key',
  certificate: 'active-code.certificate'
}

const useStyles = makeStyles({
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    padding: '24px'
  },
  form: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  pre: {
    fontFamily: tokens.fontFamilyMonospace
  },
  productList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '8px',
    '--spacingVerticalS': '16px',
    '--spacingHorizontalS': '16px'
  },
  productItem: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1
  },
  productItemLabel: {
    flex: 'auto'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  status: {
    color: tokens.colorNeutralForeground3
  },
  error: {
    color: tokens.colorPaletteRedForeground1
  }
})

const randomLicenseId = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = new Uint8Array(15)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (it) => chars[it % chars.length]).join('')
}

const stripPem = (value: string) =>
  value
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '')

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const toBase64Utf8 = (value: string) => bytesToBase64(new TextEncoder().encode(value))

const buildLicenseJson = (licenseId: string, selectedProducts: Product[], expireDate: string) => {
  const productItems = selectedProducts.map((product) => ({
    code: product.code,
    fallbackDate: expireDate,
    paidUpTo: expireDate,
    extended: false
  }))

  return JSON.stringify({
    licenseId,
    licenseeName: 'Test',
    licenseeType: 'PERSONAL',
    assigneeName: 'Personal',
    assigneeEmail: '',
    licenseRestriction: '',
    checkConcurrentUse: false,
    products: productItems,
    metadata: '0120230102PPAA013009',
    hash: '41472961/0:1563609451',
    gracePeriodDays: 7,
    autoProlongated: true,
    isAutoProlongated: true,
    trial: false,
    aiAllowed: true
  })
}

const importPrivateKey = (privateKeyText: string) =>
  crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(stripPem(privateKeyText)),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-1'
    },
    false,
    ['sign']
  )

const generateActiveCode = async (privateKeyText: string, certificateText: string, selectedProducts: Product[], expireDate: string) => {
  const privateKey = await importPrivateKey(privateKeyText)
  const licenseId = randomLicenseId()
  const json = buildLicenseJson(licenseId, selectedProducts, expireDate)
  const jsonBytes = new TextEncoder().encode(json)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, jsonBytes)
  const certificateBase64 = bytesToBase64(base64ToBytes(stripPem(certificateText)))

  return [licenseId, toBase64Utf8(json), bytesToBase64(new Uint8Array(signature)), certificateBase64].join('-')
}

const getDefaultExpireDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

const readStoredValue = (key: string) => {
  try {
    return localStorage.getItem(key) || ''
  } catch (e) {
    console.warn('Failed to read localStorage', e)
    return ''
  }
}

const saveStoredCredentials = (privateKeyText: string, certificateText: string) => {
  try {
    localStorage.setItem(storageKeys.privateKey, privateKeyText)
    localStorage.setItem(storageKeys.certificate, certificateText)
  } catch (e) {
    console.warn('Failed to write localStorage', e)
  }
}

const App = () => {
  const styles = useStyles()
  const privateKeyInputId = useId('private-key')
  const certificateInputId = useId('certificate')
  const expireInputId = useId('expire')
  const resultInputId = useId('result')
  const [privateKeyText, setPrivateKeyText] = useState(() => readStoredValue(storageKeys.privateKey))
  const [certificateText, setCertificateText] = useState(() => readStoredValue(storageKeys.certificate))
  const [expireDate, setExpireDate] = useState(getDefaultExpireDate())
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const selectedProducts = useMemo(() => products.filter((product) => selectedProductCodes.includes(product.code)), [selectedProductCodes])

  const toggleProduct = (code: string, checked: boolean) => {
    setSelectedProductCodes((prev) => (checked ? Array.from(new Set([...prev, code])) : prev.filter((it) => it !== code)))
  }

  const onGenerateClick = async () => {
    setError('')
    setStatus('')
    setResult('')
    if (!privateKeyText.trim()) {
      setError('请输入 PKCS8 格式的 RSA 私钥')
      return
    }
    if (!certificateText.trim()) {
      setError('请输入证书内容')
      return
    }
    if (!selectedProducts.length) {
      setError('请至少选择一个产品')
      return
    }
    if (!expireDate) {
      setError('请选择到期时间')
      return
    }

    setProcessing(true)
    try {
      const activeCode = await generateActiveCode(privateKeyText, certificateText, selectedProducts, expireDate)
      setResult(activeCode)
      saveStoredCredentials(privateKeyText, certificateText)
      await navigator.clipboard.writeText(activeCode)
      setStatus('生成成功，已复制到剪贴板')
    } catch (e) {
      console.error(e)
      setError('生成失败，请检查私钥、证书和浏览器加密能力是否可用')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor={privateKeyInputId}>PKCS8 RSA 私钥</Label>
          <Textarea
            id={privateKeyInputId}
            textarea={{ className: styles.pre }}
            rows={6}
            spellCheck={false}
            resize="vertical"
            value={privateKeyText}
            onChange={(_, data) => setPrivateKeyText(data.value)}
            placeholder="-----BEGIN PRIVATE KEY-----"
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor={certificateInputId}>证书内容</Label>
          <Textarea
            id={certificateInputId}
            textarea={{ className: styles.pre }}
            rows={6}
            spellCheck={false}
            resize="vertical"
            value={certificateText}
            onChange={(_, data) => setCertificateText(data.value)}
            placeholder="-----BEGIN CERTIFICATE-----"
          />
        </div>
        <div className={styles.field}>
          <Label>产品</Label>
          <div className={styles.productList}>
            {products.map((product) => (
              <Checkbox
                key={product.code}
                className={styles.productItem}
                label={{ className: styles.productItemLabel, children: product.id ? `${product.id} - ${product.name}` : product.name }}
                checked={selectedProductCodes.includes(product.code)}
                onChange={(_, data) => toggleProduct(product.code, Boolean(data.checked))}
              />
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <Label htmlFor={expireInputId}>到期时间</Label>
          <Input id={expireInputId} type="date" value={expireDate} onChange={(_, data) => setExpireDate(data.value)} />
        </div>
        <div className={styles.actions}>
          <Button as="button" appearance="primary" disabled={processing} onClick={onGenerateClick}>
            {processing ? '生成中...' : '确定'}
          </Button>
          {status && <span className={styles.status}>{status}</span>}
          {error && <span className={styles.error}>{error}</span>}
        </div>
        <div className={styles.field}>
          <Label htmlFor={resultInputId}>激活码结果</Label>
          <Textarea
            id={resultInputId}
            textarea={{ className: styles.pre }}
            rows={8}
            spellCheck={false}
            resize="vertical"
            value={result}
            onChange={(_, data) => setResult(data.value)}
          />
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </StrictMode>
)

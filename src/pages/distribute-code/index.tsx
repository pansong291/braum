import { createRoot } from 'react-dom/client'
import { StrictMode, useMemo, useState } from 'react'
import { FluentProvider, Label, makeStyles, Textarea, tokens, useId, webLightTheme } from '@fluentui/react-components'
import { toCode } from '@/lib/pan'

const useStyles = makeStyles({
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px'
  },
  pre: {
    fontFamily: tokens.fontFamilyMonospace
  }
})

const parseParams = (url: string): Record<string, string> => {
  const map: Record<string, string> = Object.create(null)
  const start = url.indexOf('?') + 1
  if (!start) return map
  const end = url.indexOf('#', start)
  url
    .substring(start, end < 0 ? undefined : end)
    .split('&')
    .forEach((p) => {
      const entry = p.split('=')
      map[entry[0]] = entry[1]
    })
  return map
}

const App = () => {
  const styles = useStyles()
  const [text, setText] = useState('')
  const inputId = useId('input')

  const codes = useMemo(() => {
    return text
      .split('\n')
      .map((it) => {
        try {
          return `\n"${toCode(it)}", "${parseParams(it).pwd}", "${it}"`
        } catch (e) {
          return ''
        }
      })
      .join('')
  }, [text])

  return (
    <div className={styles.container}>
      <Label htmlFor={inputId}>请在下方填入链接</Label>
      <Textarea
        id={inputId}
        textarea={{ className: styles.pre }}
        rows={10}
        spellCheck={false}
        value={text}
        onChange={(_, d) => setText(d.value)}
        placeholder="一行一个"
        resize="vertical"
      />
      <pre className={styles.pre}>{codes}</pre>
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

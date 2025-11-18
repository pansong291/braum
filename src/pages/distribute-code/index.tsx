import { createRoot } from 'react-dom/client'
import { StrictMode, useMemo, useState } from 'react'
import { FluentProvider, Label, makeStyles, Textarea, tokens, useId, webLightTheme } from '@fluentui/react-components'
import { toCode } from '@/lib/pan123'

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

const App = () => {
  const styles = useStyles()
  const [text, setText] = useState('')
  const inputId = useId('input')

  const codes = useMemo(() => {
    return text
      .split('\n')
      .map((it) => {
        try {
          return toCode(it)
        } catch (e) {
          return ''
        }
      })
      .join('\n')
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

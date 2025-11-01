import { createRoot } from 'react-dom/client'
import { StrictMode, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  FluentProvider,
  Input,
  Label,
  Link,
  makeStyles,
  useId,
  useRestoreFocusTarget,
  webLightTheme
} from '@fluentui/react-components'
import { toURL } from '@/lib/pan123'
import GoofishBanner from '@/components/GoofishBanner'

const useStyles = makeStyles({
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px'
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  }
})

const App = () => {
  const styles = useStyles()
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [openAlert, setOpenAlert] = useState(false)
  const [failedMsg, setFailedMsg] = useState('')
  const okFocusRestore = useRestoreFocusTarget()
  const inputId = useId('input')

  const alert = (msg: string) => {
    setFailedMsg(msg)
    setOpenAlert(true)
  }

  const onOkClick = () => {
    if (!text) {
      alert('认证码不能为空')
      return
    }
    const code = text.trim()
    try {
      if (code.length <= 2) throw new Error()
      setLink(toURL(code))
      setText('')
    } catch (e) {
      alert('认证码不正确')
      setLink('')
    }
  }

  return (
    <div className={styles.container}>
      <GoofishBanner />
      <div className={styles.main}>
        <Label htmlFor={inputId}>请输入认证码</Label>
        <Input id={inputId} value={text} onChange={(_, d) => setText(d.value)} />
        <Button as="button" appearance="primary" onClick={onOkClick} {...okFocusRestore}>
          确定
        </Button>
      </div>
      {link && (
        <ol>
          <li>
            <Link href="https://v.douyin.com/APe2vddKooc/">请先点击此链接</Link>
          </li>
          <li>
            <Link href={link}>再点击此链接</Link>
          </li>
        </ol>
      )}
      <Dialog modalType="alert" open={openAlert} onOpenChange={(_, d) => setOpenAlert(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>错误</DialogTitle>
            <DialogContent>{failedMsg}</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button as="button" appearance="secondary">
                  关闭
                </Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
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

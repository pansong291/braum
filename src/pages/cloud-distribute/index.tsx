import { createRoot } from 'react-dom/client'
import { ReactNode, StrictMode, useState } from 'react'
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
  mergeClasses,
  tokens,
  useId,
  useRestoreFocusTarget,
  webLightTheme
} from '@fluentui/react-components'
import { toURL } from '@/lib/pan'
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
  },
  label: {
    marginInlineEnd: '12px'
  },
  input: {
    fontFamily: tokens.fontFamilyMonospace
  },
  card: {
    marginBlock: '0',
    paddingBlock: '1em',
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8
  },
  centerBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingInline: '2em'
  }
})

const App = () => {
  const styles = useStyles()
  const [authText, setAuthText] = useState('')
  const [pickText, setPickText] = useState('')
  const [link, setLink] = useState('')
  const [openAlert, setOpenAlert] = useState(false)
  const [alertTitle, setAlertTitle] = useState<ReactNode>('')
  const [alertMessage, setAlertMessage] = useState<ReactNode>('')
  const [openTutorial, setOpenTutorial] = useState(false)
  const okFocusRestore = useRestoreFocusTarget()
  const authInputId = useId('auth-input')
  const pickInputId = useId('pick-input')

  const alert = (msg: ReactNode, title: ReactNode = '错误') => {
    setAlertTitle(title)
    setAlertMessage(msg)
    setOpenAlert(true)
  }

  const onOkClick = () => {
    if (!authText) {
      alert('认证码不能为空')
      return
    }
    try {
      const auth = authText.trim()
      if (auth.length <= 2) throw new Error()
      let url = toURL(auth)
      const pick = pickText.trim()
      if (pick) url += `?pwd=${pick}`
      setLink(url)
      setAuthText('')
      setPickText('')
    } catch (e) {
      alert('认证码不正确')
      setLink('')
    }
  }

  const onFirstLinkClick = () => {
    window.open('https://v.douyin.com/APe2vddKooc/', '_blank', 'noreferrer')
    alert('请仔细查看视频教程，以免下载过程中出现问题。', '注意')
    setOpenTutorial(true)
  }

  const onSecondLinkClick = () => {
    if (openTutorial) {
      window.open(link, '_blank', 'noreferrer')
    } else {
      alert('请按照顺序操作！')
    }
  }

  return (
    <div className={styles.container}>
      <GoofishBanner />
      <div className={styles.main}>
        <div>
          <Label htmlFor={authInputId} className={styles.label}>
            认证码
          </Label>
          <Input id={authInputId} className={styles.input} spellCheck={false} value={authText} onChange={(_, d) => setAuthText(d.value)} />
        </div>
        <div>
          <Label htmlFor={pickInputId} className={styles.label}>
            提取码
          </Label>
          <Input id={pickInputId} className={styles.input} spellCheck={false} value={pickText} onChange={(_, d) => setPickText(d.value)} />
        </div>
        <Button as="button" appearance="primary" onClick={onOkClick} {...okFocusRestore}>
          确定
        </Button>
      </div>
      {link && (
        <ol className={styles.card}>
          <li>
            <Link onClick={onFirstLinkClick}>请先点击此链接</Link>
          </li>
          <li>
            <Link onClick={onSecondLinkClick}>再点击此链接</Link>
          </li>
        </ol>
      )}
      {openTutorial && (
        <div>
          <h2>加密文件的密码</h2>
          <div className={mergeClasses(styles.centerBox, styles.card)}>闲鼜鱼鑈号嘜我衟昨勱天彀就顴是檟这鼶么臩说韷的</div>
        </div>
      )}
      <Dialog modalType="alert" open={openAlert} onOpenChange={(_, d) => setOpenAlert(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{alertTitle}</DialogTitle>
            <DialogContent>{alertMessage}</DialogContent>
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

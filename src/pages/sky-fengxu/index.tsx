import { ChangeEvent, DragEvent, StrictMode, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, makeStyles, webLightTheme, tokens, Button, Badge, shorthands } from '@fluentui/react-components'
import { detect } from 'jschardet'
import { ZipHelper } from '@/pages/sky-fengxu/zip-helper'
import { MusicConvertor } from '@/lib/sheets'
import { skyStudioJsonLabel, skyStudioJsonParser } from '@/lib/sheets/handlers/sky-studio-json'
import { skyStudioAbcLabel, skyStudioAbcParser } from '@/lib/sheets/handlers/sky-studio-abc'
import { fengxuGenshin2Formatter, fengxuGenshin2Label } from '@/lib/sheets/handlers/fengxu-genshin-2'
import { TextDecoder } from 'text-encoding'

const readFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    // 处理二进制文件
    if (!file.type.startsWith('text/') && file.type !== '') {
      reject(new TypeError('非文本文件内容'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      let encoding = null
      try {
        const buffer = e.target?.result as ArrayBufferLike
        const binaryString = String.fromCharCode(...new Uint8Array(buffer))
        encoding = detect(binaryString).encoding
        if (encoding === 'ascii') encoding = 'utf8'
        const decoder = new TextDecoder(encoding, { ignoreBOM: false })
        resolve(decoder.decode(buffer))
      } catch (error: any) {
        let msg = '解码失败: '
        if (encoding) msg += `[${encoding}] `
        reject(new Error(msg + (error?.message || error)))
      }
    }
    reader.onerror = (e) => reject(e.target?.error)
    reader.readAsArrayBuffer(file)
  })

const removeFileNameExt = (str: string): string => {
  let idx = str.lastIndexOf('.yp.txt')
  if (idx < 0) idx = str.lastIndexOf('.')
  if (idx > 0) return str.substring(0, idx)
  return str
}

const musicConvertor = new MusicConvertor(
  {
    label: skyStudioJsonLabel,
    parser: skyStudioJsonParser
  },
  {
    label: skyStudioAbcLabel,
    parser: skyStudioAbcParser
  },
  {
    label: fengxuGenshin2Label,
    formatter: fengxuGenshin2Formatter
  }
)

const useFileItemStyles = makeStyles({
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    ':last-child': {
      borderBottom: 'none'
    }
  },
  fileInfo: {
    flexGrow: 1,
    marginRight: '15px',
    fontFamily: 'monospace'
  },
  fileName: {
    fontWeight: 500,
    marginBottom: '4px',
    color: '#333'
  },
  fileMeta: {
    display: 'flex',
    justifyContent: 'start',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85em'
  },
  removeButton: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    ':hover': {
      backgroundColor: tokens.colorStatusDangerBackground3Hover
    },
    ':hover:active': {
      backgroundColor: tokens.colorStatusDangerBackground3Pressed
    }
  }
})

const FileItem = (props: { name: string; size: number; type?: string; onRemove?: () => void }) => {
  const styles = useFileItemStyles()

  const formattedSize = useMemo(() => {
    const bytes = props.size
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = (bytes / Math.pow(1024, exponent)).toFixed(2)
    return `${value.replace(/\.0+$/, '')} ${units[exponent]}`
  }, [props.size])

  return (
    <div className={styles.fileItem}>
      <div className={styles.fileInfo}>
        <div className={styles.fileName}>{props.name}</div>
        <div className={styles.fileMeta}>
          <Badge appearance="tint">{formattedSize}</Badge>
          <Badge appearance="tint" color="informative">
            {props.type || '未知类型'}
          </Badge>
        </div>
      </div>
      <Button className={styles.removeButton} as="button" appearance="primary" onClick={props.onRemove}>
        移除
      </Button>
    </div>
  )
}

const useStyles = makeStyles({
  app: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px'
  },
  fileChooseButton: {
    height: '200px',
    color: tokens.colorNeutralStroke1Pressed,
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    transition: 'all 0.3s',
    ':hover': {
      color: tokens.colorBrandBackground,
      backgroundColor: tokens.colorBrandBackground2Hover,
      ...shorthands.borderColor(tokens.colorBrandBackground)
    }
  },
  fileList: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: '0 10px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  actionWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  },
  contentOutput: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: '14px',
    fontFamily: 'monospace'
  }
})

const App = () => {
  const styles = useStyles()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [_, setIsDragOver] = useState(false)
  const [fileList, setFileList] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [outputText, setOutputText] = useState('')

  const onFileDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types?.includes('Files')) {
      setIsDragOver(true)
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const onFileDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e)
  }

  const handleFiles = (e: ChangeEvent<HTMLInputElement> | DragEvent) => {
    let files: FileList | null = null
    if ('dataTransfer' in e && e.dataTransfer?.files) {
      files = e.dataTransfer.files
    } else if ('target' in e && e.target instanceof HTMLInputElement && e.target.files) {
      files = e.target.files
    } else {
      console.warn('No files found in the event.')
    }
    setFileList((p) => {
      if (!files) return p
      const q = Array.from(p)
      q.push(...files)
      return q
    })
    // 清空 input 以便重复选择相同文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFileRemove = (index: number) => {
    setFileList((p) => {
      const q = Array.from(p)
      q.splice(index, 1)
      return q
    })
  }

  const startConvert = () => {
    const tooMuch = fileList.length > 1000
    setProcessing(true)
    setOutputText(tooMuch ? '文件数量过多，请耐心等待...\n\n' : '')
    Promise.allSettled(
      fileList.map(
        (file) =>
          new Promise<[string, string]>(async (resolve, reject) => {
            try {
              const content = await readFile(file)
              const converted = await musicConvertor.convert(fengxuGenshin2Label, content)
              if (!tooMuch) setOutputText((p) => p + `${file.name} -- 转换成功\n\n`)

              resolve([file.name, converted])
            } catch (e) {
              if (!tooMuch) setOutputText((p) => p + `${file.name} -- 转换失败 ${e}\n\n`)
              const errors = e instanceof AggregateError ? e.errors : [e]
              console.error(file.name, errors)

              reject([file.name, errors])
            }
          })
      )
    )
      .then((res) => {
        setOutputText((p) => p + '转换完成，正在创建压缩包...\n\n')
        const zip = new ZipHelper()
        res.forEach((it) => {
          if (it.status === 'fulfilled') {
            const [filename, result] = it.value
            const name = removeFileNameExt(filename)
            zip.addAsUTF8(name + '.js', result)
          } else {
            const [filename, errors] = it.reason
            const result = errors.length === 1 ? String(errors[0]) : errors.map((it: any) => it.message).join('\n\n')
            zip.addAsUTF8(`[ERR]${filename}.log`, result)
          }
        })
        zip.download()
      })
      .finally(() => setProcessing(false))
  }

  const clearAll = () => {
    if (!processing) setFileList([])
    setOutputText('')
  }

  return (
    <div className={styles.app}>
      <input type="file" ref={fileInputRef} hidden multiple onChange={handleFiles} />
      <Button
        as="button"
        className={styles.fileChooseButton}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onFileDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onFileDrop}>
        点击选择文件 或 拖拽文件到此处
      </Button>
      <div className={styles.fileList}>
        {fileList.map((it, i) => (
          <FileItem key={i} name={it.name} size={it.size} type={it.type} onRemove={() => onFileRemove(i)} />
        ))}
      </div>
      <div className={styles.actionWrapper}>
        <Button as="button" appearance="primary" disabled={processing || !fileList.length} onClick={startConvert}>
          开始转换
        </Button>
        <Button as="button" onClick={clearAll}>
          全部清空
        </Button>
      </div>
      <div className={styles.contentOutput}>{outputText}</div>
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

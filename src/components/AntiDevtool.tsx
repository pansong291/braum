import { FC, PropsWithChildren, useEffect, useState } from 'react'

/**
 * 从纯净 iframe 获取原生函数
 */
function getNativeSetInterval() {
  const iframe = document.createElement('iframe')
  iframe.hidden = true
  document.body.appendChild(iframe)
  const original = iframe.contentWindow!.setInterval
  document.body.removeChild(iframe)
  return original.bind(window)
}

const AntiDevtool: FC<PropsWithChildren> = (props) => {
  const [time, setTime] = useState<number>()

  useEffect(() => {
    if (import.meta.env.PROD) {
      const setInterval = getNativeSetInterval()

      const id = setInterval(() => {
        try {
          ;(function f(p?: unknown) {
            f(function () {}.constructor('e0a3', [].slice.call(arguments).join())(p))
          })()
        } catch (_) {
          setTime(Date.now())
        }
      }, 100)

      return () => {
        window.clearInterval(id)
      }
    } else {
      setTime(-1)
    }
  }, [])

  if (!time) return null
  return <>{props.children}</>
}

export default AntiDevtool

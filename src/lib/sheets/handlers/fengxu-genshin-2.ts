import { Beat, MusicFormatter, KeyLayout, MusicNotation, MusicParser, Rate } from '@/lib/sheets'
import { basicNoteTo12TET, createHitActions, parseKeyLayout } from '@/lib/sheets/utils/music'
import { CHAR_0, CHAR_A, groupBy, insertionSort } from '@/lib/sheets/utils/lang'

export const fengxuGenshin2Label = 'fengxu-genshin-2'

export const fengxuGenshin2Formatter = (): MusicFormatter => {
  const defKl = new KeyLayout(
    'C2,D2,E2,F2,G2,A3,B3,C3,D3,E3,F3,G3,A4,B4,C4,D4,E4,F4,G4,A5,B5'.split(',').map((it) => `{${it}}`),
    -7
  )

  return function (mn, ops) {
    const kl = ops?.keyLayout ? parseKeyLayout(ops.keyLayout) : defKl
    const hitActions = createHitActions(mn, kl)
    let content = ''

    hitActions.forEach((it) => {
      it.locations.forEach((it) => {
        content += kl.keys[it]
      })
      content += it.locations.length ? `<${it.postDelay}>` : it.postDelay + ' '
    })
    return `parseGenshinImpactMusic("${mn.name}", "${content}", 2)\n`
  }
}

type FengxuKey2 = {
  keys: number[]
  /** 开始时间 */
  start: number
  /** 等待时间 */
  wait: number
  /** 按住时间 */
  hold: number
}

type FengXuBeat = {
  keys: number[]
  /** 开始时间 */
  start: number
  /** 持续时间 */
  time: number
}

export const fengxuGenshin2Parser = (): MusicParser => {
  const helper = {
    funcName: 'parseGenshinImpactMusic',
    result: null as MusicNotation | null,
    parseKeyByName(str: string): number | undefined {
      if (!str?.length) return
      if (str.length === 2) {
        let base = str.charCodeAt(0) - CHAR_A
        if (base < 0 || base > 6) return
        base -= 2
        if (base < 0) base += 7
        let shift = str.charCodeAt(1) - CHAR_0
        if (shift < 0 || shift > 9) return
        shift -= 4
        // fengxu 的乐谱音名是错误的，所以才有这个自增，如果改正了就没有
        if (base < 5) shift++
        return basicNoteTo12TET(base) + shift * 12
      } else if (str.length === 4) {
        let n1 = helper.parseKeyByName(str.substring(0, 2))
        if (n1 === void 0) return
        let n2 = helper.parseKeyByName(str.substring(2))
        if (n2 === void 0) return
        n1++
        n2--
        if (n1 === n2) return n1
      }
    },
    parseKeys(str: string, i: number, onResult: (n: number[]) => void): number {
      let keys: number[] = []
      let opened = false
      let curKey = ''
      for (; i < str.length; i++) {
        const ch = str.charAt(i)
        if (opened) {
          if (ch === '}') {
            opened = false
            const k = helper.parseKeyByName(curKey)
            if (k === void 0) helper.errorAt(i)
            else keys.push(k)
            curKey = ''
          } else if ((ch >= 'A' && ch <= 'G') || (ch >= '0' && ch <= '9')) {
            curKey += ch
          } else helper.errorAt(i)
        } else if (ch === '{') {
          opened = true
        } else {
          i--
          break
        }
      }
      if (opened) helper.errorAt(i - 1)
      onResult(keys)
      return i
    },
    parseTime(str: string, i: number, open: string, close: string, onResult: (n: number) => void): number {
      let time = 0
      let opened = false
      for (; i < str.length; i++) {
        const ch = str.charAt(i)
        if (opened) {
          if (ch === close) {
            if (!time) helper.errorAt(i)
            opened = false
            onResult(time)
            break
          } else if (ch >= '0' && ch <= '9') {
            time = time * 10 + ch.charCodeAt(0) - CHAR_0
          } else helper.errorAt(i)
        } else if (ch === open) {
          opened = true
        } else helper.errorAt(i)
      }
      if (opened) helper.errorAt(i - 1)
      return i
    },
    parseNum(str: string, i: number, onResult: (n: number) => void): number {
      let num = 0
      for (; i < str.length; i++) {
        const cc = str.charCodeAt(i) - CHAR_0
        if (cc >= 0 && cc <= 9) {
          num = num * 10 + cc
        } else {
          i--
          break
        }
      }
      onResult(num)
      return i
    },
    errorAt(index: number) {
      throw SyntaxError(`Parse error(index: ${index})`)
    }
  }

  function parseGenshinImpactMusic(name: string, content: string, version: number) {
    /*
    250 {C2}<250>{D2}<500>{E2}<750>
    按住一会后释放如 A(200) 表示按住 A 200毫秒后释放
    注意：延时与延音是同时发生的，也就是说A(200) B 表达的意思是按住A的同时按下B在200ms后在松开A 而非按下A200s后松开在按下B，
    这之间没有一个延时的过程，如果您想表达的是按下A在200ms后松开在按下B可以用如下格式表示: A<200> B，
    尖括号表示延音且延时，小括号只代表延音不代表延时，如果您实现延时和延音的时间不等长，
    可以按如下方式配置：A(200) 300 B 这表示按下A等待300ms后按下B，在A按下的200ms后松开A，
    也可以按如下配置：A<200> 100 B 这与上面的配置是一样的。
    */
    if (version !== 2) throw RangeError('Unexpect version: ' + version)
    const fxKeys: FengxuKey2[] = []
    let start = 0
    let curFxKey: FengxuKey2 = { keys: [], start: 0, wait: 0, hold: 0 }
    let previousKey = false
    for (let i = 0; i < content.length; i++) {
      const ch = content.charAt(i)
      if (!ch.trim()) continue
      if (ch === '{') {
        i = helper.parseKeys(content, i, (keys) => {
          if (curFxKey.keys.length || curFxKey.wait) fxKeys.push(curFxKey)
          curFxKey = { keys, start, wait: 0, hold: 0 }
        })
        previousKey = true
      } else if (ch === '<') {
        if (!previousKey) helper.errorAt(i)
        i = helper.parseTime(content, i, '<', '>', (time) => {
          curFxKey.hold += time
          curFxKey.wait += time
          start += time
        })
        previousKey = false
      } else if (ch === '(') {
        if (!previousKey) helper.errorAt(i)
        i = helper.parseTime(content, i, '(', ')', (time) => {
          curFxKey.hold += time
        })
        previousKey = false
      } else if (ch >= '0' && ch <= '9') {
        i = helper.parseNum(content, i, (num) => {
          curFxKey.wait += num
          start += num
        })
        previousKey = false
      } else helper.errorAt(i)
    }
    fxKeys.push(curFxKey)
    if (!fxKeys.length) throw RangeError('Keys is empty')

    const beatList: FengXuBeat[] = Object.values(groupBy(fxKeys, (it) => it.start)).flatMap((list) => {
      const keys = list.flatMap((it) => it.keys)
      const start = list[0].start
      const wait = list.reduce((a, b) => Math.max(a, b.wait), 0)
      const hold = list.reduce((a, b) => Math.max(a, b.hold), 0)
      return keys.length && hold && wait > hold
        ? [
            { keys, start, time: hold },
            { keys: [], start: start + hold, time: wait - hold }
          ]
        : { keys, start, time: wait }
    })
    insertionSort(beatList, (a, b) => a.start < b.start)

    let minTime = 0
    beatList.forEach((it) => {
      if (it.time && (!minTime || it.time < minTime)) minTime = it.time
    })
    const beats = beatList.map((it) => new Beat(new Rate(it.time || minTime * 4, minTime), it.keys))
    helper.result = new MusicNotation()
    helper.result.name = name
    helper.result.bpm = Math.floor(60_000 / minTime)
    helper.result.beats = beats
  }

  return function (str) {
    const func = new Function(helper.funcName, str)
    func.call(null, parseGenshinImpactMusic)
    const result = helper.result
    if (!result) throw SyntaxError('Unknown error')
    helper.result = null
    return result
  }
}

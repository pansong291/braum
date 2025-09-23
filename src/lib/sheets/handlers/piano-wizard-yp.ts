import { Beat, MusicFormatter, MusicNotation, MusicParser, Rate } from '@/lib/sheets'
import { basicNoteTo12TET, isSemitone, naturals } from '@/lib/sheets/utils/music'
import { CHAR_A } from '@/lib/sheets/utils/lang'

export const pianoWizardYpLabel = 'piano-wizard-yp'

export const pianoWizardYpFormatter = (): MusicFormatter => {
  const helper = {
    /** 将十二平均律编译为音符字符串 */
    compileNote(tet12: number): string {
      let octaveShift = Math.sign(tet12) * Math.floor(Math.abs(tet12) / 12)
      let tet12Rang = tet12 % 12
      if (tet12Rang < 0) {
        tet12Rang += 12
        octaveShift--
      }
      const isSemi = isSemitone(tet12Rang)
      if (isSemi) tet12Rang--
      const note = naturals.indexOf(tet12Rang) + 1
      if (note <= 0) return '0'
      let result = String(note)
      if (octaveShift === 1) result += '+'
      else if (octaveShift === -1) result += '-'
      else if (octaveShift > 0) result += '+' + octaveShift
      else if (octaveShift < 0) result += octaveShift
      if (isSemi) result += '#'
      return result
    },
    formatBeat(beat: Beat): string {
      let notes = beat.tones.map((it) => helper.compileNote(it)).join('&') || '0'
      const { a, b } = beat.rate.simplify()
      if (a > 0) {
        if (a !== 1) notes += '*' + a
        if (b !== 1) notes += '/' + b
        return notes + ','
      }
      return ''
    }
  }

  return function (mn) {
    const pitchLevel = mn.keyNote % 12
    const isSemi = isSemitone(pitchLevel)
    const basePitch = naturals.indexOf(isSemi ? pitchLevel - 1 : pitchLevel)
    let baseNote = String.fromCharCode(basePitch < 5 ? 67 + basePitch : 60 + basePitch)
    if (isSemi) baseNote += '#'

    let content = `/**\n * name: ${mn.name}\n * author: ${mn.author}\n * arrangedBy: \n * transcribedBy: ${mn.transcribedBy}\n */\n[1=${baseNote},4/4,${mn.bpm}]\n`

    mn.beats.forEach((beat) => {
      content += helper.formatBeat(beat)
    })

    return content
  }
}

type Notation = {
  keyNote: string
  bpm: number
  beats: string
}

export const pianoWizardYpParser = (): MusicParser => {
  const helper = {
    blockCommentRegex: new RegExp('/\\*[\\d\\D]*?\\*/', 'g'),
    lineCommentRegex: new RegExp('//[^\\n]*', 'g'),
    spaceCharRegex: new RegExp('\\s+', 'g'),
    musicSyntaxRegex: new RegExp(
      '^\\[1=([A-G][#b]?),\\d+/\\d+,(\\d+)](\\d(?:[-+#b]\\d*)*(?:&\\d(?:[-+#b]\\d*)*)*(?:[*/]\\d+)*(?:,\\d(?:[-+#b]\\d*)*(?:&\\d(?:[-+#b]\\d*)*)*(?:[*/]\\d+)*)*),?$'
    ),
    musicBeatRegex: new RegExp('^([^*/]+)((?:[*/]\\d+)*)$'),
    startsWithNumberRegex: new RegExp('^(\\d+)?(.*)$'),

    /** 移除乐谱中的注释 */
    removeComment(str: string): string {
      return str.replaceAll(helper.blockCommentRegex, '').replaceAll(helper.lineCommentRegex, '').replaceAll(helper.spaceCharRegex, '')
    },
    /** 校验乐谱语法 */
    checkMusicSyntax(str: string): Notation {
      const matchArr = str.match(helper.musicSyntaxRegex)
      if (!matchArr || matchArr.length < 4) throw SyntaxError('Syntax error')
      return {
        keyNote: matchArr[1],
        bpm: parseInt(matchArr[2]),
        beats: matchArr[3]
      }
    },
    /** 解析节拍 */
    parseBeat(str: string): Beat {
      const matchArr = str.match(helper.musicBeatRegex)
      if (!matchArr || matchArr.length < 3) throw SyntaxError('Beat syntax error')
      const tones = matchArr[1]
        .split('&')
        .map((it) => helper.parseNote(it))
        .filter((it) => it !== null) as number[]
      return new Beat(helper.parseRate(matchArr[2], new Rate()), Array.from(new Set(tones)))
    },
    /** 解析时值倍率 */
    parseRate(str: string | undefined, acc: Rate): Rate {
      if (!str) return acc
      // *21/5  乘除后面的数字是必有的
      const rest = str.substring(1).match(helper.startsWithNumberRegex)
      const n = parseInt(rest?.[1] || '')
      if (n > 0) {
        const rate = str[0] === '/' ? new Rate(acc.a, acc.b * n) : new Rate(acc.a * n, acc.b)
        return helper.parseRate(rest?.[2], rate)
      }
      throw RangeError('Unsupported rate: ' + str)
    },
    /** 解析音符 */
    parseNote(str: string): number | null {
      const note = parseInt(str[0])
      if (note >= 0 && note <= 7) {
        if (!note) return null
        // 这里减 1 使其变为从 0 开始，再转为十二平均律
        return basicNoteTo12TET(note - 1) + helper.parseAccidental(str.substring(1), 0)
      }
      throw RangeError('Unsupported note: ' + str[0])
    },
    /** 解析变音记号 */
    parseAccidental(str: string | undefined, acc: number): number {
      if (!str) return acc
      // +2b  表示升 2 个八度，降半调
      // -#2  表示降一个八度，升 2 个半调
      // 数字省略则为 1
      const rest = str.substring(1).match(helper.startsWithNumberRegex)
      let n: string | number | undefined = rest?.[1]
      n = n ? parseInt(n) : 1
      if (n >= 0) {
        // 都用十二平均律来表示，所以升降八度是以 12 作倍数
        switch (str[0]) {
          case '+':
            n *= 12
            break
          case '-':
            n *= -12
            break
          case 'b':
            n = -n
            break
        }
        return helper.parseAccidental(rest?.[2], acc + n)
      }
      throw RangeError('Unsupported accidental: ' + str)
    }
  }

  return function (str, ops) {
    const triple = helper.checkMusicSyntax(helper.removeComment(str))
    const key = triple.keyNote
    let keyNote = key.charCodeAt(0) - CHAR_A - 2
    if (keyNote < 0) keyNote += 7 // 把 AB 移到 G 的后面
    keyNote = basicNoteTo12TET(keyNote) // 转为十二平均律
    switch (key[1]) {
      case '#':
        keyNote++
        break
      case 'b':
        keyNote--
        break
    }
    const mn = new MusicNotation()
    const name = ops?.filename
    if (name) {
      let lIdx = name.lastIndexOf('.yp.')
      if (lIdx < 0) lIdx = name.lastIndexOf('.')
      mn.name = name.substring(0, lIdx)
    }
    mn.keyNote = keyNote
    mn.bpm = triple.bpm
    mn.beats = triple.beats
      .split(',')
      .filter((it) => it)
      .map((it) => helper.parseBeat(it))
    return mn
  }
}

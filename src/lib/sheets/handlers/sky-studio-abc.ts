import { Beat, MusicFormatter, MusicNotation, MusicParser, Rate } from '@/lib/sheets'
import { basicNoteTo12TET, tet12ToBasicNote } from '@/lib/sheets/utils/music'
import { checkBpm, checkPitchLevel } from '@/lib/sheets/utils/sky-studio'
import { CHAR_0, CHAR_A } from '@/lib/sheets/utils/lang'

export const skyStudioAbcLabel = 'sky-studio-abc'

export const skyStudioAbcFormatter = (): MusicFormatter => {
  return function (mn) {
    // 计算所有分母的最大公约数
    let lcm = 1
    mn.beats.forEach((it) => {
      lcm *= new Rate(it.rate.a * lcm, it.rate.b).simplify().b
    })
    const bpm = mn.bpm * lcm
    if (!Number.isSafeInteger(bpm)) throw EvalError('Unsafe bpm: ' + bpm)
    let firstLine = `<DontCopyThisLine> ${bpm} ${mn.keyNote % 12} ${16} ${mn.author} ${mn.transcribedBy}`
    let secondLine = ''
    mn.beats.forEach((beat) => {
      const dotCount = new Rate(beat.rate.a * lcm, beat.rate.b).simplify().a - 1
      if (dotCount < 0) return
      if (beat.tones.length) {
        beat.tones.forEach((it) => {
          const note = tet12ToBasicNote(it)
          if (note < 0 || note > 14) throw RangeError('Unknown note: ' + note)
          secondLine += String.fromCharCode(Math.floor(note / 5) + 65) + ((note % 5) + 1)
        })
        secondLine += ' '
        if (dotCount) secondLine += '. '.repeat(dotCount)
      } else {
        secondLine += '. '.repeat(dotCount + 1)
      }
    })
    return firstLine + '\n' + secondLine
  }
}

export const skyStudioAbcParser = (): MusicParser => {
  const helper = {
    checkLines(str?: string): [string, string] {
      str = str?.trim().replaceAll('\r\n', '\n').replaceAll('\r', '\n')
      if (!str) throw SyntaxError('Content is empty')
      if (str.indexOf('<DontCopyThisLine>') < 0) throw SyntaxError('Syntax error')
      const gtInd = str.indexOf('>')
      const lfInd = str.indexOf('\n', gtInd)
      if (lfInd < 0) throw SyntaxError('Missing Character: "\\n"')
      const firstLine = str.substring(gtInd + 1, lfInd).trim()
      const rest = str.substring(lfInd + 1)
      return [firstLine, rest]
    },
    parseInfo(str: string, name: string): MusicNotation {
      const infos = str.split(' ').filter((it) => it)
      const bpm = checkBpm(parseInt(infos[0]))
      const pitchLevel = checkPitchLevel(parseInt(infos[1]))
      name = name.substring(0, name.lastIndexOf('.'))
      return new MusicNotation(name, infos[3], infos[4], pitchLevel, bpm)
    },
    parseKeys(str: string, i: number, onResult: (n: number) => void, onError: (n: number) => void): number {
      let abc = -1
      for (; i < str.length; i++) {
        const ch = str.charAt(i)
        if (abc < 0) {
          if (ch >= 'A' && ch <= 'C') abc = ch.charCodeAt(0) - CHAR_A
          else {
            i--
            break
          }
        } else {
          if (ch >= '1' && ch <= '5') {
            onResult(abc * 5 + ch.charCodeAt(0) - CHAR_0 - 1)
            abc = -1
          } else {
            if (ch >= 'A' && ch <= 'C') i--
            onError(i)
          }
        }
      }
      if (abc >= 0) onError(i - 1)
      return i
    },
    transferNotes(notes: number[], beats: Beat[], dotCount: number) {
      // notes 本身算作一个点
      const rateA = notes.length ? dotCount + 1 : dotCount
      if (!rateA) return
      // 此处需要清空 notes 数组
      beats.push(new Beat(new Rate(rateA), notes.splice(0, notes.length)))
    },
    errorAt(line: number, column: number, char: string) {
      throw SyntaxError(`Parse error(line: ${line}, column: ${column}, char: ${char})`)
    }
  }
  return function (str, ops) {
    const [infoLine, keysLine] = helper.checkLines(str)
    const mn = helper.parseInfo(infoLine, ops?.filename || 'Unknown')

    let dotCount = 0
    const notes: number[] = []
    let lineNumber = 2,
      lineIndex = -1
    for (let i = 0; i < keysLine.length; i++) {
      const ch = keysLine.charAt(i)
      if (ch === ' ') continue
      if (ch === '\n') {
        lineIndex = i
        lineNumber++
      } else if (ch === '.') {
        dotCount++
      } else if (ch >= 'A' && ch <= 'C') {
        helper.transferNotes(notes, mn.beats, dotCount)
        dotCount = 0
        i = helper.parseKeys(
          keysLine,
          i,
          (note) => {
            notes.push(basicNoteTo12TET(note))
          },
          (i) => {
            helper.errorAt(lineNumber, i - lineIndex, keysLine.charAt(i))
          }
        )
      } else helper.errorAt(lineNumber, i - lineIndex, keysLine.charAt(i))
    }
    if (notes.length) helper.transferNotes(notes, mn.beats, Math.max(dotCount, 3))
    return mn
  }
}

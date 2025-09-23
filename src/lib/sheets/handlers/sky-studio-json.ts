import { Beat, MusicFormatter, KeyLayout, MusicNotation, MusicParser, Rate } from '@/lib/sheets'
import { basicNoteTo12TET, createHitActions } from '@/lib/sheets/utils/music'
import { checkBpm, checkPitchLevel } from '@/lib/sheets/utils/sky-studio'
import { groupBy, insertionSort } from '@/lib/sheets/utils/lang'

export const skyStudioJsonLabel = 'sky-studio-json'

export const skyStudioJsonFormatter = (): MusicFormatter => {
  const kl = new KeyLayout(Array.from(Array(15).keys()))

  return function (mn) {
    const hitActions = createHitActions(mn, kl)
    let time = 0
    const skyStudioSheet = {
      name: mn.name,
      author: mn.author,
      transcribedBy: mn.transcribedBy,
      bitsPerPage: 16,
      pitchLevel: mn.keyNote % 12,
      bpm: mn.bpm,
      songNotes: hitActions.flatMap((it) => {
        const keys = it.locations.sort((a, b) => b - a).map((key, i) => ({ time, key: `${i ? 2 : 1}Key${key}` }))
        time += it.postDelay
        return keys
      })
    }
    return JSON.stringify([skyStudioSheet])
  }
}

export const skyStudioJsonParser = (): MusicParser => {
  const helper = {
    checkSkyJSON(p: any): any {
      const sheets = JSON.parse(p)
      if (!Array.isArray(sheets)) throw TypeError('Data type error')
      const skyJson = sheets[0]
      if (!skyJson) throw RangeError('Sheets is empty')
      if (skyJson.isEncrypted) throw RangeError('Encrypted not support')
      return skyJson
    },
    checkSongNotes(p: any): any[] {
      if (!Array.isArray(p)) throw TypeError('"songNotes" must be an array')
      return p
    },
    checkNoteTime(p: any): number {
      if (!Number.isInteger(p)) throw TypeError('"time" must be an integer')
      if (p < 0) throw RangeError('"time" must be greater than 0')
      return p
    },
    checkKeyIndex(p: any): number {
      const key = parseInt(p)
      if (key >= 0 && key < 15) return key
      throw RangeError('Unknown key: ' + p)
    }
  }

  return function (str) {
    const skyJson = helper.checkSkyJSON(str)

    const mn = new MusicNotation(
      skyJson.name || 'Unknown',
      skyJson.author || '',
      skyJson.transcribedBy || '',
      checkPitchLevel(skyJson.pitchLevel),
      checkBpm(skyJson.bpm)
    )
    const songNotes = helper.checkSongNotes(skyJson.songNotes)
    /** @type {{time: number, keys: number[]}[]} */
    const beats = Object.values(
      // 按时间分组，相同时间的 key 构成和弦
      groupBy(songNotes, (it) => helper.checkNoteTime(it.time))
    ).map((arr) => {
      return {
        time: arr[0].time,
        keys: arr.map((it) => helper.checkKeyIndex(it.key.split('Key')[1]))
      }
    })
    insertionSort(beats, (a, b) => a.time < b.time)

    let lastBeat = new Beat(new Rate(0, 60_000))
    beats.forEach((beat) => {
      lastBeat.rate.a = (beat.time - lastBeat.rate.a) * mn.bpm
      if (lastBeat.rate.a) mn.beats.push(lastBeat)
      lastBeat = new Beat(
        new Rate(beat.time, lastBeat.rate.b),
        beat.keys.map((it) => basicNoteTo12TET(it))
      )
    })
    lastBeat.rate.a = 4
    lastBeat.rate.b = 1
    mn.beats.push(lastBeat)
    return mn
  }
}

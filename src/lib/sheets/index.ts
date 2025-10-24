export type ParseOptions = {
  filename?: string
}

export type FormatOptions = {
  keyLayout?: string
}

export type MusicFormatter = (mn: MusicNotation, opts?: FormatOptions) => string

export type MusicParser = (s: string, opts?: ParseOptions) => MusicNotation

/** 比率 */
export class Rate {
  /** 分子 */
  a: number
  /** 分母 */
  b: number

  constructor(a = 1, b = 1) {
    if (b === 0) throw new RangeError('The denominator cannot be zero')
    this.a = a
    this.b = b
  }

  /** 求最大公约数并化简此分数 */
  simplify(): Rate {
    let big = Math.max(this.a, this.b)
    let small = Math.min(this.a, this.b)
    while (small) {
      const temp = small
      small = big % small
      big = temp
    }
    this.a /= big
    this.b /= big
    return this
  }
}

/** 节拍 */
export class Beat {
  /** 时值倍率；如 1/2 表示为基础时值的一半 */
  rate: Rate
  /** 音调，支持和弦，为空时表示休止或停顿 */
  tones: number[]

  constructor(rate: Rate, tones: number[] = []) {
    this.rate = rate
    this.tones = tones
  }
}

/** 乐谱 */
export class MusicNotation {
  /** 音乐名 */
  name: string
  /** 作者 */
  author: string
  /** 改编 */
  transcribedBy: string
  /** 基准音调 */
  keyNote: number
  /** 每分钟节拍数 */
  bpm: number
  /** 节拍 */
  beats: Beat[]

  constructor(name = '', author = '', transcribedBy = '', keyNote = 0, bpm = 0, beats: Beat[] = []) {
    this.name = name
    this.author = author
    this.transcribedBy = transcribedBy
    this.keyNote = keyNote
    this.bpm = bpm
    this.beats = beats
  }
}

/** 触发操作 */
export class HitAction {
  /** 要触发的位置 */
  locations: number[]
  /** 点击后的延时 */
  postDelay: number

  constructor(locations: number[] = [], postDelay = 0) {
    this.locations = locations
    this.postDelay = postDelay
  }
}

/** 键盘布局 */
export class KeyLayout {
  /** 键位，按顺序从低音到高音 */
  keys: any[]
  /** 按键偏移 */
  keyOffset: number
  /** 是否启用半音，即十二平均律 */
  semitone: boolean

  constructor(keys: any[] = [], keyOffset = 0, semitone = false) {
    this.keys = keys
    this.keyOffset = keyOffset
    this.semitone = semitone
  }
}

export type Handler = {
  label: string
  formatter?: () => MusicFormatter
  parser?: () => MusicParser
}

export class MusicConvertor {
  private readonly formatters: Record<string, MusicFormatter>
  private readonly parsers: Record<string, MusicParser>

  constructor(...handlers: Handler[]) {
    this.formatters = Object.create(null)
    this.parsers = Object.create(null)
    for (const handler of handlers) {
      if (handler.formatter) this.formatters[handler.label] = handler.formatter()
      if (handler.parser) this.parsers[handler.label] = handler.parser()
    }
  }

  convert(label: string, content: string, opts?: { parse?: ParseOptions; format?: FormatOptions }): Promise<string> {
    return this.parseMusic(content, opts?.parse).then((mn) => this.formatMusic(label, mn, opts?.format))
  }

  private parseMusic(content: string, opts?: ParseOptions): Promise<MusicNotation> {
    return Promise.any(
      Object.entries(this.parsers).map(
        (parser) =>
          new Promise<MusicNotation>((resolve, reject) => {
            try {
              resolve(parser[1](content, opts))
            } catch (e) {
              reject(new Error(parser[0] + ' -> ' + e))
            }
          })
      )
    )
  }

  private formatMusic(label: string, mn: MusicNotation, opts?: FormatOptions): string {
    const format = this.formatters[label]
    if (!format) throw new Error('Unknown format:' + label)
    return format(mn, opts)
  }
}

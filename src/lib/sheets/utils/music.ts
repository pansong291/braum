import { HitAction, KeyLayout, MusicNotation } from '@/lib/sheets'

const missingKeyException = 'MissingKeyException'
/** 以 0 开始的十二平均律中的半音 */
export const semitones: number[] = [1, 3, 6, 8, 10]
/** 以 0 开始的十二平均律中的自然音 */
export const naturals: number[] = [0, 2, 4, 5, 7, 9, 11]
/**
 * 判断是否是半音（钢琴黑键）
 * @param tet12 十二平均律
 */
export const isSemitone = (tet12: number): boolean => {
  let note = tet12 % 12
  if (note < 0) note += 12
  return semitones.includes(note)
}
/**
 * 判断是否是自然音（钢琴白键）
 * @param tet12 十二平均律
 */
export const isNatural = (tet12: number): boolean => {
  let note = tet12 % 12
  if (note < 0) note += 12
  return naturals.includes(note)
}

/**
 * 基本音级转十二平均律
 * @param basic 基本音级 0~6
 * @return 十二平均律 0~11
 */
export const basicNoteTo12TET = (basic: number): number => {
  // 计算八度变化
  let octaveShift = Math.sign(basic) * Math.floor(Math.abs(basic) / 7)
  // 计算基础音符在 0 到 6 的范围内的对应值
  let basicInRange = basic % 7
  // 将负数的情况处理为正数，并对应到负八度
  if (basicInRange < 0) {
    basicInRange += 7
    // 八度向下移动
    octaveShift--
  }
  basicInRange = naturals[basicInRange]
  // 返回计算的值
  return basicInRange + octaveShift * 12
}
/**
 * 十二平均律转基本音级
 * @param tet12 十二平均律 0~11
 * @return 基本音级 0~6
 */
export const tet12ToBasicNote = (tet12: number): number => {
  let octaveShift = Math.sign(tet12) * Math.floor(Math.abs(tet12) / 12)
  let tet12Rang = tet12 % 12
  if (tet12Rang < 0) {
    tet12Rang += 12
    octaveShift--
  }
  const note = naturals.indexOf(tet12Rang)
  if (note < 0) throw RangeError('The note cannot be natural: ' + tet12)
  return note + octaveShift * 7
}

/**
 * 寻找合适的变调偏移
 */
export const findSuitableOffset = (mn: MusicNotation, kl: KeyLayout): number => {
  let minProducer = NaN
  let maxProducer = NaN
  let minConsumer = NaN
  let maxConsumer = NaN

  const producer = kl.keys.map((_, index) => {
    let note = index + kl.keyOffset
    if (!kl.semitone) note = basicNoteTo12TET(note)
    if (isNaN(minProducer) || note < minProducer) minProducer = note
    if (isNaN(maxProducer) || note > maxProducer) maxProducer = note
    return note
  })
  const consumer = mn.beats.flatMap((it) =>
    it.tones.map((it) => {
      const note = it + mn.keyNote
      if (isNaN(minConsumer) || note < minConsumer) minConsumer = note
      if (isNaN(maxConsumer) || note > maxConsumer) maxConsumer = note
      return note
    })
  )

  if (isNaN(minProducer)) throw Error(missingKeyException)
  if (isNaN(minConsumer)) return 0

  // minOffset 是使 consumer 的最小值对齐 producer 的最小值，maxOffset 同理
  const minOffset = minProducer - minConsumer
  const maxOffset = maxProducer - maxConsumer

  let offset = Math.max(0, minOffset)
  while (offset <= maxOffset) {
    if (consumer.every((it) => producer.includes(it + offset))) return offset
    offset++
  }

  offset = Math.min(-1, maxOffset)
  while (offset >= minOffset) {
    if (consumer.every((it) => producer.includes(it + offset))) return offset
    offset--
  }

  throw Error(missingKeyException)
}

/**
 * 创建触发操作
 */
export const createHitActions = (mn: MusicNotation, kl: KeyLayout): HitAction[] => {
  const offset = findSuitableOffset(mn, kl)
  const keysMap: Record<number, number> = Object.create(null)
  const baseTime = 60_000 / mn.bpm

  // 构建十二平均律到按键点位的映射关系
  for (let i = 0; i < kl.keys.length; i++) {
    let note = i + kl.keyOffset
    if (!kl.semitone) note = basicNoteTo12TET(note)
    keysMap[note] = i
  }
  return mn.beats.map((it) => {
    const locations = it.tones.map((it) => {
      const key = keysMap[it + mn.keyNote + offset]
      if (key === void 0 || key === null) throw Error(missingKeyException)
      return key
    })
    const postDelay = Math.floor((it.rate.a * baseTime) / it.rate.b)
    return new HitAction(locations, postDelay)
  })
}

export const parseKeyLayout = (kl: string): KeyLayout => {
  const klObj = JSON.parse(kl)
  if (!Array.isArray(klObj.keys)) throw TypeError('"keys" must be an array')
  if (!Number.isInteger(klObj.keyOffset)) throw TypeError('"keyOffset" must be an integer')
  if (klObj.semitone !== true && klObj.semitone !== false) throw TypeError('"semitone" must be a boolean')
  return new KeyLayout(klObj.keys, klObj.keyOffset, klObj.semitone)
}

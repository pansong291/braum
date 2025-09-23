export const checkPitchLevel = (p: any): number => {
  if (!Number.isInteger(p)) throw TypeError('"pitchLevel" must be an integer')
  if (p < 0 || p > 11) throw RangeError('"pitchLevel" is out of range [0, 11]')
  return p
}

export const checkBpm = (p: any): number => {
  if (!Number.isInteger(p)) throw TypeError('"bpm" must be an integer')
  if (!p || p <= 0) throw RangeError('"bpm" must be greater than 0')
  return p
}

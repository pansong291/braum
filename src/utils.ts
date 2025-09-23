
/**
 * 获取随机标识符
 * @param len 长度
 */
export function randomIdentifier(len = 8) {
  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'
  len = Math.floor(Math.abs(len))
  let result = ''
  while (len > 0) {
    const r = Math.random()
    let n = r * 64
    if (n < 10 && !result) n = r * 54 + 10
    result += characters.charAt(Math.floor(n))
    len--
  }
  return result
}

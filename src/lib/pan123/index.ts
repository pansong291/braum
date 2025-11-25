const sequence = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-_.#'

const linkPrefixes = ['https://www.123912.com/s/', 'https://www.123684.com/s/', 'https://www.123865.com/s/']

function charToValue(ch: string): number {
  if (ch) {
    const n = ch.charCodeAt(0)
    // 数字: 0-9
    if (ch >= '0' && ch <= '9') return n - 48
    // 大写字母: 10-35
    if (ch >= 'A' && ch <= 'Z') return n - 55
    // 小写字母: 36-61
    if (ch >= 'a' && ch <= 'z') return n - 61
    // 特殊符号: 62-66
    const i = sequence.indexOf(ch, 62)
    if (i >= 0) return i
  }
  throw new Error(`Invalid character: ${ch}`)
}

function valueToChar(n: number): string {
  const ch = sequence[n]
  if (!ch) throw new Error(`Invalid number: ${n}`)
  return ch
}

/** 生成斐波那契权重序列 */
function generateWeights(length: number): number[] {
  const weights: number[] = []
  let a = 1,
    b = 2

  for (let i = 0; i < length; i++) {
    weights.push(a)
    ;[a, b] = [b, a + b]

    // 确保权重在合理范围内
    if (a > 10000) a = 1
    if (b > 10000) b = 2
  }

  return weights
}

/** 在末尾生成校验位 */
function sign(data: string): string {
  if (!data) throw new Error('Empty data')

  const values: number[] = []
  for (const char of data) {
    values.push(charToValue(char))
  }

  // 生成斐波那契权重序列
  const weights = generateWeights(data.length)

  // 计算加权和（从右向左）
  let sum = 0
  for (let i = data.length - 1, j = 0; i >= 0; i--, j++) {
    sum += values[i] * weights[j]
  }

  return data + valueToChar(sum % sequence.length)
}

/** 验证校验位 */
function verify(input: string): string {
  if ((input?.length || 0) > 1) {
    const data = input.slice(0, -1)

    if (input === sign(data)) return data
  }
  throw new Error(`Invalid input: ${input}`)
}

/** 映射为反转序列 */
function reverse(str: string): string {
  let result = ''
  for (let ch of str) {
    const idx = sequence.indexOf(ch)
    if (idx < 0) throw new Error(`Unexpected character: ${ch}`)
    result += sequence[sequence.length - 1 - idx]
  }
  return result
}

function obscure(): number {
  // 生僻字范围：13312-19903，取 14000-19000 做基底
  return Math.floor(Math.random() * 6 + 14) * 1000
}

function impurity(): string {
  // 随机范围取 128-900，不能超出 903，因为最大是 19903
  return String.fromCharCode(obscure() + Math.floor(Math.random() * (900 - 128) + 128))
}

function obfuscate(str: string): string {
  let result = ''
  for (let ch of str) {
    const i = sequence.indexOf(ch, 62)
    if (i >= 0 || Math.random() < 0.4) {
      result += String.fromCharCode(obscure() + ch.charCodeAt(0))
    } else {
      result += ch
    }
    if (Math.random() < 0.2) {
      result += impurity()
    }
  }
  if (result.charCodeAt(result.length - 1) < 128) {
    result += impurity()
  }
  if (result.charCodeAt(0) < 128) {
    result = impurity() + result
  }
  return result
}

function deobfuscate(str: string): string {
  let result = ''
  for (let ch of str) {
    const c = ch.charCodeAt(0) % 1000
    if (c < 128) {
      result += String.fromCharCode(c)
    }
  }
  return result
}

export function toURL(code: string): string {
  const data = reverse(verify(deobfuscate(code)))
  return linkPrefixes[0] + data
}

export function toCode(url: string): string {
  const reg = new RegExp('^[^?/#]+', 'g')
  for (const p of linkPrefixes) {
    if (url.startsWith(p)) {
      const code = url.substring(p.length)
      const mArr = code.match(reg)
      if (mArr) {
        return obfuscate(sign(reverse(mArr[0])))
      }
    }
  }
  throw new Error('Unsupported URL: ' + url)
}

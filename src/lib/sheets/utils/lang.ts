export const CHAR_A = 65
export const CHAR_0 = 48

/** 分组 */
export const groupBy = <T, K extends string | number | symbol>(arr: T[], keyMapper: (t: T) => K): Record<K, T[]> => {
  const result: Record<K, T[]> = Object.create(null)
  arr.forEach((it) => {
    const key = keyMapper(it)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(it)
  })
  return result
}

/** 插入排序，在输入几乎是已经排好序的情况下时间复杂度最小 */
export const insertionSort = <T>(arr: T[], comparator: (a: T, b: T) => boolean) => {
  let len = arr.length,
    i,
    j,
    key
  for (i = 1; i < len; i++) {
    key = arr[i] // 选取要插入的元素
    j = i - 1

    /* 将大于key的元素向后移动一位 */
    while (j >= 0 && !comparator(arr[j], key)) {
      arr[j + 1] = arr[j]
      j = j - 1
    }
    arr[j + 1] = key // 插入key到正确的位置
  }
}

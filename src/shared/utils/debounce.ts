export const debounce = (func: (...arg: any[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined
  return <T>(...arg: T[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func(...arg)
    }, wait)
  }
}

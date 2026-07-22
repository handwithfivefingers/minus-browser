export function handleLog(scriptId: string, args: any[]): void {
  const [message, ...rest] = args
  const prefix = `[UserScript:${scriptId}]`
  if (rest.length > 0) {
    console.log(prefix, message, ...rest)
  } else {
    console.log(prefix, message)
  }
}

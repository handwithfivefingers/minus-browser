let _payload: any = null

export function setPayload(payload: any) {
  _payload = payload
}

export function consumePayload<T>(): T | null {
  const p = _payload
  _payload = null
  return p
}

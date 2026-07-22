interface FindbarAPI {
  textChange(text: string): void
  findNext(): void
  findPrevious(): void
  close(): void
  matchCase(value: boolean): void
  onMatches(callback: (active: number, total: number) => void): void
  onFocusInput(callback: () => void): void
}

declare global {
  interface Window {
    findbarAPI?: FindbarAPI
  }
}

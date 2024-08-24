export function empty(element: HTMLElement) {
  element.textContent = ""
}

// Wait for the timeout, but don't run if tab is not visible
export function setTimeoutUntilVisible(cb: Function, ms: number) {
  return setTimeout(requestAnimationFrame, ms, cb)
}

export function empty(element) {
	element.textContent = '';
}

// Wait for the timeout, but don't run if tab is not visible
export function setTimeoutUntilVisible(callback, ms) {
	return setTimeout(requestAnimationFrame, ms, callback);
}

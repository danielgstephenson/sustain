export function shuffle (array) {
  return array.slice().sort(() => Math.random() - 0.5)
}

export function range (n) {
  return [...Array(n).keys()]
}

export function clamp (a, b, x) {
  return Math.max(a, Math.min(b, x))
}

export function choose (array) {
  return array[Math.floor(Math.random() * array.length)]
}

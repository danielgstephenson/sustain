export function shuffle (array) {
  return array.slice().sort(() => Math.random() - 0.5)
}

export function range (n) {
  return [...Array(n).keys()]
}

export function choose (array) {
  return array[Math.floor(Math.random() * array.length)]
}

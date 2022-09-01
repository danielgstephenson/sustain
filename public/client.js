/* global OffscreenCanvas */

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')

const N = 8
const L = N - 1
const tickInterval = 100

const canvas0 = new OffscreenCanvas(N, N)
const context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

function range (n) { return [...Array(n).keys()] }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
// const sum = array => array.reduce((a, b) => a + b, 0)

// Disable Right Click Menu
document.oncontextmenu = () => false

const mouse = {
  down: [false, false, false],
  loc: [0, 0],
  x: 0,
  y: 0,
  node: {}
}
const keys = {
  shift: false
}
const state = {
  time: 0,
  scale: 1
}

const grid = range(N).map(i => range(N).map(j => {
  const node = { x: j, y: i }
  node.color = 'green'
  node.fill = 1
  node.newColor = node.color
  node.newFill = node.fill
  node.edges = []
  node.neighbors = []
  node.count = {}
  return node
}))
const nodes = grid.flat()
range(N).forEach(i => range(N).forEach(j => {
  const node = grid[i][j]
  if (i < L) node.neighbors.push(grid[i + 1][j])
  if (i > 0) node.neighbors.push(grid[i - 1][j])
  if (j < L) node.neighbors.push(grid[i][j + 1])
  if (j > 0) node.neighbors.push(grid[i][j - 1])
}))
const edges = []
range(N).forEach(i => range(N).forEach(j => {
  if (i < L) {
    const a = grid[i][j]
    const b = grid[i + 1][j]
    const edge = { a, b, flow: 0 }
    edges.push(edge)
    a.edges.push(edge)
    b.edges.push(edge)
  }
  if (j < L) {
    const a = grid[i][j]
    const b = grid[i][j + 1]
    const edge = { a, b, flow: 0 }
    edges.push(edge)
    a.edges.push(edge)
    b.edges.push(edge)
  }
}))
console.log(edges)

function updateMouse (e) {
  const cx = canvas1.getBoundingClientRect().left
  const cy = canvas1.getBoundingClientRect().top
  mouse.y = Math.floor((e.pageY - cy) * N / state.scale)
  mouse.x = Math.floor((e.pageX - cx) * N / state.scale)
  if (mouse.x >= 0 && mouse.x < N && mouse.y >= 0 && mouse.y < N) {
    mouse.node = grid[mouse.y][mouse.x]
  }
}

window.onmousemove = function (e) {
  updateMouse(e)
}

window.onmousedown = function (e) {
  if (e.button === 0) mouse.down[0] = true
  if (e.button === 1) mouse.down[1] = true
  if (e.button === 2) mouse.down[2] = true
  updateMouse(e)
  console.log(mouse.node)
  const oldColor = mouse.node.color
  if (e.button === 0) {
    if (oldColor === 'green') { mouse.node.color = 'blue' }
    if (oldColor === 'blue') { mouse.node.color = 'green' }
  }
  if (e.button === 2) {
    if (oldColor === 'green') { mouse.node.color = 'red' }
    if (oldColor === 'red') { mouse.node.color = 'green' }
  }
}

window.onmouseup = function (e) {
  if (e.button === 0) mouse.down[0] = false
  if (e.button === 1) mouse.down[1] = false
  if (e.button === 2) mouse.down[2] = false
}

window.onkeydown = function (e) {
  if (e.key === 'Shift') keys.shift = true
}

window.onkeyup = function (e) {
  if (e.key === 'Shift') keys.shift = false
}

function update () {
  const dt = tickInterval / 1000
  state.time += dt
  nodes.forEach(node => {
    node.count = {}
    for (const color in colors) node.count[color] = 0
    for (const neighbor of node.neighbors) {
      node.count[neighbor.color] += 1
    }
  })
  nodes.forEach(node => {
    node.newColor = node.color
    node.newFill = node.fill
    const size = 8
    const step = 1 / size
    if (['blue', 'red'].includes(node.color)) {
      const fills = node.neighbors.map(neighbor => {
        return ['green', node.color].includes(neighbor.color) ? neighbor.fill - step : 0
      })
      node.newFill = Math.max(...fills)
      if (node.newFill <= step) {
        node.newColor = 'green'
        node.newFill = step
      }
    } else if (node.color === 'green') {
      node.newFill = (size - 4 + node.count.green) * step
    }
  })
  nodes.forEach(node => {
    node.color = node.newColor
    node.fill = node.newFill
  })
}

function setupCanvas () {
  state.scale = 0.95 * Math.min(window.innerHeight, window.innerWidth)
  canvas1.width = state.scale
  canvas1.height = state.scale
  const xTranslate = 0
  const yTranslate = 0
  const xScale = state.scale / N
  const yScale = state.scale / N
  context1.setTransform(xScale, 0, 0, yScale, xTranslate, yTranslate)
  context1.imageSmoothingEnabled = false
}

const colors = {
  red: { r: 1, b: 0, g: 0 },
  green: { r: 0, b: 0, g: 1 },
  blue: { r: 0, b: 1, g: 0 }
}

function drawState () {
  const imageData = context0.createImageData(N, N)
  range(N * N).forEach(i => {
    const node = nodes[i]
    const color = colors[node.color]
    imageData.data[i * 4 + 0] = 255 * color.r * node.fill
    imageData.data[i * 4 + 1] = 255 * color.g * node.fill
    imageData.data[i * 4 + 2] = 255 * color.b * node.fill
    imageData.data[i * 4 + 3] = 255
  })
  context0.putImageData(imageData, 0, 0)
  context1.clearRect(0, 0, 100, 100)
  context1.drawImage(canvas0, 0, 0)
}

function draw () {
  setupCanvas()
  drawState()
  window.requestAnimationFrame(draw)
}

draw()

setInterval(update, tickInterval)

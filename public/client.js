/* global OffscreenCanvas */

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')

const N = 8
const L = N - 1
const canvas0 = new OffscreenCanvas(N, N)
const context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

// Disable Right Click Menu
document.oncontextmenu = () => false

function range (n) { return [...Array(n).keys()] }
function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
// const sum = array => array.reduce((a, b) => a + b, 0)

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
let scale = 1

const grid = range(N).map(i => range(N).map(j => {
  const node = { color: 'green', fill: 0, growth: 0, x: j, y: i }
  node.edges = []
  node.neighbors = []
  return node
}))
const nodes = grid.flat()
range(N).forEach(i => range(N).forEach(j => {
  const node = grid[i][j]
  if (i < L) node.neighbors.push(grid[i + 1][j])
  if (i > 0) node.neighbors.push(grid[i - 1][j])
  if (j < L) node.neighbors.push(grid[i][j + 1])
  if (j > 0) node.neighbors.push(grid[i][j - 1])
  if (i < L && j < L) node.neighbors.push(grid[i + 1][j + 1])
  if (i < L && j > 0) node.neighbors.push(grid[i + 1][j - 1])
  if (i > 0 && j < L) node.neighbors.push(grid[i - 1][j + 1])
  if (i > 0 && j > 0) node.neighbors.push(grid[i - 1][j - 1])
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
  mouse.y = Math.floor((e.pageY - cy) * N / scale)
  mouse.x = Math.floor((e.pageX - cx) * N / scale)
  if (mouse.x >= 0 && mouse.x < N && mouse.y >= 0 && mouse.y < N) {
    mouse.node = grid[mouse.y][mouse.x]
  }
}

function plant () {
  if (mouse.down[0] && mouse.node.state === 'empty') {
    mouse.node.state = 'blue'
  }
  if (mouse.down[2] && mouse.node.state === 'empty') {
    mouse.node.state = 'green'
  }
}

window.onmousemove = function (e) {
  updateMouse(e)
  plant()
}

window.onmousedown = function (e) {
  if (e.button === 0) mouse.down[0] = true
  if (e.button === 1) mouse.down[1] = true
  if (e.button === 2) mouse.down[2] = true
  updateMouse(e)
  plant()
  console.log(mouse.node.fill, mouse.node.growth)
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
  const dt = 0.25
  edges.forEach(edge => {
    edge.flow = (edge.a.fill - edge.b.fill)
  })
  edges.forEach(edge => {
    edge.a.fill -= dt * edge.flow
    edge.b.fill += dt * edge.flow
  })
  if (mouse.down[0]) mouse.node.growth = mouse.node.growth + 0.1
  if (mouse.down[2]) mouse.node.growth = mouse.node.growth - 0.1
  nodes.forEach(node => { node.fill = clamp(0, 1, node.fill + node.growth) })
}

function setupCanvas () {
  scale = 0.95 * Math.min(window.innerHeight, window.innerWidth)
  canvas1.width = scale
  canvas1.height = scale
  const xTranslate = 0
  const yTranslate = 0
  const xScale = scale / N
  const yScale = scale / N
  context1.setTransform(xScale, 0, 0, yScale, xTranslate, yTranslate)
  context1.imageSmoothingEnabled = false
}

function drawState () {
  const imageData = context0.createImageData(N, N)
  range(N * N).forEach(i => {
    const node = nodes[i]
    const red = (node.color === 'red') * node.fill
    const green = (node.color === 'green') * node.fill
    const blue = (node.color === 'blue') * node.fill
    imageData.data[i * 4 + 0] = 255 * red
    imageData.data[i * 4 + 1] = 255 * green
    imageData.data[i * 4 + 2] = 255 * blue
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
setInterval(update, 100)

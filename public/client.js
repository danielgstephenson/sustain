/* global OffscreenCanvas */

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')

const N = 8
const L = N - 1
const tickInterval = 100
const year = 20
const tilt = 2 * Math.random() - 1

const canvas0 = new OffscreenCanvas(N, N)
const context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

function range (n) { return [...Array(n).keys()] }
function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
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
  const node = { color: 'green', fill: 0.5, growth: 0, x: j, y: i }
  node.season = 0
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

function plant () {
  if (mouse.down[0]) {
    mouse.node.state = 'blue'
  }
  if (mouse.down[2]) {
    mouse.node.state = 'red'
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
  console.log(mouse.node)
  const oldColor = mouse.node.color
  if (e.button === 0) {
    if (oldColor === 'green') mouse.node.color = 'blue'
    if (oldColor === 'blue') mouse.node.color = 'green'
  }
  if (e.button === 2) {
    if (oldColor === 'green') mouse.node.color = 'red'
    if (oldColor === 'red') mouse.node.color = 'green'
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
  range(30).forEach(i => {
    edges.forEach(edge => {
      const maxFlow = 0.25 * edge.a.fill
      const minFlow = -0.25 * edge.b.fill
      edge.flow += 0.1 * dt * (edge.a.fill - edge.b.fill)
      if (edge.a.color === edge.b.color) {
        edge.flow = clamp(minFlow, maxFlow, edge.flow)
      } else if (edge.a.color === 'green') {
        edge.flow = clamp(0, maxFlow, edge.flow)
      } else if (edge.b.color === 'green') {
        edge.flow = clamp(minFlow, 0, edge.flow)
      } else {
        edge.flow = 0
      }
    })
    edges.forEach(edge => {
      edge.a.fill -= edge.flow
      edge.b.fill += edge.flow
    })
  })
  nodes.forEach(node => {
    if (node.color === 'green') {
      const nodeTime = 2 * state.time / year + 0.1 * node.y / N
      node.season = Math.sin(2 * Math.PI * nodeTime)
      node.growth = dt * 0.5
    } else {
      node.growth = -dt * 0.5
      node.capacity = 1
    }
    node.fill = clamp(0, 1, node.fill + node.growth)
    if (node.fill < 0.1) node.color = 'green'
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

setInterval(update, tickInterval)

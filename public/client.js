/* global OffscreenCanvas */

import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const blueDiv = document.getElementById('blueDiv')
const greenDiv = document.getElementById('greenDiv')

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')
context1.imageSmoothingEnabled = false
let N = 50
let canvas0 = new OffscreenCanvas(N, N)
let context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

let counts = { 1: 0, 2: 0, 3: 0 }
let gameOver = false
let nodes = []
let grid = []
setupNodes(N)

let buildTimer = 0

console.log('nodes', nodes)

let team = 0

const camera = {
  scale: 1,
  zoom: 0,
  x: 0,
  y: 0
}

let canvasSize = 1

socket.on('updateClient', (msg) => {
  console.log('updateClient delay', (mouse.time - msg.mouse.time) / 1000)
  const cursor = msg.team === 1 ? "url('BlueCursor.png') 1 1, pointer" : "url('GreenCursor.png') 1 1, pointer"
  document.body.style.cursor = cursor
  team = msg.team
  counts = msg.counts
  buildTimer = msg.buildTimer
  gameOver = msg.gameOver
  const scoreDisplay = gameOver ? 'block' : 'none'
  blueDiv.style.display = scoreDisplay
  greenDiv.style.display = scoreDisplay
  blueDiv.innerHTML = counts[1]
  greenDiv.innerHTML = counts[2]
})

socket.on('updateClientState', (msg) => {
  if (N !== msg.N) {
    N = msg.N
    setupNodes(N)
    canvas0 = new OffscreenCanvas(N, N)
    context0 = canvas0.getContext('2d')
    context0.imageSmoothingEnabled = false
    console.log('reset canvas0')
  }
  msg.states.forEach((state, i) => {
    nodes[i].state = state
  })
})

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
  canvasX: 0,
  canvasY: 0,
  time: Date.now()
}
const keys = new Map()
keys.set('w', 'up')
keys.set('s', 'down')
keys.set('a', 'left')
keys.set('d', 'right')
keys.set('ArrowUp', 'up')
keys.set('ArrowDown', 'down')
keys.set('ArrowLeft', 'left')
keys.set('ArrowRight', 'right')
keys.set(' ', 'select')
keys.set('Enter', 'select')

function updateMouse (e) {
  const cx = canvas1.getBoundingClientRect().left
  const cy = canvas1.getBoundingClientRect().top
  const canvasPixelX = e.pageX - cx
  const canvasPixelY = e.pageY - cy
  mouse.canvasX = 100 * canvasPixelX / canvasSize
  mouse.canvasY = 100 * canvasPixelY / canvasSize
  mouse.x = Math.floor(N * (mouse.canvasX + camera.x) / (100 * camera.scale))
  mouse.y = Math.floor(N * (mouse.canvasY + camera.y) / (100 * camera.scale))
}

window.onmousemove = function (e) {
  updateMouse(e)
  if (mouse.down[2]) {
    const dx = e.movementX * 300 / canvasSize
    const dy = e.movementY * 300 / canvasSize
    camera.x -= dx
    camera.y -= dy
    camera.x = clamp(0, 100 * (camera.scale - 1), camera.x)
    camera.y = clamp(0, 100 * (camera.scale - 1), camera.y)
  }
}

window.onwheel = function (e) {
  updateMouse(e)
  camera.zoom -= e.deltaY / 1000
  camera.zoom = Math.max(0, camera.zoom)
  const oldScale = camera.scale
  camera.scale = Math.exp(camera.zoom)
  camera.x += mouse.x / N * 100 * (camera.scale - oldScale)
  camera.y += mouse.y / N * 100 * (camera.scale - oldScale)
  camera.x = clamp(0, 100 * (camera.scale - 1), camera.x)
  camera.y = clamp(0, 100 * (camera.scale - 1), camera.y)
}

window.onmousedown = function (e) {
  if (e.button === 0) mouse.down[0] = true
  if (e.button === 1) mouse.down[1] = true
  if (e.button === 2) mouse.down[2] = true
  updateMouse(e)
  console.log('counts', counts)
}

window.onmouseup = function (e) {
  if (e.button === 0) mouse.down[0] = false
  if (e.button === 1) mouse.down[1] = false
  if (e.button === 2) mouse.down[2] = false
}

window.onkeydown = function (e) {
  if (e.key === 'Enter') socket.emit('initialize')
  keys.forEach((value, key) => {
    if (e.key === key) keys[value] = true
  })
}

window.onkeyup = function (e) {
  keys.forEach((value, key) => {
    if (e.key === key) keys[value] = false
  })
}

function setupCanvas () {
  canvasSize = 1 * Math.min(window.innerHeight, window.innerWidth)
  canvas1.width = canvasSize
  canvas1.height = canvasSize
  const xTranslate = 0
  const yTranslate = 0
  const xScale = canvasSize / 100
  const yScale = canvasSize / 100
  context1.setTransform(xScale, 0, 0, yScale, xTranslate, yTranslate)
  context1.imageSmoothingEnabled = false
}

const colors = {
  d5: { r: 0.7, g: 0.7, b: 0.7 },
  d4: { r: 0.6, g: 0.6, b: 0.6 },
  d3: { r: 0.5, g: 0.5, b: 0.5 },
  d2: { r: 0.4, g: 0.4, b: 0.4 },
  d1: { r: 0.3, g: 0.3, b: 0.3 },
  d0: { r: 0.2, g: 0.2, b: 0.2 },
  e: { r: 0, g: 0, b: 0 },
  g: { r: 0, g: 0.7, b: 0 },
  b: { r: 0, g: 0.2, b: 1 },
  r: { r: 0.3, g: 0.02, b: 0.02 },
  mouse: { r: 0, g: 0.3, b: 0.3 },
  selected: { r: 0, g: 0.8, b: 0.8 }
}

function drawState () {
  const imageData = context0.createImageData(N, N)
  range(N * N).forEach(i => {
    const node = nodes[i]
    if (node) {
      const color = colors[node.state]
      imageData.data[i * 4 + 0] = 255 * color.r
      imageData.data[i * 4 + 1] = 255 * color.g
      imageData.data[i * 4 + 2] = 255 * color.b
      imageData.data[i * 4 + 3] = 255
    }
  })
  context0.putImageData(imageData, 0, 0)
  context1.clearRect(0, 0, 100, 100)
  const w = 100 * camera.scale
  const h = 100 * camera.scale
  context1.drawImage(canvas0, -camera.x, -camera.y, w, h)
  if (team === 1) colors.mouse = { r: 0, g: 0.2, b: 0.5 }
  if (team === 2) colors.mouse = { r: 0, g: 0.5, b: 0.2 }
  if (!gameOver) {
    const g = (255 * 2 * colors.mouse.g).toFixed(0)
    const b = (255 * 2 * colors.mouse.b).toFixed(0)
    context1.strokeStyle = `rgba(0,${g},${b},1)`
    const scale = camera.scale * 100 / N
    context1.lineWidth = 0.25 * scale
    context1.beginPath()
    const radians = 2 * Math.PI * buildTimer
    const x = mouse.x * scale + 0.5 * scale - camera.x
    const y = mouse.y * scale + 0.5 * scale - camera.y
    context1.arc(x, y, 0.3 * scale, 0, radians)
    context1.stroke()
  }
}

function draw () {
  setupCanvas()
  drawState()
  window.requestAnimationFrame(draw)
}

draw()

setInterval(updateServer, 100)

function updateServer () {
  mouse.time = Date.now()
  const msg = { mouse }
  socket.emit('updateServer', msg)
}

function setupNodes (N) {
  grid = range(N).map(i => range(N).map(j => {
    const node = {
      state: 'e',
      x: j,
      y: i,
      selected: { 1: false, 2: false }
    }
    return node
  }))
  nodes = grid.flat()
  nodes.forEach((node, index) => {
    node.id = index
  })
}

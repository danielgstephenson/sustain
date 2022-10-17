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

let state = {
  time: 0,
  nodes: [],
  grid: [],
  scores: [0, 0],
  team: 1,
  N: 80
}

let team = 0

const camera = {
  scale: 1,
  zoom: 0,
  x: 0,
  y: 0
}

let canvasSize = 1

socket.on('updateClient', (msg) => {
  const cursor = msg.team === 1 ? "url('BlueCursor.png'), pointer" : "url('GreenCursor.png'), pointer"
  document.body.style.cursor = cursor
  team = msg.team
  console.log('updateClient delay', (mouse.time - msg.mouse.time) / 1000)
})

socket.on('updateClientState', (msg) => {
  if (N !== state.N) {
    N = state.N
    canvas0 = new OffscreenCanvas(N, N)
    context0 = canvas0.getContext('2d')
    context0.imageSmoothingEnabled = false
    console.log('reset canvas0')
  }
  state = msg.state
  blueDiv.innerHTML = state.scores[1]
  greenDiv.innerHTML = state.scores[2
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
  const dScale = camera.scale - oldScale
  console.log('dScale', dScale)
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
  console.log(state)
}

window.onmouseup = function (e) {
  if (e.button === 0) mouse.down[0] = false
  if (e.button === 1) mouse.down[1] = false
  if (e.button === 2) mouse.down[2] = false
}

window.onkeydown = function (e) {
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
  dead5: { r: 0.7, g: 0.7, b: 0.7 },
  dead4: { r: 0.6, g: 0.6, b: 0.6 },
  dead3: { r: 0.5, g: 0.5, b: 0.5 },
  dead2: { r: 0.4, g: 0.4, b: 0.4 },
  dead1: { r: 0.3, g: 0.3, b: 0.3 },
  dead0: { r: 0.2, g: 0.2, b: 0.2 },
  empty: { r: 0, g: 0, b: 0 },
  green: { r: 0, g: 0.7, b: 0 },
  blue: { r: 0, g: 0.2, b: 1 },
  red: { r: 0.3, g: 0.02, b: 0.02 },
  mouse: { r: 0, g: 0.3, b: 0.3 },
  selected: { r: 0, g: 0.8, b: 0.8 }
}

function drawState () {
  const C = 1 - (state.buildTimer / state.buildInterval) ** 2
  if (team === 1) colors.mouse = { r: 0, g: 0.5 + 0.5 * C, b: 1 }
  if (team === 2) colors.mouse = { r: 0, g: 1, b: 0.5 + 0.5 * C }
  const imageData = context0.createImageData(N, N)
  range(N * N).forEach(i => {
    const node = state.nodes[i]
    if (node) {
      let color = colors[node.state]
      if (node.state === 'empty') {
        if (node.selectGreen || node.selectBlue) {
          color = colors.selected
        } else if (node.x === mouse.x && node.y === mouse.y) {
          color = colors.mouse
        }
      }
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
  context1.strokeStyle = 'rgb(60,0,0)'
  context1.lineWidth = 0.2 * camera.scale
  const offset = 0.5 * context1.lineWidth
  context1.strokeRect(-camera.x - offset, -camera.y - offset, w + 2 * offset, h + 2 * offset)
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

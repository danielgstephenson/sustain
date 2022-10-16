/* global OffscreenCanvas */

import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const blueDiv = document.getElementById('blueDiv')
const greenDiv = document.getElementById('greenDiv')

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')
context1.imageSmoothingEnabled = false
let N = 80
let canvas0 = new OffscreenCanvas(N, N)
let context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

const state = {
  time: 0,
  nodes: [],
  grid: [],
  scores: [0, 0],
  team: 1,
  N: 80
}
let scale = 1

socket.on('updateClient', (msg) => {
  for (const property in msg.state) {
    state[property] = msg.state[property]
  }
  state.team = msg.team
  const cursor = msg.team === 1 ? "url('BlueCursor.png'), pointer" : "url('GreenCursor.png'), pointer"
  document.body.style.cursor = cursor
  if (N !== state.N) {
    N = state.N
    canvas0 = new OffscreenCanvas(N, N)
    context0 = canvas0.getContext('2d')
    context0.imageSmoothingEnabled = false
  }
  blueDiv.innerHTML = state.scores[1]
  greenDiv.innerHTML = state.scores[2]
})

function range (n) { return [...Array(n).keys()] }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
// const sum = array => array.reduce((a, b) => a + b, 0)

// Disable Right Click Menu
document.oncontextmenu = () => false

const mouse = {
  down: [false, false, false],
  loc: [0, 0],
  x: 0,
  y: 0
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
  mouse.y = Math.floor((e.pageY - cy) * N / scale)
  mouse.x = Math.floor((e.pageX - cx) * N / scale)
}

window.onmousemove = function (e) {
  updateMouse(e)
}

window.onmousedown = function (e) {
  console.log('state', state)
  console.log('mouse', mouse)
  console.log('canvas0.height', canvas0.height)
  console.log('canvas0.width', canvas0.width)
  if (e.button === 0) mouse.down[0] = true
  if (e.button === 1) mouse.down[1] = true
  if (e.button === 2) mouse.down[2] = true
  updateMouse(e)
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

window.onwheel = function (e) {
  keys.zoom -= e.deltaY / 1000
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
  // context.clearRect(0, 0, 100, 100)
  const C = 1 - (state.buildTimer / state.buildInterval) ** 2
  if (state.team === 1) colors.mouse = { r: 0, g: 0.5 + 0.5 * C, b: 1 }
  if (state.team === 2) colors.mouse = { r: 0, g: 1, b: 0.5 + 0.5 * C }
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
  context1.drawImage(canvas0, 0, 0)
}

function draw () {
  setupCanvas()
  drawState()
  window.requestAnimationFrame(draw)
}

draw()

setInterval(updateServer, 50)

function updateServer () {
  const msg = { mouse }
  socket.emit('updateServer', msg)
}

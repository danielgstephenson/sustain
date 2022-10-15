/* global OffscreenCanvas */

import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const blueDiv = document.getElementById('blueDiv')
const greenDiv = document.getElementById('greenDiv')

const canvas1 = document.getElementById('canvas')
const context1 = canvas1.getContext('2d')
context1.imageSmoothingEnabled = false
const N = 50
const canvas0 = new OffscreenCanvas(N, N)
const context0 = canvas0.getContext('2d')
context0.imageSmoothingEnabled = false

const state = {
  time: 0,
  nodes: [],
  grid: [],
  scores: [0, 0],
  team: 1
}
let scale = 1

socket.on('updateClient', (msg) => {
  for (const property in msg.state) {
    state[property] = msg.state[property]
  }
  state.team = msg.team
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
  dead3: { r: 0.8, g: 0.8, b: 0.8 },
  dead2: { r: 0.6, g: 0.6, b: 0.6 },
  dead1: { r: 0.4, g: 0.4, b: 0.4 },
  dead0: { r: 0.2, g: 0.2, b: 0.2 },
  empty: { r: 0, g: 0, b: 0 },
  green: { r: 0, g: 0.7, b: 0 },
  blue: { r: 0, g: 0, b: 1 },
  red: { r: 1, g: 0, b: 0 },
  mouse: { r: 0, g: 0.3, b: 0.3 },
  selected: { r: 0, g: 0.8, b: 0.8 }
}

function drawState () {
  // context.clearRect(0, 0, 100, 100)
  const buildAlpha = 0.8 * (0.3 + 0.7 * (state.buildTimer / state.buildInterval) ** 2)
  colors.mouse = state.team === 1 ? { r: 0, g: 0, b: buildAlpha } : { r: 0, g: 0.7 * buildAlpha, b: 0 }
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

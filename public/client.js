import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const canvas = document.getElementById('mapCanvas')
const context = canvas.getContext('2d')
const colors = {
  0: { H: 60, S: 100, L: 40 },
  1: { H: 240, S: 100, L: 50 },
  2: { H: 130, S: 100, L: 35 }
}

let msgLog = {}
let nodes = []

socket.on('updateClient', (msg) => {
  // const cursor = msg.team === 1 ? "url('BlueCursor.png') 1 1, pointer" : "url('GreenCursor.png') 1 1, pointer"
  // document.body.style.cursor = cursor
  msgLog = msg
  nodes = msg.nodes
})

function range (n) { return [...Array(n).keys()] }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
// const sum = array => array.reduce((a, b) => a + b, 0)

window.oncontextmenu = () => false
window.onmousedown = () => {
  console.log(msgLog)
}

function setupCanvas () {
  const vmin = Math.min(window.innerHeight, window.innerWidth)
  canvas.width = vmin
  canvas.height = vmin
  resetContext()
}

function resetContext () {
  const vmin = Math.min(window.innerHeight, window.innerWidth)
  context.resetTransform()
  context.translate(0.5 * vmin, 0.5 * vmin)
  context.scale(0.1 * vmin, -0.1 * vmin)
}

function drawNodes () {
  context.clearRect(0, 0, 100, 100)
  nodes.forEach(node => {
    const size = 1
    const color = colors[node.align]
    resetContext()
    context.fillStyle = `hsla(${color.H}, ${color.S}%, ${color.L}%, 0.3)`
    context.translate(size * node.x, size * node.y)
    context.beginPath()
    context.moveTo(size, 0)
    range(6).forEach(i => {
      const angle = 2 * Math.PI * (i + 1) / 6
      const x = size * Math.cos(angle)
      const y = size * Math.sin(angle)
      context.lineTo(x, y)
    })
    context.fill()
    resetContext()
    const radius = Math.sqrt(node.life)
    context.fillStyle = `hsla(${color.H}, ${color.S}%, ${color.L}%, 1)`
    context.translate(size * node.x, size * node.y)
    context.beginPath()
    context.moveTo(size * radius, 0)
    range(6).forEach(i => {
      const angle = 2 * Math.PI * (i + 1) / 6
      const x = size * Math.cos(angle) * radius
      const y = size * Math.sin(angle) * radius
      context.lineTo(x, y)
    })
    context.fill()
  })
}

function draw () {
  setupCanvas()
  drawNodes()
  window.requestAnimationFrame(draw)
}

draw()

setInterval(updateServer, 100)

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')

let nodes = []
let hexes = []
let serverId = 0
let mapRadius = 1
let team = 0
let wait = 0
let targetHex = {}
let msgLog = {}

const socket = io()
socket.on('updateClient', (msg) => {
  msgLog = msg
  nodes = msg.nodes
  team = msg.team
  wait = msg.wait
  if (msg.serverId !== serverId) {
    mapRadius = msg.mapRadius
    serverId = msg.serverId
    setupMap()
  }
  updateHexColors()
})

window.oncontextmenu = () => false

const radius = 0.90
let hexPoints = `${radius},0`
range(6).forEach(i => {
  const angle = 2 * Math.PI * (i + 1) / 6
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  hexPoints = hexPoints + ` ${x},${y}`
})
const circumference = 6 * 12 * radius * Math.sin(1 / 12)

function setupMap () {
  mapSvg.innerHTML = ''
  hexes = []
  const z = 2 + 2 * Math.sqrt(3 / 4) * mapRadius
  mapSvg.setAttributeNS(null, 'viewBox', `-${z} -${z} ${2 * z} ${2 * z}`)
  nodes.forEach(node => {
    const hex = document.createElementNS(svgns, 'polygon')
    hex.setAttributeNS(null, 'points', hexPoints)
    hex.setAttributeNS(null, 'transform', `translate(${node.x},${node.y})`)
    hex.id = node.id
    hexes[node.id] = hex
    mapSvg.appendChild(hex)
    hex.onmouseover = () => {
      targetHex = hex
    }
    hex.onmouseleave = () => {
      hex.style.strokeWidth = 0
      targetHex = {}
    }
    hex.onmousedown = () => {
      socket.emit('activate', { id: hex.id })
      console.log('msgLog', msgLog)
    }
  })
}

function drawOutline () {
  hexes.forEach(hex => {
    hex.style.strokeWidth = 0
  })
  if (targetHex.id) {
    targetHex.style.strokeDasharray = `${(1 - wait) * circumference} ${wait * circumference} `
    if ([0, 3].includes(nodes[targetHex.id].align)) {
      const color = colors[team]
      targetHex.style.stroke = `hsla(${color.H}, ${color.S}%, ${color.L}%)`
      targetHex.style.strokeWidth = 1 - radius
    }
    if (nodes[targetHex.id].align === team) {
      const color = colors[0]
      targetHex.style.stroke = `hsla(${color.H}, ${color.S}%, ${color.L}%)`
      targetHex.style.strokeWidth = 1 - radius
    }
  }
}

const colors = {
  0: { H: 120, S: 100, L: 30 },
  1: { H: 240, S: 100, L: 50 },
  2: { H: 0, S: 100, L: 30 },
  3: { H: 100, S: 0, L: 30 }
}

function updateHexColors () {
  hexes.forEach(hex => {
    const node = nodes[hex.id]
    const color = colors[node.align]
    hex.style.fill = `hsla(${color.H}, ${color.S * node.saturation}%, ${color.L * node.lightness}%, 1)`
  })
}

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

setInterval(updateServer, 100)
setInterval(drawOutline, 10)

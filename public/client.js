import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const countDiv1 = document.getElementById('countDiv1')
const countDiv2 = document.getElementById('countDiv2')
const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')
const scoreSvg1 = document.getElementById('scoreSvg1')
const scoreSvg2 = document.getElementById('scoreSvg2')

console.log(scoreSvg1)

let nodes = []
let hexes = []
let teams = {}
let serverId = 0
let mapRadius = 1
let team = 0
let wait = 0
let targetHex = {}
let msgLog = {}

window.oncontextmenu = () => false
window.onmousedown = () => { console.log(msgLog) }

const socket = io()
socket.on('updateClient', (msg) => {
  msgLog = msg
  nodes = msg.nodes
  team = msg.team
  wait = msg.wait
  teams = msg.teams
  if (msg.serverId !== serverId) {
    mapRadius = msg.mapRadius
    serverId = msg.serverId
    setupMap()
  }
  countDiv1.innerHTML = teams[1].nodeCount
  countDiv2.innerHTML = teams[2].nodeCount
  updateHexColors()
})

const radius = 0.9
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
    }
  })
}

function drawOutline () {
  hexes.forEach(hex => {
    hex.style.strokeWidth = 0
  })
  if (targetHex.id) {
    const strokeWidth = 0.3
    targetHex.style.strokeDasharray = `${(1 - wait) * circumference} ${wait * circumference} `
    if ([0, 3].includes(nodes[targetHex.id].align)) {
      const color = colors[team]
      targetHex.style.stroke = `hsla(${color.H1}, ${color.S1}%, ${color.L1}%)`
      targetHex.style.strokeWidth = strokeWidth
    }
    if (nodes[targetHex.id].align === team) {
      const color = colors[0]
      targetHex.style.stroke = `hsla(${color.H1}, ${color.S1}%, ${color.L1}%)`
      targetHex.style.strokeWidth = strokeWidth
    }
  }
}

const colors = {
  0: { H0: 120, H1: 120, S0: 100, S1: 100, L0: 20, L1: 80 },
  1: { H0: 180, H1: 240, S0: 100, S1: 100, L0: 20, L1: 50 },
  2: { H0: 60, H1: 0, S0: 100, S1: 100, L0: 20, L1: 45 },
  3: { H0: 120, H1: 120, S0: 0, S1: 30, L0: 10, L1: 40 }
}

function updateHexColors () {
  hexes.forEach(hex => {
    const node = nodes[hex.id]
    const color = colors[node.align]
    const H = node.hue * color.H1 + (1 - node.hue) * color.H0
    const S = node.hue * color.S1 + (1 - node.hue) * color.S0
    const L = node.lightness * color.L1 + (1 - node.lightness) * color.L0
    hex.style.fill = `hsla(${H}, ${S}%, ${L}%, 1)`
  })
}

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

setInterval(updateServer, 100)
setInterval(drawOutline, 10)

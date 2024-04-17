import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')

let nodes = []
let hexes = []
let arrows = []
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
  updateArrows()
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

let arrowPoints = ''
arrowPoints += `${-0.05 * radius},${-0.05 * radius} `
arrowPoints += `${+0.50 * radius},${-0.05 * radius} `
arrowPoints += `${+0.50 * radius},${-0.25 * radius} `
arrowPoints += `${+0.90 * radius},${-0.05 * radius} `
// arrowPoints += `${+1.90 * radius},${-0.05 * radius} `
// arrowPoints += `${+1.90 * radius},${+0.05 * radius} `
arrowPoints += `${+0.90 * radius},${+0.05 * radius} `
arrowPoints += `${+0.50 * radius},${+0.25 * radius} `
arrowPoints += `${+0.50 * radius},${+0.05 * radius} `
arrowPoints += `${-0.05 * radius},${+0.05 * radius} `

function setupMap () {
  mapSvg.innerHTML = ''
  hexes = []
  arrows = []
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
  nodes.forEach(node => {
    const arrow = document.createElementNS(svgns, 'polygon')
    arrow.setAttributeNS(null, 'points', arrowPoints)
    arrow.setAttributeNS(null, 'transform', `translate(${node.x},${node.y}) rotate(${90})`)
    arrow.style.fill = 'black'
    arrow.id = node.id
    arrows[node.id] = arrow
    mapSvg.appendChild(arrow)
    arrow.onmouseover = () => {
      targetHex = hexes[node.id]
    }
    arrow.onmousedown = () => {
      socket.emit('activate', { id: node.id })
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
  0: { H: 125, S: 100, L: 30 },
  1: { H: 240, S: 100, L: 50 },
  2: { H: 0, S: 100, L: 30 },
  3: { H: 0, S: 0, L: 70 }
}

function updateHexColors () {
  hexes.forEach(hex => {
    const node = nodes[hex.id]
    const color = colors[node.align]
    hex.style.fill = `hsla(${color.H}, ${color.S}%, ${color.L}%, 1)`
  })
}

function updateArrows () {
  arrows.forEach(arrow => {
    const node = nodes[arrow.id]
    const x0 = node.x
    const y0 = node.y
    const target = nodes[node.neighbors[node.target]]
    const x1 = target.x
    const y1 = target.y
    const dx = x1 - x0
    const dy = y1 - y0
    const angle = Math.atan2(dy, dx) / Math.PI * 180
    arrow.setAttributeNS(null, 'transform', `translate(${node.x},${node.y}) rotate(${angle})`)
  })
}

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

setInterval(updateServer, 100)
setInterval(drawOutline, 10)

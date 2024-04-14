import { io } from './socketIo/socket.io.esm.min.js'
const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')

function range (n) { return [...Array(n).keys()] }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }
// const sum = array => array.reduce((a, b) => a + b, 0)

let msgLog = {}
let nodes = []
let hexes = []
let serverId = 0
let mapRadius = 1

const socket = io()
socket.on('updateClient', (msg) => {
  msgLog = msg
  nodes = msg.nodes
  if (msg.serverId !== serverId) {
    mapRadius = msg.mapRadius
    serverId = msg.serverId
    setupMap()
  }
  updateHexColors()
})

window.oncontextmenu = () => false
window.onmousedown = () => {
  console.log(serverId)
  console.log(msgLog)
  console.log(nodes)
}

const radius = 0.95
let hexPoints = `${radius},0`
range(6).forEach(i => {
  const angle = 2 * Math.PI * (i + 1) / 6
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  hexPoints = hexPoints + ` ${x},${y}`
})

function setupMap () {
  mapSvg.innerHTML = ''
  hexes = []
  const z = 2 + 2 * Math.sqrt(3 / 4) * mapRadius
  mapSvg.setAttributeNS(null, 'viewBox', `-${z} -${z} ${2 * z} ${2 * z}`)
  nodes.forEach(node => {
    const hex = document.createElementNS(svgns, 'polygon')
    hex.setAttributeNS(null, 'points', hexPoints)
    hex.setAttributeNS(null, 'transform', `translate(${node.x},${node.y})`)
    mapSvg.appendChild(hex)
    hexes[node.id] = hex
  })
}

const colors = {
  0: { H: 120, S: 100, L: 40 },
  1: { H: 240, S: 100, L: 50 },
  2: { H: 0, S: 100, L: 40 },
  3: { H: 0, S: 0, L: 70 }
}

function updateHexColors () {
  hexes.forEach((hex, i) => {
    const node = nodes[i]
    const color = colors[node.align]
    const fill = `hsla(${color.H}, ${color.S}%, ${color.L}%, ${0.25 + 0.75 * node.life})`
    hex.setAttributeNS(null, 'style', `fill: ${fill}; stroke: none; stroke-width: 0;`)
  })
}

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

setInterval(updateServer, 100)

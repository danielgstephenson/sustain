import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const countDiv1 = document.getElementById('countDiv1')
const countDiv2 = document.getElementById('countDiv2')
const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')
const scoreSvg1 = document.getElementById('scoreSvg1')
const scoreSvg2 = document.getElementById('scoreSvg2')
const crownSvg1 = document.getElementById('crownSvg1')
const crownSvg2 = document.getElementById('crownSvg2')

let nodes = []
let hexes = []
let teams = {}
let serverId = 0
let mapRadius = 1
let team = 0
let wait = 0
let targetHex = {}
let msgLog = {}
let gameOver = false

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
  circle1.style.strokeDasharray = `${teams[1].score} ${1 - teams[1].score}`
  circle2.style.strokeDasharray = `${teams[2].score} ${1 - teams[2].score}`
  gameOver = Math.max(teams[1].score, teams[2].score) >= 1
  if (gameOver) {
    if (teams[1].score >= teams[2].score) crown1.style.opacity = 1
    if (teams[2].score >= teams[1].score) crown2.style.opacity = 1
  } else {
    crown1.style.opacity = 0
    crown2.style.opacity = 0
  }
  updateHexColors()
})

const radius = 0.9

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
  if (targetHex.id && !gameOver) {
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

let hexPoints = `${radius},0`
range(6).forEach(i => {
  const angle = 2 * Math.PI * (i + 1) / 6
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  hexPoints = hexPoints + ` ${x},${y}`
})
const circumference = 6 * 12 * radius * Math.sin(1 / 12)

const crownTop = 50
const crownLeft = 0
const crownRight = 100
const crownBottom = 100
const crownDip = 75
let crownPoints = ''
crownPoints += `${0.00 * crownRight + 0.00 * crownLeft},${crownTop} `
crownPoints += `${0.25 * crownRight + 0.75 * crownLeft},${crownDip} `
crownPoints += `${0.50 * crownRight + 0.50 * crownLeft},${crownTop} `
crownPoints += `${0.75 * crownRight + 0.25 * crownLeft},${crownDip} `
crownPoints += `${1.00 * crownRight + 0.00 * crownLeft},${crownTop} `
crownPoints += `${1.00 * crownRight + 0.00 * crownLeft},${crownTop} `
crownPoints += `${0.90 * crownRight + 0.10 * crownLeft},${crownBottom} `
crownPoints += `${0.10 * crownRight + 0.90 * crownLeft},${crownBottom} `

const crown1 = document.createElementNS(svgns, 'polygon')
crown1.setAttributeNS(null, 'points', crownPoints)
crown1.style.fill = 'hsl(50, 100%, 50%)'
crown1.style.opacity = 0
crownSvg1.setAttributeNS(null, 'viewBox', '0 0 100 100')
crownSvg1.appendChild(crown1)

const crown2 = document.createElementNS(svgns, 'polygon')
crown2.setAttributeNS(null, 'points', crownPoints)
crown2.style.fill = 'hsl(50, 100%, 50%)'
crown2.style.opacity = 0
crownSvg2.setAttributeNS(null, 'viewBox', '0 0 100 100')
crownSvg2.appendChild(crown2)

const circle1 = document.createElementNS(svgns, 'circle')
circle1.setAttributeNS(null, 'cx', 0)
circle1.setAttributeNS(null, 'cy', 0)
circle1.setAttributeNS(null, 'r', 0.5 / Math.PI)
circle1.style.stroke = 'hsl(240, 100%, 50%)'
circle1.style.strokeWidth = 0.07
circle1.style.strokeDasharray = '0 1'
circle1.style.strokeDashoffset = 0
scoreSvg1.setAttributeNS(null, 'viewBox', '-0.25 -0.25 0.5 0.5')
scoreSvg1.appendChild(circle1)

const circle2 = document.createElementNS(svgns, 'circle')
circle2.setAttributeNS(null, 'cx', 0)
circle2.setAttributeNS(null, 'cy', 0)
circle2.setAttributeNS(null, 'r', 0.5 / Math.PI)
circle2.style.stroke = 'hsl(0, 100%, 40%)'
circle2.style.strokeWidth = 0.07
circle2.style.strokeDasharray = '0 1'
circle2.style.strokeDashoffset = 0
scoreSvg2.setAttributeNS(null, 'viewBox', '-0.25 -0.25 0.5 0.5')
scoreSvg2.appendChild(circle2)

setInterval(updateServer, 100)
setInterval(drawOutline, 10)

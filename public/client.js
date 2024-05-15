import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')
const upperMapDiv = document.getElementById('upperMapDiv')
const lowerMapDiv = document.getElementById('lowerMapDiv')
const crownSvg1 = document.getElementById('crownSvg1')
const scoreSvg1 = document.getElementById('scoreSvg1')
const crownSvg2 = document.getElementById('crownSvg2')
const scoreSvg2 = document.getElementById('scoreSvg2')
const cursorSvg = document.getElementById('cursorSvg')
const cursorDiv = document.getElementById('cursorDiv')
cursorDiv.style.opacity = 0

let nodes = []
let hexes = []
let teams = {}
let gameId = 0
let mapRadius = 1
let teamId = 0
let wait = 0
let targetId = -1
let msgLog = {}
let gameOver = false

window.oncontextmenu = () => false
window.onmousedown = () => { console.log(msgLog) }
document.onmousemove = event => {
  console.log(event)
  cursorDiv.style.left = `${event.pageX - 0.5 * cursorDiv.offsetWidth}px`
  cursorDiv.style.top = `${event.pageY - 0.5 * cursorDiv.offsetHeight}px`
  if (event.sourceCapabilities.firesTouchEvents) {
    cursorDiv.style.opacity = 0
  } else {
    cursorDiv.style.opacity = 1
  }
}

setInterval(updateServer, 50)

const socket = io()
socket.on('updateClient', (msg) => {
  msgLog = msg
  nodes = msg.nodes
  teamId = msg.teamId
  wait = msg.wait
  teams = msg.teams
  targetId = msg.targetId
  if (msg.gameId !== gameId) {
    mapRadius = msg.mapRadius
    gameId = msg.gameId
    setupMap()
  }
  countText1.innerHTML = teams[1].nodeCount
  countText2.innerHTML = teams[2].nodeCount
  scoreCircle1.style.strokeDasharray = `${teams[1].score} ${1 - teams[1].score}`
  scoreCircle1.style.strokeWidth = 0.012 + 0.1 * teams[1].victoryRatio
  scoreCircle2.style.strokeDasharray = `${teams[2].score} ${1 - teams[2].score}`
  scoreCircle2.style.strokeWidth = 0.012 + 0.1 * teams[2].victoryRatio
  gameOver = Math.max(teams[1].score, teams[2].score) >= 1
  if (gameOver) {
    if (teams[1].score >= teams[2].score) crown1.style.opacity = 1
    if (teams[2].score >= teams[1].score) crown2.style.opacity = 1
  } else {
    crown1.style.opacity = 0
    crown2.style.opacity = 0
  }
  if (window.innerWidth > window.innerHeight) {
    upperMapDiv.appendChild(mapSvg)
  } else {
    lowerMapDiv.appendChild(mapSvg)
  }
  updateHexColors()
  drawOutline()
  drawCursor()
})

const hexRadius = 0.95

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
      //
    }
    hex.onmouseleave = () => {
      //
    }
    hex.onmousedown = () => {
      const msg = { targetId: hex.id }
      socket.emit('target', msg)
    }
  })
}

function drawCursor () {
  cursorSvg.setAttributeNS(null, 'width', '4vmin')
  cursorSvg.setAttributeNS(null, 'height', '4vmin')
  const strokeWidth = 0.3
  const z = 1 + 0.5 * strokeWidth
  cursorSvg.setAttributeNS(null, 'viewBox', `-${z} -${z} ${2 * z} ${2 * z}`)
  cursorHex.style.strokeWidth = strokeWidth
  const color = outlineColors[teamId]
  cursorHex.style.stroke = `hsla(${color.H}, ${color.S}%, ${color.L}%)`
  cursorHex.style.fill = 'white'
  cursorHex.style.fillOpacity = '0.8'
}

function drawOutline () {
  hexes.forEach(hex => {
    hex.style.strokeWidth = 0
  })
  cursorHex.style.strokeDasharray = `${(1 - wait) * circumference} ${wait * circumference}`
  if (hexes[targetId] && !gameOver) {
    const targetHex = hexes[targetId]
    mapSvg.appendChild(targetHex)
    const strokeWidth = 0.4
    const color = outlineColors[teamId]
    targetHex.style.strokeDasharray = `${(1 - wait) * circumference} ${wait * circumference}`
    targetHex.style.stroke = `hsla(${color.H}, ${color.S}%, ${color.L}%)`
    targetHex.style.strokeWidth = strokeWidth
  }
  const wait1 = teams[1].wait
  const wait2 = teams[2].wait
  timerHex1.style.strokeDasharray = `${(1 - wait1) * circumference} ${wait1 * circumference}`
  timerHex2.style.strokeDasharray = `${(1 - wait2) * circumference} ${wait2 * circumference}`
}

const outlineColors = {
  0: { H: 100, S: 100, L: 80 },
  1: { H: 230, S: 100, L: 50 },
  2: { H: 0, S: 100, L: 40 }
}

function updateHexColors () {
  hexes.forEach(hex => {
    const node = nodes[hex.id]
    hex.style.fill = node.color
  })
}

function updateServer () {
  const msg = { }
  socket.emit('clientUpdateServer', msg)
}

let hexPoints = `${hexRadius},0`
range(6).forEach(i => {
  const angle = 2 * Math.PI * (i + 1) / 6
  const x = Math.cos(angle) * hexRadius
  const y = Math.sin(angle) * hexRadius
  hexPoints = hexPoints + ` ${x},${y}`
})
const circumference = 6 * 12 * hexRadius * Math.sin(1 / 12)

const crownTop = 80
const crownLeft = 10
const crownRight = 90
const crownBottom = 0
const crownDip = 50
let crownPoints = ''
crownPoints += `${0.00 * crownRight + 1.00 * crownLeft},${100 - crownTop} `
crownPoints += `${0.25 * crownRight + 0.75 * crownLeft},${100 - crownDip} `
crownPoints += `${0.50 * crownRight + 0.50 * crownLeft},${100 - crownTop} `
crownPoints += `${0.75 * crownRight + 0.25 * crownLeft},${100 - crownDip} `
crownPoints += `${1.00 * crownRight + 0.00 * crownLeft},${100 - crownTop} `
crownPoints += `${1.00 * crownRight + 0.00 * crownLeft},${100 - crownTop} `
crownPoints += `${0.90 * crownRight + 0.10 * crownLeft},${100 - crownBottom} `
crownPoints += `${0.10 * crownRight + 0.90 * crownLeft},${100 - crownBottom} `

const cursorHex = document.createElementNS(svgns, 'polygon')
cursorHex.setAttributeNS(null, 'points', hexPoints)
cursorSvg.appendChild(cursorHex)

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

scoreSvg1.setAttributeNS(null, 'viewBox', '-2 -2 4 4')
scoreSvg2.setAttributeNS(null, 'viewBox', '-2 -2 4 4')

const countText1 = document.createElementNS(svgns, 'text')
countText1.setAttributeNS(null, 'dominant-baseline', 'central')
countText1.setAttributeNS(null, 'text-anchor', 'middle')
countText1.innerHTML = '0'
countText1.style.font = '0.8px sans-serif'
countText1.style.fill = 'hsl(240, 100%, 50%)'
countText1.style.userSelect = 'none'
scoreSvg1.appendChild(countText1)

const countText2 = document.createElementNS(svgns, 'text')
countText2.setAttributeNS(null, 'dominant-baseline', 'central')
countText2.setAttributeNS(null, 'text-anchor', 'middle')
countText2.innerHTML = '0'
countText2.style.font = '0.8px sans-serif'
countText2.style.fill = 'hsl(0, 100%, 40%)'
countText2.style.userSelect = 'none'
scoreSvg2.appendChild(countText2)

const timerHex1 = document.createElementNS(svgns, 'polygon')
timerHex1.setAttributeNS(null, 'points', hexPoints)
timerHex1.style.stroke = 'hsl(240, 100%, 50%)'
timerHex1.style.strokeWidth = 0.1
timerHex1.style.fillOpacity = '0'
scoreSvg1.appendChild(timerHex1)

const timerHex2 = document.createElementNS(svgns, 'polygon')
timerHex2.setAttributeNS(null, 'points', hexPoints)
timerHex2.style.stroke = 'hsl(0, 100%, 40%)'
timerHex2.style.strokeWidth = 0.1
timerHex2.style.fillOpacity = '0'
scoreSvg2.appendChild(timerHex2)

const scoreCircle1 = document.createElementNS(svgns, 'circle')
scoreCircle1.setAttributeNS(null, 'cx', 0)
scoreCircle1.setAttributeNS(null, 'cy', 0)
scoreCircle1.setAttributeNS(null, 'r', 0.5 / Math.PI)
scoreCircle1.setAttributeNS(null, 'transform', 'scale(9,9)')
scoreCircle1.style.stroke = 'hsl(240, 100%, 50%)'
scoreCircle1.style.strokeDasharray = '0 1'
scoreCircle1.style.fillOpacity = '0'
scoreSvg1.appendChild(scoreCircle1)

const scoreCircle2 = document.createElementNS(svgns, 'circle')
scoreCircle2.setAttributeNS(null, 'cx', 0)
scoreCircle2.setAttributeNS(null, 'cy', 0)
scoreCircle2.setAttributeNS(null, 'r', 0.5 / Math.PI)
scoreCircle2.setAttributeNS(null, 'transform', 'scale(9,9)')
scoreCircle2.style.stroke = 'hsl(0, 100%, 40%)'
scoreCircle2.style.strokeDasharray = '0 1'
scoreCircle2.style.fillOpacity = '0'
scoreSvg2.appendChild(scoreCircle2)

import { io } from './socketIo/socket.io.esm.min.js'
import { range } from './math.js'

const countDiv1 = document.getElementById('countDiv1')
const countDiv2 = document.getElementById('countDiv2')
const svgns = 'http://www.w3.org/2000/svg'
const mapSvg = document.getElementById('mapSvg')
const upperMapDiv = document.getElementById('upperMapDiv')
const lowerMapDiv = document.getElementById('lowerMapDiv')
const crownSvg1 = document.getElementById('crownSvg1')
const crownSvg2 = document.getElementById('crownSvg2')
const scoreSvg1 = document.getElementById('scoreSvg1')
const scoreSvg2 = document.getElementById('scoreSvg2')
const timerSvg1 = document.getElementById('timerSvg1')
const timerSvg2 = document.getElementById('timerSvg2')

let nodes = []
let hexes = []
let teams = {}
let gameId = 0
let mapRadius = 1
let teamId = 0
let wait = 0
let targetId = -1
let targetHex = {}
let msgLog = {}
let gameOver = false

window.oncontextmenu = () => false
window.onmousedown = () => { console.log(msgLog) }

setInterval(updateServer, 50)

const socket = io()
socket.on('updateClient', (msg) => {
  msgLog = msg
  nodes = msg.nodes
  teamId = msg.teamId
  targetId = msg.targetId
  wait = msg.wait
  teams = msg.teams
  if (msg.gameId !== gameId) {
    mapRadius = msg.mapRadius
    gameId = msg.gameId
    setupMap()
  }
  if (teams[teamId] && hexes[targetId]) targetHex = hexes[targetId]
  countDiv1.innerHTML = teams[1].nodeCount
  countDiv2.innerHTML = teams[2].nodeCount
  circle1.style.strokeDasharray = `${teams[1].score} ${1 - teams[1].score}`
  circle2.style.strokeDasharray = `${teams[2].score} ${1 - teams[2].score}`
  circle1.style.strokeWidth = 0.07 + 0.23 * teams[1].victoryRatio
  circle2.style.strokeWidth = 0.07 + 0.23 * teams[2].victoryRatio
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

function drawOutline () {
  hexes.forEach(hex => {
    hex.style.strokeWidth = 0
  })
  if (targetHex.id && !gameOver) {
    const strokeWidth = 0.3
    targetHex.style.strokeDasharray = `${(1 - wait) * circumference} ${wait * circumference}`
    const color = outlineColors[teamId]
    targetHex.style.stroke = `hsla(${color.H}, ${color.S}%, ${color.L}%)`
    targetHex.style.strokeWidth = strokeWidth
  }
  const wait1 = teams[1].wait
  const wait2 = teams[2].wait
  console.log(wait1, wait2)
  timerHex1.style.strokeDasharray = `${(1 - wait1) * circumference} ${wait1 * circumference}`
  timerHex2.style.strokeDasharray = `${(1 - wait2) * circumference} ${wait2 * circumference}`
}

const outlineColors = {
  0: { H: 100, S: 100, L: 80 },
  1: { H: 220, S: 100, L: 50 },
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
scoreSvg1.setAttributeNS(null, 'viewBox', '-0.35 -0.35 0.7 0.7')
scoreSvg1.appendChild(circle1)

const circle2 = document.createElementNS(svgns, 'circle')
circle2.setAttributeNS(null, 'cx', 0)
circle2.setAttributeNS(null, 'cy', 0)
circle2.setAttributeNS(null, 'r', 0.5 / Math.PI)
circle2.style.stroke = 'hsl(0, 100%, 40%)'
circle2.style.strokeWidth = 0.07
circle2.style.strokeDasharray = '0 1'
circle2.style.strokeDashoffset = 0
scoreSvg2.setAttributeNS(null, 'viewBox', '-0.35 -0.35 0.7 0.7')
scoreSvg2.appendChild(circle2)

timerSvg1.setAttributeNS(null, 'viewBox', '-2 -2 4 4')
const timerHex1 = document.createElementNS(svgns, 'polygon')
// timerHex1.style.strokeDasharray = `0 ${circumference}`
timerHex1.setAttributeNS(null, 'points', hexPoints)
timerHex1.style.stroke = 'hsl(240, 100%, 50%)'
timerHex1.style.strokeWidth = 0.2
timerSvg1.appendChild(timerHex1)

timerSvg2.setAttributeNS(null, 'viewBox', '-2 -2 4 4')
const timerHex2 = document.createElementNS(svgns, 'polygon')
timerHex2.setAttributeNS(null, 'points', hexPoints)
// timerHex2.style.strokeDasharray = `0 ${circumference}`
timerHex2.style.stroke = 'hsl(0, 100%, 40%)'
timerHex2.style.strokeWidth = 0.2
timerSvg2.appendChild(timerHex2)

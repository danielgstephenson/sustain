import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { getLength, getDist, copyVector, mult, getDirection } from './vector.js'
import { collide } from './collision.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const config = fs.readJSONSync('config.json')
console.log(config)

const app = express()
const staticPath = path.join(__dirname, 'public')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)
const clientHtmlPath = path.join(__dirname, 'public', 'client.html')
app.get('/', function (req, res) { res.sendFile(clientHtmlPath) })
const socketIoPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')
app.get('/socketIo/:fileName', function (req, res) {
  const filePath = path.join(socketIoPath, req.params.fileName)
  res.sendFile(filePath)
})

function makeServer () {
  if (config.secure) {
    const key = fs.readFileSync('./srs-key.pem')
    const cert = fs.readFileSync('./srs-cert.pem')
    const credentials = { key, cert }
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

const server = makeServer()
const io = new Server(server)
io.path(staticPath)
server.listen(config.port, () => {
  console.log(`Listening on :${config.port}`)
  setInterval(tick, dt * 1000)
})

function range (n) { return [...Array(n).keys()] }

const dt = 0.01
const playerForce = 50
const playerTopSpeed = 30
const unitSpeed = 50
const wallThickness = 10
const mapSize = 100
const playerSize = 0.5
const nodeSize = 3
const nodeRange = 10
const growthInterval = 2
const deathInterval = 6
const buildInterval = 8
const gatherInterval = 0.5

const buildRate = 1 / buildInterval
const deathRate = 1 / deathInterval
const growthRate = 1 / growthInterval

const state = {
  time: 0,
  players: [],
  nodes: [],
  walls: [],
  units: []
}
const players = new Map()
const sockets = new Map()
const units = new Map()
const topWall = {
  position: { x: 0, y: -0.5 * mapSize - 0.5 * wallThickness },
  width: mapSize + 2 * wallThickness,
  height: wallThickness,
  id: state.walls.length,
  role: 'wall'
}
state.walls.push(topWall)
const bottomWall = {
  position: { x: 0, y: 0.5 * mapSize + 0.5 * wallThickness },
  width: mapSize + 2 * wallThickness,
  height: wallThickness,
  id: state.walls.length,
  role: 'wall'
}
state.walls.push(bottomWall)
const leftWall = {
  position: { x: -0.5 * mapSize - 0.5 * wallThickness, y: 0 },
  width: wallThickness,
  height: mapSize + 2 * wallThickness,
  id: state.walls.length,
  role: 'wall'
}
state.walls.push(leftWall)
const rightWall = {
  position: { x: 0.5 * mapSize + 0.5 * wallThickness, y: 0 },
  width: wallThickness,
  height: mapSize + 2 * wallThickness,
  id: state.walls.length,
  role: 'wall'
}
state.walls.push(rightWall)
range(100000).forEach(i => {
  const position = {
    x: (Math.random() - 0.5) * (mapSize - 4 * nodeSize),
    y: (Math.random() - 0.5) * (mapSize - 4 * nodeSize)
  }
  const nodeDistances = state.nodes.map(node => getDist(position, node.position))
  const minNodeDist = Math.min(...nodeDistances, Infinity)
  const edgeDistances = nodeDistances.map(dist => Math.abs(dist - 2 * nodeRange))
  const minEdgeDist = Math.min(...edgeDistances)
  if (minNodeDist > 1.5 * nodeRange && minEdgeDist > 0.2 * nodeRange) {
    const node = {
      position,
      id: state.nodes.length,
      size: nodeSize,
      radius: nodeSize,
      range: nodeRange,
      gatherTimer: Math.random() * gatherInterval,
      fill: 1,
      income: 0,
      team: 0,
      role: 'node'
    }
    state.nodes.push(node)
  }
})

function tick () {
  state.time += dt
  movePlayers()
  updateClients()
  collide(state)
  grow()
  gather()
}

function gather () {
  state.nodes.forEach(node => {
    node.gatherTimer -= dt
  })
  state.nodes.forEach(node => {
    if (node.gatherTimer < 0) node.gatherTimer = gatherInterval
  })
}

function harvest (fromNode, toNode, amount) {
  const maxId = Math.max(...units.keys())
  const direction = getDirection(fromNode, toNode)
  const unit = {
    position: copyVector(fromNode.position),
    id: maxId + 1,
    target: toNode,
    velocity: mult(direction, unitSpeed)
  }
  units.set(unit.id, unit)
}

function grow () {
  state.nodes.forEach(node => {
    if (node.team === 0) {
      node.fill = node.fill + growthRate * dt
    } else {
      node.fill = node.fill - deathRate * dt
    }
    if (node.fill < 0) node.team = 0
    node.fill = Math.max(0, Math.min(1, node.fill))
    node.radius = node.size * Math.sqrt(node.fill)
  })
  players.forEach(player => {
    player.fill = player.fill + buildRate * dt
    player.fill = Math.max(0, Math.min(1, player.fill))
  })
}

function movePlayers () {
  state.players.forEach(player => {
    if (player.controls) {
      const dx = player.controls.right - player.controls.left
      const dy = player.controls.down - player.controls.up
      const magnitude = Math.sqrt(dx * dx + dy * dy)
      player.force = { x: 0, y: 0 }
      if (magnitude > 0) {
        player.force.x = dx / magnitude
        player.force.y = dy / magnitude
      }
      player.velocity.x += player.force.x * dt * playerForce
      player.velocity.y += player.force.y * dt * playerForce
      const speed = getLength(player.velocity)
      if (speed > playerTopSpeed) {
        player.velocity.x = player.velocity.x * playerTopSpeed / speed
        player.velocity.y = player.velocity.y * playerTopSpeed / speed
      }
      player.position.x += player.velocity.x * dt
      player.position.y += player.velocity.y * dt
    }
  })
}

async function updateClients () {
  state.players = Array.from(players.values())
  state.units = Array.from(units.values())
  players.forEach(player => {
    const socket = sockets.get(player.id)
    const msg = { state, position: player.position }
    socket.emit('updateClient', msg)
  })
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  state.players = Array.from(players.values())
  const teamCount1 = state.players.filter(player => player.team === 1).length
  const teamCount2 = state.players.filter(player => player.team === 2).length
  const player = {
    id: socket.id,
    team: teamCount1 > teamCount2 ? 2 : 1,
    fill: 0,
    position: { x: 0, y: 0 },
    velocity: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
    force: { x: 0, y: 0 },
    radius: playerSize,
    role: 'player'
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  socket.on('updateServer', message => {
    player.controls = message.controls
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
  })
})

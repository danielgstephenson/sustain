import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { getLength, getDist } from './vector.js'
import { checkPlayerWall, checkPlayerNode, checkPlayerPlayer } from './collision.js'

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
  setInterval(tick, tickInterval)
})

function range (n) { return [...Array(n).keys()] }

const tickInterval = 10
const dt = tickInterval / 1000
const playerForce = 50
const playerTopSpeed = 30
const wallThickness = 10
const mapSize = 100
const playerSize = 0.5
const nodeSize = 1
const nodeRange = 10
const state = {
  time: 0,
  players: [],
  nodes: [],
  walls: []
}
const players = new Map()
const sockets = new Map()
const topWall = {
  position: { x: 0, y: -0.5 * mapSize - 0.5 * wallThickness },
  width: mapSize + 2 * wallThickness,
  height: wallThickness
}
const bottomWall = {
  position: { x: 0, y: 0.5 * mapSize + 0.5 * wallThickness },
  width: mapSize + 2 * wallThickness,
  height: wallThickness
}
const leftWall = {
  position: { x: -0.5 * mapSize - 0.5 * wallThickness, y: 0 },
  width: wallThickness,
  height: mapSize + 2 * wallThickness
}
const rightWall = {
  position: { x: 0.5 * mapSize + 0.5 * wallThickness, y: 0 },
  width: wallThickness,
  height: mapSize + 2 * wallThickness
}
state.walls.push(topWall, bottomWall, leftWall, rightWall)
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
      radius: nodeSize,
      range: nodeRange,
      team: 0
    }
    state.nodes.push(node)
  }
})

function tick () {
  state.time += dt
  movePlayers()
  updateClients()
  collide()
}

function collide () {
  players.forEach(player => {
    state.walls.forEach(wall => {
      checkPlayerWall(player, wall)
    })
    state.nodes.forEach(node => {
      checkPlayerNode(player, node)
    })
    players.forEach(other => {
      checkPlayerPlayer(player, other)
    })
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
    position: { x: 0, y: 0 },
    velocity: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
    force: { x: 0, y: 0 },
    radius: playerSize
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

import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { getLength, getDist, copyVector, getDirection, dot, norm, mult, sub } from './vector.js'
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
const drag = 2
const actorMovePower = 100
const unitSpeed = 40
const mapSize = 150
const actorSize = 1
const unitSize = 0.25
const nodeSize = 3
const nodeRange = 10
const growthInterval = 3
const deathInterval = 3
const buildInterval = 3
const gatherInterval = 0.01

const buildRate = 1 / buildInterval
const deathRate = 1 / deathInterval
const growthRate = 1 / growthInterval

const compass = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: Math.sqrt(0.5), y: Math.sqrt(0.5) },
  { x: -Math.sqrt(0.5), y: Math.sqrt(0.5) },
  { x: Math.sqrt(0.5), y: -Math.sqrt(0.5) },
  { x: -Math.sqrt(0.5), y: -Math.sqrt(0.5) }
]

const state = {
  time: 0,
  players: [],
  nodes: [],
  walls: [],
  units: [],
  attackers: []
}
const players = new Map()
const attackers = new Map()
const sockets = new Map()
const units = new Map()

setupWalls()
setupNodes()

function tick () {
  state.time += dt
  movePlayers()
  moveAttackers()
  moveUnits()
  collide(state)
  updateClients()
  grow()
  gather()
  attack()
}

function attack () {
  state.attackers.forEach(attacker => {
    const prey = attacker.prey
    const relativePosition = sub(prey.position, attacker.position)
    const distance = getLength(relativePosition)
    const preyFlee = dot(norm(prey.velocity), norm(relativePosition)) > -0.7
    const targetApproachSpeed = 5 + distance + 50 * !preyFlee
    const targetRelativeVelocity = mult(norm(relativePosition), targetApproachSpeed)
    const relativeVelocity = sub(attacker.velocity, prey.velocity)
    const targetForce = sub(targetRelativeVelocity, relativeVelocity)
    const best = { align: 0 }
    compass.forEach(compassDir => {
      const align = dot(compassDir, targetForce)
      if (align > best.align) {
        best.align = align
        attacker.force = norm(compassDir)
      }
    })
  })
}

function gather () {
  state.nodes.forEach(node => {
    node.gatherTimer -= dt
  })
  state.nodes.forEach(node => {
    if (node.gatherTimer < 0) {
      node.gatherTimer = gatherInterval
      const neighbors = node.neighborIds.map(id => state.nodes[id])
      const amount = 0.1
      neighbors.forEach(neighbor => {
        if (neighbor.team === 0 && node.team !== 0 && node.fill + node.income < neighbor.fill) {
          transfer(neighbor, node, amount)
        } else if (node.team === neighbor.team && node.fill + node.income < neighbor.fill) {
          transfer(neighbor, node, amount)
        }
      })
    }
  })
}

function transfer (fromNode, toNode, amount) {
  const maxId = Math.max(...units.keys(), 0)
  fromNode.fill -= amount
  toNode.income += amount
  const unit = {
    position: copyVector(fromNode.position),
    id: maxId + 1,
    targetId: toNode.id,
    fill: amount,
    radius: unitSize
  }
  units.set(unit.id, unit)
}

function grow () {
  state.nodes.forEach(node => {
    if (node.team === 0 && node.fill < 1) {
      node.fill += growthRate * dt
    } else {
      node.fill -= deathRate * dt
    }
    if (node.fill < 0.1) node.team = 0
    node.radius = node.size * Math.sqrt(node.fill)
  })
  players.forEach(player => {
    player.buildTimer += buildRate * dt
    player.buildTimer = Math.max(0, Math.min(1, player.buildTimer))
  })
}

function moveUnits () {
  state.units.forEach(unit => {
    const target = state.nodes[unit.targetId]
    const direction = getDirection(unit.position, target.position)
    unit.position.x += direction.x * unitSpeed * dt
    unit.position.y += direction.y * unitSpeed * dt
    const dist = getDist(unit.position, target.position)
    if (dist < unit.radius + target.radius) {
      target.fill += unit.fill
      target.income -= unit.fill
      units.delete(unit.id)
    }
  })
}

function movePlayers () {
  state.players.forEach(player => {
    if (player.controls) {
      const dx = player.controls.right - player.controls.left
      const dy = player.controls.down - player.controls.up
      player.force = norm({ x: dx, y: dy })
      moveActor(player)
    }
  })
}

function moveAttackers () {
  state.attackers.forEach(attacker => {
    if (attacker.freezeTimer <= 0) {
      moveActor(attacker)
    } else if (attacker.freezeTimer > 0) {
      attacker.freezeTimer -= dt
      attacker.freezeTimer = Math.max(0, attacker.freezeTimer)
    }
  })
}

function moveActor (actor) {
  actor.velocity.x += actor.force.x * dt * actorMovePower
  actor.velocity.y += actor.force.y * dt * actorMovePower
  actor.position.x += actor.velocity.x * dt
  actor.position.y += actor.velocity.y * dt
  actor.velocity = mult(actor.velocity, 1 - dt * drag)
}

function setupWalls () {
  const wallThickness = 10
  const wallPadding = 50
  const wallLength = mapSize + wallPadding
  const topWall = {
    position: { x: 0, y: -0.5 * wallLength },
    width: wallLength + wallThickness,
    height: wallThickness,
    id: state.walls.length,
    role: 'wall'
  }
  state.walls.push(topWall)
  const bottomWall = {
    position: { x: 0, y: 0.5 * wallLength },
    width: wallLength + wallThickness,
    height: wallThickness,
    id: state.walls.length,
    role: 'wall'
  }
  state.walls.push(bottomWall)
  const leftWall = {
    position: { x: -0.5 * wallLength, y: 0 },
    width: wallThickness,
    height: wallLength + wallThickness,
    id: state.walls.length,
    role: 'wall'
  }
  state.walls.push(leftWall)
  const rightWall = {
    position: { x: 0.5 * wallLength, y: 0 },
    width: wallThickness,
    height: wallLength + 0.5 * wallThickness,
    id: state.walls.length,
    role: 'wall'
  }
  state.walls.push(rightWall)
}

function setupNodes () {
  range(100000).forEach(i => {
    const position = {
      x: (Math.random() - 0.5) * (mapSize - 4 * nodeSize),
      y: (Math.random() - 0.5) * (mapSize - 4 * nodeSize)
    }
    const nodeDistances = state.nodes.map(node => getDist(position, node.position))
    const minNodeDist = Math.min(...nodeDistances, Infinity)
    const edgeDistances = nodeDistances.map(dist => Math.abs(dist - 2 * nodeRange))
    const minEdgeDist = Math.min(...edgeDistances)
    const centerDist = getLength(position)
    if (minNodeDist > 1.3 * nodeRange && minEdgeDist > 0.2 * nodeRange && centerDist > nodeRange) {
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
        role: 'node',
        neighborIds: []
      }
      state.nodes.push(node)
    }
  })
  range(state.nodes.length).forEach(i => {
    range(state.nodes.length).forEach(j => {
      if (i < j) {
        const a = state.nodes[i]
        const b = state.nodes[j]
        const dist = getDist(a.position, b.position)
        if (dist < 2 * nodeRange) {
          a.neighborIds.push(b.id)
          b.neighborIds.push(a.id)
        }
      }
    })
  })
}

async function updateClients () {
  state.players = Array.from(players.values())
  state.attackers = Array.from(attackers.values())
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
  const smallTeam = teamCount1 > teamCount2 ? 2 : 1
  const player = {
    id: socket.id,
    team: smallTeam,
    buildTimer: 0,
    position: { x: 0, y: 0 },
    velocity: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
    force: { x: 0, y: 0 },
    radius: actorSize,
    role: 'player'
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  const attacker = {
    id: socket.id,
    team: 3,
    position: { x: 0, y: 0 },
    velocity: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
    force: { x: 0, y: 0 },
    radius: actorSize,
    prey: player,
    freezeTimer: 0,
    role: 'attacker'
  }
  attackers.set(socket.id, attacker)
  socket.on('updateServer', message => {
    player.controls = message.controls
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
    attackers.delete(socket.id)
  })
})

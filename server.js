import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

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
    const key = fs.readFileSync('./sis-key.pem')
    const cert = fs.readFileSync('./sis-cert.pem')
    const credentials = { key, cert }
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

const updateInterval = 0.1

const server = makeServer()
const io = new Server(server)
io.path(staticPath)
server.listen(config.port, () => {
  console.log(`Listening on :${config.port}`)
  setInterval(update, updateInterval * 1000)
})

function range (n) { return [...Array(n).keys()] }
function sum (array) { return array.reduce((a, b) => a + b, 0) }
function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }

const N = 100
const buildIntervals = { 1: 3, 2: 3 }
let grid = []
let nodes = []
let neighbors = []

setupNodes()

let counts = { 1: 0, 2: 0 }
const scores = { 1: 0, 2: 0 }
const players = new Map()
const sockets = new Map()

function update () {
  if (counts[1] > 1 && counts[2] <= 1) {
    scores[1] += 1
    intialize()
  }
  if (counts[2] > 1 && counts[1] <= 1) {
    scores[2] += 1
    intialize()
  }
  nodes.forEach(node => {
    node.r = 0
    node.g = 0
    node.b = 0
  })
  nodes.forEach(node => {
    node.r = sum(neighbors[node.id].map(node => 1 * (node.state === 'r')))
    node.g = sum(neighbors[node.id].map(node => 1 * (node.state === 'g')))
    node.b = sum(neighbors[node.id].map(node => 1 * (node.state === 'b')))
  })
  counts = { 1: 0, 2: 0 }
  nodes.forEach(node => {
    const grow = [2]
    const sustain = [0, 3, 4, 5]
    switch (node.state) {
      case 'r':
        if (node.b > 0 || node.g > 0) node.state = 'd3'
        break
      case 'g':
        if (sustain.includes(node.g) && node.b === 0 && node.r === 0) node.state = 'g'
        else node.state = 'd4'
        break
      case 'b':
        if (sustain.includes(node.b) && node.g === 0 && node.r === 0) node.state = 'b'
        else node.state = 'd4'
        break
      case 'd5':
        node.state = 'd4'
        break
      case 'd4':
        node.state = 'd3'
        break
      case 'd3':
        node.state = 'd2'
        break
      case 'd2':
        node.state = 'd1'
        break
      case 'd1':
        node.state = 'd0'
        break
      case 'd0':
        node.state = 'e'
        break
      case 'e':
        if (grow.includes(node.b) && node.g <= 1) node.state = 'b'
        if (grow.includes(node.g) && node.b <= 1) node.state = 'g'
        break
    }
    if (node.state === 'b') counts[1] += 1
    if (node.state === 'g') counts[2] += 1
  })
  build()
  updateClients()
}

function build () {
  players.forEach(player => {
    const buildInterval = buildIntervals[player.team]
    player.buildTimer += updateInterval / buildInterval
    if (player.buildTimer > 1) {
      player.buildTimer = 0
      const i = player.mouse.y
      const j = player.mouse.x
      if (i >= 0 && i < N && j >= 0 && j < N) {
        const node = grid[i][j]
        const state = player.team === 1 ? 'b' : 'g'
        node.state = state
      }
    }
  })
}

function updateClients () {
  const states = nodes.map(node => node.state)
  const msg = { N, states }
  io.emit('updateClientState', msg)
}

function updateBuildIntervals () {
  const playerArray = Array.from(players.values())
  const teamCount1 = playerArray.filter(player => player.team === 1).length
  const teamCount2 = playerArray.filter(player => player.team === 2).length
  const minTeamCount = Math.min(teamCount1, teamCount2)
  console.log('teamCount1', teamCount1)
  console.log('teamCount2', teamCount2)
  if (Math.min(teamCount1, teamCount2) > 0) {
    buildIntervals[1] = 3 * teamCount1 / minTeamCount
    buildIntervals[2] = 3 * teamCount2 / minTeamCount
    console.log('buildIntervals', buildIntervals)
  }
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  const playerArray = Array.from(players.values())
  const teamCount1 = playerArray.filter(player => player.team === 1).length
  const teamCount2 = playerArray.filter(player => player.team === 2).length
  const smallTeam = teamCount1 > teamCount2 ? 2 : 1
  const player = {
    id: socket.id,
    team: smallTeam,
    role: 'player',
    mouse: { x: 0, y: 0 },
    buildTimer: 0
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  updateBuildIntervals()
  socket.on('updateServer', message => {
    player.mouse = message.mouse
    const buildTimer = player.buildTimer
    const buildInterval = buildIntervals[player.team]
    const reply = { team: player.team, mouse: player.mouse, scores, buildTimer, buildInterval }
    socket.emit('updateClient', reply)
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
    updateBuildIntervals()
  })
})

function intialize () {
  console.log('initialize')
  nodes.forEach(node => {
    node.state = 'e'
  })
  let redCount = 0
  const maxRed = 0.3 * N * N
  range(1000).forEach(() => {
    let i = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    let j = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    range(500).forEach(step => {
      if (Math.random() < 0.5) {
        i += Math.round(2 * Math.random() - 1)
        i = clamp(0, N - 1, i)
      } else {
        j += Math.round(2 * Math.random() - 1)
        j = clamp(0, N - 1, j)
      }
      const j1 = j
      const j2 = N - j1 - 1
      if (redCount < maxRed) {
        const node1 = grid[i][j1]
        const node2 = grid[i][j2]
        if (node1.state !== 'r' && node2.state !== 'r') {
          grid[i][j1].state = 'r'
          grid[i][j2].state = 'r'
          redCount += 2
        }
      }
    })
  })
  range(N).forEach(() => {
    const i = Math.floor(Math.random() * N)
    const jB = Math.floor(Math.random() * N)
    const jG = N - jB - 1
    if (jB !== jG) {
      grid[i][jB].state = 'b'
      grid[i][jG].state = 'g'
    }
  })
}

function setupNodes () {
  grid = range(N).map(i => range(N).map(j => {
    const node = {
      state: 'e',
      r: 0,
      g: 0,
      b: 0,
      x: j,
      y: i,
      selected: { 1: false, 2: false }
    }
    node.neighbors = []
    return node
  }))
  nodes = grid.flat()
  nodes.forEach((node, index) => {
    node.id = index
  })
  neighbors = nodes.map(node => [])
  range(N).forEach(i => range(N).forEach(j => {
    const id = grid[i][j].id
    const L = N - 1
    if (i < L) neighbors[id].push(grid[i + 1][j])
    if (i > 0) neighbors[id].push(grid[i - 1][j])
    if (j < L) neighbors[id].push(grid[i][j + 1])
    if (j > 0) neighbors[id].push(grid[i][j - 1])
    if (i < L && j < L) neighbors[id].push(grid[i + 1][j + 1])
    if (i < L && j > 0) neighbors[id].push(grid[i + 1][j - 1])
    if (i > 0 && j < L) neighbors[id].push(grid[i - 1][j + 1])
    if (i > 0 && j > 0) neighbors[id].push(grid[i - 1][j - 1])
  }))
  intialize()
}

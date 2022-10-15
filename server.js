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

const tickInterval = 0.1

const server = makeServer()
const io = new Server(server)
io.path(staticPath)
server.listen(config.port, () => {
  console.log(`Listening on :${config.port}`)
  setInterval(update, tickInterval * 1000)
})

function range (n) { return [...Array(n).keys()] }
function sum (array) { return array.reduce((a, b) => a + b, 0) }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }

const N = 50
const state = {
  time: 0,
  buildInterval: 3,
  buildTimer: 0,
  grid: [],
  nodes: [],
  scores: { 1: 0, 2: 0 },
  counts: { 1: 0, 2: 0 }
}
const players = new Map()
const sockets = new Map()

state.grid = range(N).map(i => range(N).map(j => {
  const node = {
    state: 'empty',
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
state.nodes = state.grid.flat()
state.nodes.forEach((node, index) => {
  node.id = index
})
const neighbors = state.nodes.map(node => [])
range(N).forEach(i => range(N).forEach(j => {
  const id = state.grid[i][j].id
  const L = N - 1
  if (i < L) neighbors[id].push(state.grid[i + 1][j])
  if (i > 0) neighbors[id].push(state.grid[i - 1][j])
  if (j < L) neighbors[id].push(state.grid[i][j + 1])
  if (j > 0) neighbors[id].push(state.grid[i][j - 1])
  if (i < L && j < L) neighbors[id].push(state.grid[i + 1][j + 1])
  if (i < L && j > 0) neighbors[id].push(state.grid[i + 1][j - 1])
  if (i > 0 && j < L) neighbors[id].push(state.grid[i - 1][j + 1])
  if (i > 0 && j > 0) neighbors[id].push(state.grid[i - 1][j - 1])
}))
intialize()

function update () {
  if (state.counts[1] > 1 && state.counts[2] <= 1) {
    state.scores[1] += 1
    intialize()
  }
  if (state.counts[2] > 1 && state.counts[1] <= 1) {
    state.scores[2] += 1
    intialize()
  }
  state.time += tickInterval
  state.buildTimer = Math.max(0, state.buildTimer + tickInterval)
  state.nodes.forEach(node => {
    node.r = 0
    node.g = 0
    node.b = 0
  })
  state.nodes.forEach(node => {
    node.r = sum(neighbors[node.id].map(node => 1 * (node.state === 'red')))
    node.g = sum(neighbors[node.id].map(node => 1 * (node.state === 'green')))
    node.b = sum(neighbors[node.id].map(node => 1 * (node.state === 'blue')))
  })
  state.counts = { 1: 0, 2: 0 }
  state.nodes.forEach(node => {
    const grow = [2]
    const sustain = [0, 3, 4, 5]
    switch (node.state) {
      case 'green':
        if (sustain.includes(node.g) && node.b === 0) node.state = 'green'
        else node.state = 'dead3'
        break
      case 'blue':
        if (sustain.includes(node.b) && node.g === 0) node.state = 'blue'
        else node.state = 'dead3'
        break
      case 'dead3':
        node.state = 'dead2'
        break
      case 'dead2':
        node.state = 'dead1'
        break
      case 'dead1':
        node.state = 'dead0'
        break
      case 'dead0':
        node.state = 'empty'
        break
      case 'empty':
        if (grow.includes(node.b) && node.g <= 1) node.state = 'blue'
        if (grow.includes(node.g) && node.b <= 1) node.state = 'green'
        break
    }
    if (node.state === 'blue') state.counts[1] += 1
    if (node.state === 'green') state.counts[2] += 1
  })
  build()
  updateClients()
}

function build () {
  if (state.buildTimer >= state.buildInterval) {
    state.buildTimer = 0
    state.nodes.forEach(node => {
      node.selected = { 1: false, 2: false }
    })
    players.forEach(player => {
      const i = player.mouse.y
      const j = player.mouse.x
      if (i >= 0 && i < N && j >= 0 && j < N) {
        const node = state.grid[i][j]
        if (node) node.selected[player.team] = true
      }
    })
    state.nodes.forEach(node => {
      if (node.selected[1] && !node.selected[2]) {
        node.state = 'blue'
      } else if (node.selected[2] && !node.selected[1]) {
        node.state = 'green'
      } else if (node.selected[1] && node.selected[2]) {
        node.state = 'red'
      }
    })
  }
}

async function updateClients () {
  state.players = Array.from(players.values())
  players.forEach(player => {
    const socket = sockets.get(player.id)
    const msg = { state, team: player.team }
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
    role: 'player',
    mouse: { x: 0, y: 0 }
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  socket.on('updateServer', message => {
    player.mouse = message.mouse
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
  })
})

function intialize () {
  state.nodes.forEach(node => {
    node.state = 'empty'
  })
  range(N).forEach(() => {
    const i = Math.floor(Math.random() * N)
    const jb = Math.floor(Math.random() * N)
    const jg = N - jb - 1
    if (jb !== jg) {
      state.grid[i][jb].state = 'blue'
      state.grid[i][jg].state = 'green'
    }
  })
  state.time = 0
  state.buildTimer = 0
}

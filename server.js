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
const buildInterval = 3
let buildTimer = 0
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
  buildTimer = Math.max(0, buildTimer + updateInterval)
  nodes.forEach(node => {
    node.r = 0
    node.g = 0
    node.b = 0
  })
  nodes.forEach(node => {
    node.r = sum(neighbors[node.id].map(node => 1 * (node.state === 'red')))
    node.g = sum(neighbors[node.id].map(node => 1 * (node.state === 'green')))
    node.b = sum(neighbors[node.id].map(node => 1 * (node.state === 'blue')))
  })
  counts = { 1: 0, 2: 0 }
  nodes.forEach(node => {
    const grow = [2]
    const sustain = [0, 3, 4, 5]
    switch (node.state) {
      case 'red':
        if (node.b > 0 || node.g > 0) node.state = 'dead3'
        break
      case 'green':
        if (sustain.includes(node.g) && node.b === 0 && node.r === 0) node.state = 'green'
        else node.state = 'dead4'
        break
      case 'blue':
        if (sustain.includes(node.b) && node.g === 0 && node.r === 0) node.state = 'blue'
        else node.state = 'dead4'
        break
      case 'dead5':
        node.state = 'dead4'
        break
      case 'dead4':
        node.state = 'dead3'
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
    if (node.state === 'blue') counts[1] += 1
    if (node.state === 'green') counts[2] += 1
  })
  build()
  updateClients()
}

function build () {
  if (buildTimer >= buildInterval) {
    buildTimer = 0
    nodes.forEach(node => {
      node.selected = { 1: false, 2: false }
    })
    players.forEach(player => {
      const i = player.mouse.y
      const j = player.mouse.x
      if (i >= 0 && i < N && j >= 0 && j < N) {
        const node = grid[i][j]
        if (node) node.selected[player.team] = true
      }
    })
    nodes.forEach(node => {
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

function updateClients () {
  const states = nodes.map(node => node.state)
  const msg = { N, states }
  io.emit('updateClientState', msg)
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
    mouse: { x: 0, y: 0 }
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  socket.on('updateServer', message => {
    player.mouse = message.mouse
    const reply = { team: player.team, mouse: player.mouse, scores, buildTimer, buildInterval }
    socket.emit('updateClient', reply)
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
  })
})

function intialize () {
  console.log('initialize')
  nodes.forEach(node => {
    node.state = 'empty'
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
        if (node1.state !== 'red' && node2.state !== 'red') {
          grid[i][j1].state = 'red'
          grid[i][j2].state = 'red'
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
      grid[i][jB].state = 'blue'
      grid[i][jG].state = 'green'
    }
  })
  buildTimer = 0
}

function setupNodes () {
  grid = range(N).map(i => range(N).map(j => {
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

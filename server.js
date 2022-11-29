import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configPath = path.join(__dirname, 'config.json')
const fileExists = fs.existsSync(configPath)
const config = fileExists ? fs.readJSONSync(configPath) : {}
if (!fileExists) {
  config.port = process.env.PORT ?? 3000
  config.secure = false
}
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

const players = new Map()
const sockets = new Map()
const N = 80
const baseBuildInterval = 2
const buildIntervals = { 1: baseBuildInterval, 2: baseBuildInterval, 3: baseBuildInterval }
const maxPinkStart = 0.05 * N * N
const maxRedStart = 0.1 * N * N
const pinkCursor = { x: 0, y: 0 }
const pinkBuildPoint = { x: 0, y: 0 }
const redBuildFactor = 100
let step = 0
let pinkBuildTimer = 0
let pinkBuildStep = 0
let level = 1
let grid = []
let nodes = []
let neighbors = []
let gameOver = false
let levelComplete = false
let counts = { 1: 0, 2: 0, 3: 0 }
const idle = { 1: true, 2: true }
setupNodes()

function update () {
  step += 1
  if (!gameOver) {
    grow()
    build()
    if (Math.min(counts[1] + idle[1], counts[2] + idle[2]) <= 0) {
      gameOver = true
      levelComplete = false
    }
    if (counts[3] <= 10) {
      gameOver = true
      console.log('old level', level)
      level += 1
      console.log('new level', level)
      levelComplete = true
    }
  }
  updateClients()
}

function grow () {
  nodes.forEach(node => {
    node.p = 0
    node.g = 0
    node.b = 0
    node.r = 0
  })
  nodes.forEach(node => {
    node.p = sum(neighbors[node.id].map(node => 1 * (node.state === 'p')))
    node.g = sum(neighbors[node.id].map(node => 1 * (node.state === 'g')))
    node.b = sum(neighbors[node.id].map(node => 1 * (node.state === 'b')))
    node.r = sum(neighbors[node.id].map(node => 1 * (node.state === 'r')))
  })
  counts = { 1: 0, 2: 0, 3: 0 }
  nodes.forEach(node => {
    const sustain = [0, 3, 4, 5]
    switch (node.state) {
      case 'r':
        if (node.b === 0 && node.g === 0 && node.p === 0) node.state = 'r'
        else node.state = 'd4'
        break
      case 'p':
        if (sustain.includes(node.p) && node.b === 0 && node.g === 0) node.state = 'p'
        else node.state = 'd4'
        break
      case 'g':
        if (sustain.includes(node.g) && node.b === 0 && node.p === 0) node.state = 'g'
        else node.state = 'd4'
        break
      case 'b':
        if (sustain.includes(node.b) && node.g === 0 && node.p === 0) node.state = 'b'
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
        if (node.r === 3 && node.b === 0 && node.g === 0 && node.p === 0 && step % redBuildFactor === 0) node.state = 'r'
        if (node.p === 2 && node.b === 0 && node.g === 0 && node.r === 0) node.state = 'p'
        if (node.b === 2 && node.g === 0 && node.r === 0 && node.p === 0) node.state = 'b'
        if (node.g === 2 && node.b === 0 && node.r === 0 && node.p === 0) node.state = 'g'
        break
    }
    if (node.state === 'b') counts[1] += 1
    if (node.state === 'g') counts[2] += 1
    if (node.state === 'p') counts[3] += 1
  })
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
        if (node.state !== state && node.state !== 'p') {
          node.state = state
          idle[player.team] = false
          counts[player.team] += 1
        }
      }
    }
  })
  const buildInterval = buildIntervals[3]
  pinkBuildTimer += updateInterval / buildInterval
  const endReached = nodes.every(node => {
    const pastOnRow = node.y === pinkCursor.y && node.x > pinkCursor.x
    const belowRow = node.y > pinkCursor.y
    const pastCursor = pastOnRow || belowRow
    if (node.state === 'p' && pastCursor) {
      let offset = pinkBuildStep % 5 === 0 ? 2 : 1
      if (pinkBuildStep % 2 === 0) {
        if (pinkBuildStep % 4 === 0) offset = -offset
        pinkCursor.x = node.x + offset
        pinkCursor.y = node.y
      }
      if (pinkBuildStep % 2 !== 0) {
        if (pinkBuildStep + 1 % 4 === 0) offset = -offset
        pinkCursor.x = node.x
        pinkCursor.y = node.y + offset
      }
      pinkCursor.x = clamp(0, N - 1, pinkCursor.x)
      pinkCursor.y = clamp(0, N - 1, pinkCursor.y)
      return false
    }
    return true
  })
  if (endReached) {
    pinkCursor.x = 0
    pinkCursor.y = 0
  }
  if (pinkBuildTimer > 1) {
    pinkBuildTimer = 0
    const i = pinkCursor.y
    const j = pinkCursor.x
    const node = grid[i][j]
    if (node.state !== 'b' && node.state !== 'g') {
      node.state = 'p'
      pinkBuildStep += 1
      counts[3] += 1
      pinkBuildPoint.x = pinkCursor.x
      pinkBuildPoint.y = pinkCursor.y
    }
  }
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
  const maxTeamCount = Math.max(teamCount1, teamCount2)
  if (minTeamCount > 0) {
    buildIntervals[1] = baseBuildInterval * teamCount1 / minTeamCount
    buildIntervals[2] = baseBuildInterval * teamCount2 / minTeamCount
  }
  if (maxTeamCount > 0) {
    buildIntervals[3] = baseBuildInterval / (maxTeamCount * 1.5 ** level)
    console.log('level', level)
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
    const otherTeam = player.team === 1 ? 2 : 1
    const win = gameOver && counts[player.team] >= counts[otherTeam]
    const reply = {
      team: player.team,
      mouse: player.mouse,
      counts,
      buildTimer,
      buildInterval,
      gameOver,
      levelComplete,
      win,
      level,
      pinkBuildPoint,
      buildIntervals
    }
    socket.emit('updateClient', reply)
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
    updateBuildIntervals()
  })
  socket.on('initialize', () => {
    if (gameOver) {
      intialize()
    }
  })
})

function intialize () {
  step = 0
  console.log('initialize')
  updateBuildIntervals()
  idle[1] = true
  idle[2] = true
  levelComplete = false
  gameOver = false
  nodes.forEach(node => {
    node.state = 'e'
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
  let pinkCount = 0
  range(1000).forEach(() => {
    let i = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    let j = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    range(200).forEach(step => {
      if (Math.random() < 0.5) {
        i += Math.round(2 * Math.random() - 1)
        i = clamp(0, N - 1, i)
      } else {
        j += Math.round(2 * Math.random() - 1)
        j = clamp(0, N - 1, j)
      }
      const j1 = j
      const j2 = N - j1 - 1
      if (pinkCount < maxPinkStart) {
        const node1 = grid[i][j1]
        const node2 = grid[i][j2]
        if (node1.state !== 'p' && node2.state !== 'p') {
          grid[i][j1].state = 'p'
          grid[i][j2].state = 'p'
          pinkCount += 2
        }
      }
    })
  })
  let redCount = 0
  range(1000).forEach(() => {
    let i = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    let j = Math.floor(0.5 * N + 0.9 * (0.5 - Math.random()) * N)
    range(200).forEach(step => {
      if (Math.random() < 0.5) {
        i += Math.round(2 * Math.random() - 1)
        i = clamp(0, N - 1, i)
      } else {
        j += Math.round(2 * Math.random() - 1)
        j = clamp(0, N - 1, j)
      }
      const j1 = j
      const j2 = N - j1 - 1
      if (redCount < maxRedStart) {
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
}

function setupNodes () {
  grid = range(N).map(i => range(N).map(j => {
    const node = {
      state: 'e',
      p: 0,
      g: 0,
      b: 0,
      r: 0,
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

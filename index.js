import { makeIo } from './server.js'
import { choose, clamp, range } from './public/math.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs-extra'

const players = new Map()
const sockets = new Map()
let ai = false

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configPath = path.join(__dirname, 'config.json')
const fileExists = fs.existsSync(configPath)
const config = fileExists ? fs.readJSONSync(configPath) : {}
if (fileExists) {
  if (config.ai) ai = config.ai
}

const mapRadius = 10
const restartTime = 5
const dt = 0.04
const winRate = 0.0005
const cycleLength = 300
const lifeLength = 400
const deathLength = 400
const waitLength = 400

let gameId = Math.random()
let nodes = []
let teams = {}

const io = makeIo(() => {
  setInterval(update, dt * 1000)
  restart()
})

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  sockets.set(socket.id, socket)
  const player = makePlayer(socket.id)
  socket.on('clientUpdateServer', message => {
    const team = teams[player.teamId]
    const reply = {
      teamId: player.teamId,
      targetId: team.targetId,
      wait: team.wait,
      gameId,
      mapRadius,
      nodes,
      teams
    }
    socket.emit('updateClient', reply)
  })
  socket.on('target', message => {
    teams[player.teamId].targetId = message.targetId
  })
  socket.on('disconnect', () => {
    const team = teams[player.teamId]
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
    team.playerCount -= 1
  })
})

function update () {
  Object.values(teams).forEach(team => {
    if (team.score === 1) {
      team.victoryTime += dt
      team.victoryRatio = team.victoryTime / restartTime
    }
    if (team.victoryTime > restartTime) {
      restart()
    }
  })
  if (Math.max(teams[1].score, teams[2].score) >= 1) return
  if (ai && teams[2].wait === 0) {
    const nodes0 = nodes.filter(node => node.align === 0)
    const node = choose(nodes0)
    teams[2].targetId = node.id
    activate(2)
  }
  Object.values(teams).forEach(team => {
    if (team.wait === 0) {
      activate(team.id)
    }
  })
  Object.values(teams).forEach(team => {
    team.step = clamp(0, waitLength, team.step + 1)
    team.wait = 1 - team.step / waitLength
    team.nodeCount = nodes.filter(node => node.align === team.id).length
  })
  Object.values(teams).forEach(team => {
    const otherTeam = team.id === 1 ? teams[2] : teams[1]
    if (team.nodeCount > otherTeam.nodeCount) {
      team.score = clamp(0, 1, team.score + winRate)
      otherTeam.score = clamp(0, 1, otherTeam.score - winRate)
    }
  })
  nodes.forEach(node => {
    if (node.align === 0) {
      node.step = (node.step + 1) % (cycleLength + 1)
    } else {
      node.step += 1
    }
  })
  nodes.forEach(node => {
    node.invasion = { 1: 0, 2: 0 }
  })
  nodes.forEach(node => {
    if (node.align === 0) {
      const neighbors = node.neighbors.map(i => nodes[i])
      node.invasion[1] = neighbors.filter(neighbor => neighbor.align === 1).length
      node.invasion[2] = neighbors.filter(neighbor => neighbor.align === 2).length
    }
  })
  nodes.forEach(node => {
    if (node.align === 0 && node.step === 0) {
      if (node.invasion[1] > node.invasion[2]) {
        node.align = 1
        node.step = 0
      }
      if (node.invasion[2] > node.invasion[1]) {
        node.align = 2
        node.step = 0
      }
      if (node.invasion[1] === node.invasion[2] && node.invasion[1] > 0) {
        node.align = 3
        node.step = 0
      }
    }
    if ([1, 2].includes(node.align) && node.step > lifeLength) {
      node.align = 3
      node.step = 0
    }
    if (node.align === 3 && node.step > deathLength) {
      node.align = 0
      node.step = 1
    }
  })
  nodes.forEach(node => {
    node.color = getColor(node.align, node.step)
  })
}

function activate (teamId) {
  const team = teams[teamId]
  const otherTeam = teams[3 - teamId]
  if (team.wait === 0) {
    const node = nodes[team.targetId]
    if (node && node.align === 0) {
      team.step = 0
      team.wait = 1
      node.step = 0
      if (otherTeam.wait === 0 && otherTeam.targetId === team.targetId) {
        otherTeam.step = 0
        otherTeam.wait = 1
        node.align = 3
      } else {
        node.align = teamId
      }
    }
  }
}

function makePlayer (socketId) {
  const smallTeamId = teams[1].playerCount > teams[2].playerCount ? 2 : 1
  const player = {
    id: socketId,
    teamId: smallTeamId,
    step: waitLength,
    wait: 0
  }
  players.set(socketId, player)
  teams[player.teamId].playerCount += 1
  return player
}

function restart () {
  gameId = Math.random()
  createTeams()
  createNodes()
}

function createTeams () {
  teams = {
    1: {
      id: 1,
      step: 0,
      wait: 1,
      nodeCount: 0,
      score: 0,
      playerCount: 0,
      victoryTime: 0,
      victoryRatio: 0,
      targetId: -1
    },
    2: {
      id: 2,
      step: 0,
      wait: 1,
      nodeCount: 0,
      score: 0,
      playerCount: 0,
      victoryTime: 0,
      victoryRatio: 0,
      targetId: -1
    }
  }
}

function createNodes () {
  nodes = []
  const nodeMap = []
  const length = 1 + 2 * mapRadius
  range(length).forEach(i => {
    nodeMap[i] = []
    const q = i - mapRadius
    range(length).forEach(j => {
      const r = j - mapRadius
      const s = 0 - q - r
      const inRange = -mapRadius <= s && s <= mapRadius
      const openProb = 0.6
      const open = Math.random() < openProb && (q !== 0 | r !== 0)
      if (inRange && open) {
        const node = createNode(q, r, s, nodes.length)
        nodes.push(node)
        nodeMap[i][j] = node
      }
    })
  })
  range(length).forEach(i => {
    range(length).forEach(j => {
      const node = nodeMap[i][j]
      if (node) {
        const neighbors = []
        if (nodeMap[i + 1]) neighbors.push(nodeMap[i + 1][j])
        neighbors.push(nodeMap[i][j + 1])
        if (nodeMap[i - 1]) neighbors.push(nodeMap[i - 1][j + 1])
        if (nodeMap[i - 1]) neighbors.push(nodeMap[i - 1][j])
        neighbors.push(nodeMap[i][j - 1])
        if (nodeMap[i + 1]) neighbors.push(nodeMap[i + 1][j - 1])
        neighbors.forEach(neighbor => {
          if (neighbor) node.neighbors.push(neighbor.id)
        })
      }
    })
  })
  return nodes
}

function createNode (q, r, s, id) {
  const node = {
    align: 0,
    q,
    r,
    id,
    x: q * Q.x + r * R.x + s * S.x,
    y: q * Q.y + r * R.y + s * S.y,
    neighbors: []
  }
  node.step = choose(range(cycleLength))
  node.color = getColor(node.align, node.step)
  node.invasion = {
    1: 0,
    2: 0
  }
  return node
}

function getColor (align, step) {
  if (align === 0) {
    const ratio = step / cycleLength
    const H = 100
    const V = 10 + 40 * ratio
    return `hsl(${H} 100% ${V}%)`
  } else if (align === 1) {
    const H = 220
    const W = 0
    const B = 60 * step / lifeLength
    return `hwb(${H} ${W}% ${B}%)`
  } else if (align === 2) {
    const H = 0
    const W = 0
    const B = 60 * step / lifeLength
    return `hwb(${H} ${W}% ${B}%)`
  } else if (align === 3) {
    const w0 = 10
    const w1 = 50
    const alpha = step / deathLength
    const H = 40
    const W = (w1 * alpha + w0 * (1 - alpha))
    const B = 100 - W
    return `hwb(${H} ${W}% ${B}%)`
  } else {
    throw new Error(`align=${align} out of range in getColor`)
  }
}

const Q = {
  x: 1,
  y: 0
}
const R = {
  x: -0.5,
  y: Math.sqrt(3 / 4)
}
const S = {
  x: -0.5,
  y: -Math.sqrt(3 / 4)
}

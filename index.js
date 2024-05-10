import { makeIo } from './server.js'
import { choose, clamp, range } from './public/math.js'

const players = new Map()
const sockets = new Map()
const AI = true

const mapRadius = 10
const dt = 1 / 60
const winRate = 0.0003
const restartTime = 5
const cycleLength = 100
const lifeLength = 100
const deathLength = 100
const waitLength = 400

let aging = true

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
      team: player.teamId,
      wait: team.wait,
      gameId,
      mapRadius,
      nodes,
      teams
    }
    socket.emit('updateClient', reply)
  })
  socket.on('activate', message => {
    activate(player.teamId, message.id)
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
  if (AI && teams[2].wait === 0) {
    const nodes0 = nodes.filter(node => node.align === 0)
    const node = choose(nodes0)
    activate(2, node.id)
  }
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
  aging = !aging
  if (aging) {
    nodes.forEach(node => {
      if (node.align === 0) {
        node.step = (node.step + 1) % (cycleLength + 1)
      } else {
        node.step += 1
      }
    })
  } else {
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
        node.step = Math.ceil(0.6 * cycleLength)
      }
    })
  }
  nodes.forEach(node => {
    node.color = getColor(node.align, node.step)
  })
}

function activate (teamId, nodeId) {
  const team = teams[teamId]
  if (team.wait === 0) {
    const node = nodes[nodeId]
    if (node.align === 0) {
      node.align = teamId
      node.step = 0
      team.step = 0
      team.wait = 1
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
      step: waitLength,
      wait: 0,
      nodeCount: 0,
      score: 0,
      playerCount: 0,
      victoryTime: 0,
      victoryRatio: 0
    },
    2: {
      id: 2,
      step: waitLength,
      wait: 0,
      nodeCount: 0,
      score: 0,
      playerCount: 0,
      victoryTime: 0,
      victoryRatio: 0
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
      const openProb = 0.5 + 0.3 * Math.random()
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
    const turn = (step / cycleLength + 5 / 8) % 1
    const angle = turn * 2 * Math.PI
    const radius = 22
    const center = 22
    const H = 80
    const W = center + radius * Math.cos(angle)
    const B = center + radius * Math.sin(angle)
    return `hwb(${H} ${W}% ${B}%)`
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
    const w0 = 5
    const w1 = 30
    const alpha = step / deathLength
    const H = 40
    const W = (w1 * alpha + w0 * (1 - alpha))
    const B = 90 - W
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

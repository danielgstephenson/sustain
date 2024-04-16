import { makeIo } from './server.js'
import { shuffle, range, choose } from './public/math.js'

const serverId = Math.random()
const players = new Map()
const sockets = new Map()
const mapRadius = 7
const timeStep = 1
const cycleLength = 6

let time = 0
let oldNodes = {}

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

const io = makeIo(() => {
  setInterval(update, timeStep * 1000)
})

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  sockets.set(socket.id, socket)
  const player = makePlayer(socket.id)
  socket.on('clientUpdateServer', message => {
    const reply = {
      team: player.team,
      wait: player.wait,
      serverId,
      mapRadius,
      nodes
    }
    socket.emit('updateClient', reply)
  })
  socket.on('activate', message => {
    activate(player, message.id)
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
  })
})

const nodes = makeNodes()

function update () {
  time = (time + 1) % cycleLength
  nodes.forEach(node => {
    node.time = (time + node.startTime) % cycleLength
    node.life = (node.time + 1) / cycleLength
  })
  oldNodes = JSON.parse(JSON.stringify(nodes))
  nodes.forEach(node => {
    if ([1, 2].includes(node.align)) feed(node)
  })
  nodes.forEach(node => {
    if (node.time === 0) grow(node)
  })
  players.forEach(player => {
    player.time = Math.min(cycleLength, player.time + 1)
    player.wait = 1 - player.time / cycleLength
  })
}

function feed (node) {
  const neighbors = node.neighbors.map(i => oldNodes[i])
  const neighbors0 = neighbors.filter(neighbor => neighbor.align === 0)
  const n0 = neighbors0.length
  if (n0 < 2) node.align = 3
}

function grow (node) {
  const neighbors = node.neighbors.map(i => oldNodes[i])
  const neighbors1 = neighbors.filter(neighbor => neighbor.align === 1)
  const neighbors2 = neighbors.filter(neighbor => neighbor.align === 2)
  const n1 = neighbors1.length
  const n2 = neighbors2.length
  if (node.align === 3) {
    node.align = 0
  } else if (node.align === 0) {
    if (n1 > n2) {
      node.align = 1
    }
    if (n2 > n1) {
      node.align = 2
    }
  }
}

function activate (player, id) {
  if (player.wait === 0) {
    const node = nodes[id]
    if (node.align === player.team) {
      node.align = 0
      player.time = 0
      player.wait = 1
    } else if ([0, 3].includes(node.align)) {
      node.align = player.team
      player.time = 0
      player.wait = 1
    }
  }
}

function makePlayer (id) {
  const playerArray = Array.from(players.values())
  const teamCount1 = playerArray.filter(player => player.team === 1).length
  const teamCount2 = playerArray.filter(player => player.team === 2).length
  const smallTeam = teamCount1 > teamCount2 ? 2 : 1
  const player = {
    id,
    team: smallTeam,
    time: cycleLength,
    wait: 0
  }
  players.set(id, player)
  return player
}

function makeNodes () {
  const nodes = []
  const nodeMap = []
  const length = 1 + 2 * mapRadius
  range(length).forEach(i => {
    nodeMap[i] = []
    const q = i - mapRadius
    range(length).forEach(j => {
      const r = j - mapRadius
      const s = 0 - q - r
      const inRange = -mapRadius <= s && s <= mapRadius
      const open = Math.random() < 0.75 && (q !== 0 | r !== 0)
      if (inRange && open) {
        const node = makeNode(q, r, s, nodes.length)
        nodes.push(node)
        nodeMap[i][j] = node
      }
    })
  })
  range(length).forEach(i => {
    range(length).forEach(j => {
      const node = nodeMap[i][j]
      if (node) {
        const neighbors = [
          nodeMap[i][j + 1],
          nodeMap[i][j - 1]
        ]
        if (nodeMap[i + 1]) {
          neighbors.push(...[
            nodeMap[i + 1][j],
            nodeMap[i + 1][j - 1]
          ])
        }
        if (nodeMap[i - 1]) {
          neighbors.push(...[
            nodeMap[i - 1][j],
            nodeMap[i - 1][j + 1]
          ])
        }
        neighbors.forEach(neighbor => {
          if (neighbor) node.neighbors.push(neighbor.index)
        })
      }
    })
  })
  const timeSpread = Math.max(1, Math.floor(cycleLength / nodes.length))
  const startTimes = shuffle(range(nodes.length)).map(i => (i * timeSpread) % cycleLength)
  nodes.forEach((node, id) => {
    node.id = id
    node.time = startTimes[id]
    node.startTime = choose(range(cycleLength))
  })
  return nodes
}

function makeNode (q, r, s, index) {
  const node = {
    align: 0,
    q,
    r,
    index,
    x: q * Q.x + r * R.x + s * S.x,
    y: q * Q.y + r * R.y + s * S.y,
    life: Math.random(),
    neighbors: []
  }
  return node
}

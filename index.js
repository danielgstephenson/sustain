import { makeIo } from './server.js'
import { shuffle, range } from './public/math.js'

const serverId = Math.random()
const players = new Map()
const sockets = new Map()
const updateInterval = 0.1
const mapRadius = 5
const timeStep = 0.2

let time = 0
let halfCycleLength = 0
let cycleLength = 0

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
  setInterval(update, updateInterval * 1000)
})

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
    wait: 0
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
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

function activate (player, id) {
  if (player.wait === 0) {
    const node = nodes[id]
    if (node.align === player.team) {
      node.align = 0
      player.wait = 1
    } else if (node.align === 0) {
      node.align = player.team
      player.wait = 1
    }
  }
}

const nodes = makeNodes()

function update () {
  time = (time + 1) % cycleLength
  nodes.forEach(node => {
    node.time = (time + node.startTime) % cycleLength
    node.life = 0.5 * Math.cos(Math.PI * node.time / halfCycleLength) + 0.5
    if (node.time === 0) change(node)
  })
  players.forEach(player => {
    player.wait = Math.max(0, player.wait - timeStep / 20)
  })
}

function change (node) {
  const neighbors = node.neighbors.map(i => nodes[i])
  const n0 = neighbors.filter(neighbor => neighbor.align === 0).length
  const n1 = neighbors.filter(neighbor => neighbor.align === 1).length
  const n2 = neighbors.filter(neighbor => neighbor.align === 2).length
  if (node.align === 0) {
    if (n1 > n2) {
      node.align = 1
    } else if (n2 > n1) {
      node.align = 2
    } else if (n1 > 0 && n1 === n2) {
      node.align = 3
    }
  } else if (node.align === 3) {
    node.align = 0
  } else if ([1, 2].includes(node.align)) {
    if (n0 === 0) {
      node.align = 3
    }
  }
}

setInterval(update, 1000 * timeStep)

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
      const open = Math.random() < 1
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
  halfCycleLength = nodes.length
  cycleLength = 2 * halfCycleLength
  const startTimes = shuffle(range(cycleLength))
  nodes.forEach((node, id) => {
    node.id = id
    node.time = startTimes[id]
    node.startTime = startTimes[id]
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

import { makeIo } from './server.js'

console.log('Hello server.')

const serverId = Math.random()
const players = new Map()
const sockets = new Map()
const updateInterval = 0.1
const mapRadius = 5

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
    team: smallTeam
  }
  players.set(socket.id, player)
  sockets.set(socket.id, socket)
  socket.on('clientUpdateServer', message => {
    const reply = {
      team: player.team,
      serverId,
      mapRadius,
      nodes
    }
    socket.emit('updateClient', reply)
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    sockets.delete(socket.id)
    players.delete(socket.id)
  })
})

function range (n) {
  return [...Array(n).keys()]
}
function choose (array) {
  return array[Math.floor(Math.random() * array.length)]
}
// function sum (array) { return array.reduce((a, b) => a + b, 0) }
// function clamp (a, b, x) { return Math.max(a, Math.min(b, x)) }

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

const nodes = makeNodes()

nodes.forEach((node, index) => {
  node.id = index
})

function update () {
  //
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
      const open = Math.random() < 1 & (q !== 0 | r !== 0)
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
  return nodes
}

function makeNode (q, r, s, index) {
  const node = {
    align: choose([0, 1, 2, 3]),
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

import { makeIo } from './server.js'

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

const players = new Map()
const sockets = new Map()
const updateInterval = 0.1
const mapRadius = 2

const nodes = makeNodes()

nodes.forEach((node, index) => {
  node.id = index
})

function update () {
  //
}

function makeNodes () {
  const nodes = []
  const length = 1 + 2 * mapRadius
  range(length).forEach(i => {
    range(length).forEach(j => {
      range(length).forEach(k => {
        const q = i - mapRadius
        const r = j - mapRadius
        const s = k - mapRadius
        if (q + r + s === 0) {
          nodes.push(makeNode(q, r, s))
        }
      })
    })
  })
  return nodes
}

function makeNode (q, r, s) {
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
  const node = {
    align: choose([0, 1, 2]),
    x: q * Q.x + r * R.x + s * S.x,
    y: q * Q.y + r * R.y + s * S.y,
    index: 0,
    life: 0.3,
    neighbors: []
  }
  return node
}

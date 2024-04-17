import { makeIo } from './server.js'
import { choose, clamp, range } from './public/math.js'

const serverId = Math.random()
const players = new Map()
const sockets = new Map()

const mapRadius = 4
const timeStep = 0.1
const growSteps = 30
const buildSteps = 30

let step = 0

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
  step = step + 1
  players.forEach(player => {
    player.step = clamp(0, buildSteps, player.step + 1)
    player.wait = 1 - player.step / buildSteps
  })
  if (step % growSteps === 0) {
    nodes.forEach(node => {
      // node.target = (node.target + 1) % node.neighbors.length
    })
    nodes.forEach(node => {
      if ([1, 2].includes(node.align)) {
        node.align = 0
      }
    })
  }
}

function activate (player, id) {
  if (player.wait === 0) {
    const node = nodes[id]
    if (node.align === player.team) {
      node.align = 0
      player.step = 0
      player.wait = 1
    } else if ([0, 3].includes(node.align)) {
      node.align = player.team
      player.step = 0
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
    step: buildSteps,
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
      const open = Math.random() < 1 && (q !== 0 | r !== 0)
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
  nodes.forEach(node => {
    node.target = choose(range(node.neighbors.length))
  })
  return nodes
}

function makeNode (q, r, s, id) {
  const node = {
    align: 0,
    q,
    r,
    id,
    density: Math.ceil(6 * Math.random()) / 6,
    x: q * Q.x + r * R.x + s * S.x,
    y: q * Q.y + r * R.y + s * S.y,
    neighbors: []
  }
  return node
}

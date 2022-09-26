import { getDist, sub, mult, add, normalize, project } from './vector.js'

export function checkActorWall (player, wall) {
  const overlapX = 0.5 * wall.width + player.radius - Math.abs(player.position.x - wall.position.x)
  const overlapY = 0.5 * wall.height + player.radius - Math.abs(player.position.y - wall.position.y)
  const minOverlap = Math.min(overlapX, overlapY)
  if (minOverlap < 0) return false
  if (overlapX < overlapY) {
    const sign = Math.sign(player.position.x - wall.position.x)

    player.position.x += sign * overlapX * 1.01
    player.velocity = {
      x: sign * Math.abs(player.velocity.x),
      y: player.velocity.y
    }
  } else {
    const sign = Math.sign(player.position.y - wall.position.y)
    player.position.y += sign * overlapY * 1.01
    player.velocity = {
      x: player.velocity.x,
      y: sign * Math.abs(player.velocity.y)
    }
  }
  return true
}

export function checkActorNode (player, node) {
  const dist = getDist(player.position, node.position)
  const overlap = player.radius + node.radius - dist
  if (overlap < 0) return false
  /*
  const vector = sub(player.position, node.position)
  const direction = normalize(vector)
  const push = mult(direction, overlap)
  player.position.x += push.x * 1.01
  player.position.y += push.y * 1.01
  const bounce = Math.min(getLength(direction), getLength(player.velocity)) > 0
  if (bounce) {
    player.velocity = mult(direction, 0.7 * getLength(player.velocity))
  }
  */
  return true
}

export function checkActorActor (a, b) {
  if (a.id === b.id) return false
  const dist = getDist(a.position, b.position)
  const overlap = a.radius + b.radius - dist
  if (overlap < 0) return false
  const vector = sub(a.position, b.position)
  const direction = normalize(vector)
  const push = mult(direction, 2 * overlap)
  a.position = add(a.position, push)
  b.position = sub(b.position, push)
  const projectionA = project(a.velocity, direction)
  const projectionB = project(b.velocity, direction)
  const rejectionA = sub(a.velocity, projectionA)
  const rejectionB = sub(b.velocity, projectionB)
  a.velocity = add(rejectionA, projectionB)
  b.velocity = add(rejectionB, projectionA)
  return true
}

export function getEdges (state) {
  const edges = []
  const pad = 10
  state.walls.forEach(wall => {
    edges.push({
      object: wall,
      side: 'left',
      x: wall.position.x - 0.5 * wall.width - pad
    })
    edges.push({
      object: wall,
      side: 'right',
      x: wall.position.x + 0.5 * wall.width
    })
  })
  state.nodes.forEach(node => {
    edges.push({
      object: node,
      side: 'left',
      x: node.position.x - node.radius - pad
    })
    edges.push({
      object: node,
      side: 'right',
      x: node.position.x + node.radius
    })
  })
  state.players.forEach(player => {
    edges.push({
      object: player,
      side: 'left',
      x: player.position.x - player.radius - pad
    })
    edges.push({
      object: player,
      side: 'right',
      x: player.position.x + player.radius
    })
  })
  edges.sort((a, b) => a.x - b.x)
  return edges
}

export function collide (state) {
  const edges = getEdges(state)
  const active = {
    players: new Map(),
    walls: new Map(),
    nodes: new Map()
  }
  const pairs = {
    playerPlayer: [],
    playerWall: [],
    playerNode: []
  }
  edges.forEach(edge => {
    if (edge.side === 'left') {
      if (edge.object.role === 'player') {
        const player = edge.object
        active.players.forEach(other => pairs.playerPlayer.push([player, other]))
        active.walls.forEach(wall => pairs.playerWall.push([player, wall]))
        active.nodes.forEach(node => pairs.playerNode.push([player, node]))
        active.players.set(player.id, player)
      } else if (edge.object.role === 'wall') {
        const wall = edge.object
        active.players.forEach(player => pairs.playerWall.push([player, wall]))
        active.walls.set(wall.id, wall)
      } else if (edge.object.role === 'node') {
        const node = edge.object
        active.players.forEach(player => pairs.playerNode.push([player, node]))
        active.nodes.set(node.id, node)
      }
    }
    if (edge.side === 'right') {
      if (edge.object.role === 'player') active.players.delete(edge.object.id)
      if (edge.object.role === 'wall') active.walls.delete(edge.object.id)
      if (edge.object.role === 'node') active.nodes.delete(edge.object.id)
    }
  })
  pairs.playerNode.forEach(pair => {
    const player = pair[0]
    const node = pair[1]
    const collision = checkActorNode(player, node)
    const buildReady = player.fill === 1
    const neutralNode = node.team === 0
    if (collision && buildReady && neutralNode) {
      node.team = player.team
      state.buildTimers[player.team] = 0
      node.fill = 1
    }
  })
  pairs.playerWall.forEach(pair => {
    const player = pair[0]
    const wall = pair[1]
    checkActorWall(player, wall)
  })
  pairs.playerPlayer.forEach(pair => {
    const player = pair[0]
    const other = pair[1]
    checkActorActor(player, other)
  })
}

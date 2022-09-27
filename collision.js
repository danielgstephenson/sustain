import { getDist, sub, mult, add, norm, project } from './vector.js'

export function collideActorWall (actor, wall) {
  const overlapX = 0.5 * wall.width + actor.radius - Math.abs(actor.position.x - wall.position.x)
  const overlapY = 0.5 * wall.height + actor.radius - Math.abs(actor.position.y - wall.position.y)
  const minOverlap = Math.min(overlapX, overlapY)
  if (minOverlap < 0) return false
  if (overlapX < overlapY) {
    const sign = Math.sign(actor.position.x - wall.position.x)
    actor.position.x += sign * overlapX * 1.01
    actor.velocity = {
      x: 0,
      y: actor.velocity.y
    }
  } else {
    const sign = Math.sign(actor.position.y - wall.position.y)
    actor.position.y += sign * overlapY * 1.01
    actor.velocity = {
      x: actor.velocity.x,
      y: 0
    }
  }
  return true
}

export function collideActorNode (actor, node) {
  const dist = getDist(actor.position, node.position)
  const overlap = actor.radius + node.radius - dist
  if (overlap < 0) return false
  return true
}

export function collideActorActor (a, b) {
  if (a.id === b.id && a.role === b.role) return false
  const dist = getDist(a.position, b.position)
  const overlap = a.radius + b.radius - dist
  if (overlap < 0) return false
  const vector = sub(a.position, b.position)
  const direction = norm(vector)
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

function onCollidePlayerAttacker (player, attacker, state) {
  attacker.freezeTimer = 1
  player.buildTimer = 0
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
  state.attackers.forEach(attacker => {
    edges.push({
      object: attacker,
      side: 'left',
      x: attacker.position.x - attacker.radius - pad
    })
    edges.push({
      object: attacker,
      side: 'right',
      x: attacker.position.x + attacker.radius
    })
  })
  edges.sort((a, b) => a.x - b.x)
  return edges
}

export function collide (state) {
  const edges = getEdges(state)
  const active = {
    players: new Map(),
    attackers: new Map(),
    walls: new Map(),
    nodes: new Map()
  }
  const pairs = {
    actorActor: [],
    actorWall: [],
    playerNode: []
  }
  edges.forEach(edge => {
    if (edge.side === 'left') {
      if (['player', 'attacker'].includes(edge.object.role)) {
        const actor = edge.object
        active.players.forEach(player => pairs.actorActor.push([actor, player]))
        active.attackers.forEach(attacker => pairs.actorActor.push([actor, attacker]))
        active.walls.forEach(wall => pairs.actorWall.push([actor, wall]))
        active.nodes.forEach(node => pairs.playerNode.push([actor, node]))
        if (edge.object.role === 'player') active.players.set(actor.id, actor)
        if (edge.object.role === 'attacker') active.attackers.set(actor.id, actor)
      } else if (edge.object.role === 'wall') {
        const wall = edge.object
        active.players.forEach(player => pairs.actorWall.push([player, wall]))
        active.attackers.forEach(attacker => pairs.actorWall.push([attacker, wall]))
        active.walls.set(wall.id, wall)
      } else if (edge.object.role === 'node') {
        const node = edge.object
        active.players.forEach(player => pairs.playerNode.push([player, node]))
        active.nodes.set(node.id, node)
      }
    }
    if (edge.side === 'right') {
      if (edge.object.role === 'player') active.players.delete(edge.object.id)
      if (edge.object.role === 'attacker') active.attackers.delete(edge.object.id)
      if (edge.object.role === 'wall') active.walls.delete(edge.object.id)
      if (edge.object.role === 'node') active.nodes.delete(edge.object.id)
    }
  })
  pairs.playerNode.forEach(pair => {
    const player = pair[0]
    const node = pair[1]
    const collision = collideActorNode(player, node)
    const buildReady = player.buildTimer === 1
    const neutralNode = node.team === 0
    if (collision && buildReady && neutralNode) {
      node.team = player.team
      player.buildTimer = 0
      node.fill = 1
    }
  })
  pairs.actorWall.forEach(pair => {
    const player = pair[0]
    const wall = pair[1]
    collideActorWall(player, wall)
  })
  pairs.actorActor.forEach(pair => {
    const actorA = pair[0]
    const actorB = pair[1]
    if (collideActorActor(actorA, actorB)) {
      if (actorA.role === 'player' && actorB.role === 'attacker') {
        onCollidePlayerAttacker(actorA, actorB, state)
      }
      if (actorB.role === 'player' && actorA.role === 'attacker') {
        onCollidePlayerAttacker(actorB, actorA, state)
      }
    }
  })
}

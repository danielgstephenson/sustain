import { getDist, sub, getLength, mult, add, normalize, project } from './vector.js'

export function checkPlayerWall (player, wall) {
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

export function checkPlayerNode (player, node) {
  const dist = getDist(player.position, node.position)
  const overlap = player.radius + node.radius - dist
  if (overlap < 0) return false
  const vector = sub(player.position, node.position)
  const direction = normalize(vector)
  const push = mult(direction, overlap)
  player.position.x += push.x * 1.01
  player.position.y += push.y * 1.01
  const bounce = Math.min(getLength(direction), getLength(player.velocity)) > 0
  if (bounce) {
    player.velocity = mult(direction, 0.7 * getLength(player.velocity))
  }
  return true
}

export function checkPlayerPlayer (a, b) {
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

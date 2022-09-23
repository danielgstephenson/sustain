import { getDist, subtract, getLength, project, add, dot, mult, normalize } from './vector.js'

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
  const vector = subtract(player.position, node.position)
  const direction = normalize(vector)
  const push = mult(direction, overlap)
  player.position.x += push.x * 1.01
  player.position.y += push.y * 1.01
  const bounce = Math.min(getLength(direction), getLength(player.velocity)) > 0
  if (bounce) {
    const projection = project(player.velocity, direction)
    const rejection = subtract(player.velocity, projection)
    const sign = Math.sign(dot(projection, direction))
    /*
    console.log('projection', projection)
    console.log('rejection', rejection)
    console.log('sign', sign)
    console.log('mult(projection, sign))', mult(projection, sign))
    console.log('add(rejection, mult(bounce, sign))', add(rejection, mult(projection, sign)))
    */
    player.velocity = mult(direction, 0.7 * getLength(player.velocity))
    // player.velocity = add(rejection, mult(projection, sign))
  }
  return true
}

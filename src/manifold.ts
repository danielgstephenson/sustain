import { Cell } from './cell'
import { choose, range } from './math'
import { ManifoldSummary } from './summaries/manifoldSummary'
import { Vec2 } from './Vec2'
import { Wall } from './wall'

export class Manifold {
  cells: Cell[] = []
  grid: Cell[][] = []
  walls: Wall[] = []
  size = 20

  constructor () {
    this.grid = range(this.size).map(() => [])
    this.buildCells()
    this.buildConnections()
    this.buildWalls()
  }

  buildConnections (): void {
    const startIndex = choose(range(this.cells.length))
    const startCell = this.cells[startIndex]
    startCell.visited = true
    const stack = [startCell]
    while (stack.length > 0) {
      const current = stack.pop()
      if (current == null) break
      const options = current.neighbors.filter(neighbor => !neighbor.visited)
      if (options.length === 0) continue
      stack.push(current)
      const choice = choose(options)
      current.connections.push(choice)
      choice.connections.push(current)
      choice.visited = true
      stack.push(choice)
    }
    this.cells.forEach(cell => {
      if (cell.connections.length > 1) return
      const options = cell.neighbors.filter(neighbor => {
        return !cell.connections.includes(neighbor)
      })
      if (options.length === 0) return
      const choice = choose(options)
      cell.connections.push(choice)
      choice.connections.push(cell)
    })
  }

  buildWalls (): void {
    const topLeft = new Vec2(0, 0)
    const topRight = new Vec2(this.size, 0)
    const bottomLeft = new Vec2(0, this.size)
    const bottomRight = new Vec2(this.size, this.size)
    this.walls.push(new Wall(topLeft, topRight))
    this.walls.push(new Wall(bottomLeft, bottomRight))
    this.walls.push(new Wall(topLeft, bottomLeft))
    this.walls.push(new Wall(topRight, bottomRight))
    this.cells.forEach(cell => {
      cell.neighbors.forEach(neighbor => {
        if (cell.index > neighbor.index) return
        if (cell.connections.includes(neighbor)) return
        if (cell.x === neighbor.x) {
          const x = cell.x
          const y = Math.max(cell.y, neighbor.y)
          const top = new Vec2(x, y)
          const bottom = new Vec2(x + 1, y)
          this.walls.push(new Wall(top, bottom))
        }
        if (cell.y === neighbor.y) {
          const x = Math.max(cell.x, neighbor.x)
          const y = cell.y
          const left = new Vec2(x, y)
          const right = new Vec2(x, y + 1)
          this.walls.push(new Wall(left, right))
        }
      })
    })
  }

  buildCells (): void {
    range(this.size).forEach(x => {
      range(this.size).forEach(y => {
        const index = this.cells.length
        const cell = new Cell(index, x, y)
        this.cells.push(cell)
        this.grid[x][y] = cell
      })
    })
    this.cells.forEach(cell => {
      const x = cell.x
      const y = cell.y
      const min = 0
      const max = this.size - 1
      if (x > min) cell.neighbors.push(this.grid[x - 1][y])
      if (x < max) cell.neighbors.push(this.grid[x + 1][y])
      if (y > min) cell.neighbors.push(this.grid[x][y - 1])
      if (y < max) cell.neighbors.push(this.grid[x][y + 1])
    })
  }

  summarize (): ManifoldSummary {
    return new ManifoldSummary(this)
  }
}

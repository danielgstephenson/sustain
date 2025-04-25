import { Cell } from './cell'
import { range } from './math'
import { ManifoldSummary } from './summaries/manifoldSummary'

export class Manifold {
  cells: Cell[] = []
  grid: Cell[][] = []
  size = 10

  constructor () {
    this.grid = range(this.size).map(() => [])
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
      if (x > min) cell.neighbors.push(this.grid[x - 1][y].index)
      if (x < max) cell.neighbors.push(this.grid[x + 1][y].index)
      if (y > min) cell.neighbors.push(this.grid[x][y - 1].index)
      if (y < max) cell.neighbors.push(this.grid[x][y + 1].index)
    })
  }

  summarize (): ManifoldSummary {
    return new ManifoldSummary(this)
  }
}

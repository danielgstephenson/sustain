import { Cell } from './cell'
import { choose, range } from './math'
import { CellSummary } from './summaries/cellSummary'
import { ManifoldSummary } from './summaries/manifoldSummary'

export class Manifold {
  size = 30
  cells: Cell[] = []
  grid: Cell[][] = range(this.size).map(() => [])
  summary: ManifoldSummary

  constructor () {
    this.buildCells()
    this.summary = this.summarize()
  }

  step (): void {
    const lagManifold = this.summarize()
    this.cells.forEach(cell => {
      const lagCell = lagManifold.cells[cell.index]
      const count1 = this.countNeighbors(lagCell, lagManifold, 1)
      const count2 = this.countNeighbors(lagCell, lagManifold, 2)
      const count5 = this.countNeighbors(lagCell, lagManifold, 5)
      if (lagCell.state === 0) {
        if (count1 > count2 && [2].includes(count1)) cell.state = 1
        if (count2 > count1 && [2].includes(count2)) cell.state = 2
        return
      }
      if ([1, 2].includes(lagCell.state)) {
        if (count5 > 0) {
          cell.state = 3
          return
        }
        const otherCount = lagCell.state === 1 ? count2 : count1
        const sameCount = lagCell.state === 1 ? count1 : count2
        if (otherCount > 0 && otherCount >= sameCount) {
          cell.state = 3
          return
        }
        if (sameCount === 0) {
          return
        }
      }
      if (lagCell.state === 1) cell.state = 3
      if (lagCell.state === 2) cell.state = 3
      if (lagCell.state === 3) cell.state = 4
      if (lagCell.state === 4) cell.state = 0
      if (lagCell.state === 5) {
        if (count1 + count2 > 0) cell.state = 3
      }
    })
    this.summary = this.summarize()
  }

  decay (): void {
    const lagManifold = this.summarize()
    const totalCells = lagManifold.cells.length
    const totalRed = lagManifold.cells.filter(c => c.state === 5).length
    const many = totalRed > 0.15 * totalCells
    const grow = !many
    this.cells.forEach(cell => {
      const lagCell = lagManifold.cells[cell.index]
      const count5 = this.countNeighbors(lagCell, lagManifold, 5)
      if (lagCell.state === 0 && grow) {
        if ([3].includes(count5)) cell.state = 5
      }
      if (lagCell.state === 5) {
        if (count5 < 2 || count5 > 4) cell.state = 0
      }
    })
    this.summary = this.summarize()
  }

  countNeighbors (cell: CellSummary, manifold: ManifoldSummary, state: number): number {
    const neighbors = cell.neighbors.filter(i => {
      const neighbor = manifold.cells[i]
      return neighbor.state === state
    })
    return neighbors.length
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
      if (x > min && y > min) cell.neighbors.push(this.grid[x - 1][y - 1])
      if (x > min && y < max) cell.neighbors.push(this.grid[x - 1][y + 1])
      if (x < max && y < max) cell.neighbors.push(this.grid[x + 1][y + 1])
      if (x < max && y > min) cell.neighbors.push(this.grid[x + 1][y - 1])
    })
    this.initialize()
  }

  initialize (): void {
    const a = Math.floor(0.2 * this.size)
    const b = Math.floor(0.8 * this.size)
    const options = range(a, b)
    const totalCells = this.cells.length
    range(200).forEach(_ => {
      const totalRed = this.cells.filter(c => c.state === 5).length
      if (totalRed > 0.1 * totalCells) return
      const y = choose(options)
      const x = choose(options)
      this.grid[x][y].state = 5
    })
    range(200).forEach(_ => {
      this.decay()
    })
  }

  summarize (): ManifoldSummary {
    return new ManifoldSummary(this)
  }
}

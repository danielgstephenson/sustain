import { Cell } from './cell'
import { choose, range } from './math'
import { CellSummary } from './summaries/cellSummary'
import { ManifoldSummary } from './summaries/manifoldSummary'

export class Manifold {
  size = 34
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
      const count3 = this.countNeighbors(lagCell, lagManifold, 3)
      const count4 = this.countNeighbors(lagCell, lagManifold, 4)
      const count5 = this.countNeighbors(lagCell, lagManifold, 5)
      const activeCount = count1 + count2
      const decayCount = count3 + count4
      if (lagCell.state === 0 && activeCount === 2) {
        if (count1 > count2) {
          cell.state = 1
          return
        }
        if (count2 > count1) {
          cell.state = 2
          return
        }
        return
      }
      if ([1, 2].includes(lagCell.state)) {
        const otherCount = lagCell.state === 1 ? count2 : count1
        if (otherCount > 0) {
          cell.state = 0
          return
        }
        if (activeCount === 0 && decayCount > 0) {
          return
        }
        cell.state = 3
      }
      if (lagCell.state === 3) {
        cell.state = 4
        return
      }
      if (lagCell.state === 4) {
        cell.state = 0
        return
      }
      if (lagCell.state === 5) {
        if (count1 + count2 > 0) cell.state = 3
        if (count5 === 0) cell.state = 3
      }
    })
    this.summary = this.summarize()
  }

  decay (): void {
    const lagManifold = this.summarize()
    this.cells.forEach(cell => {
      const lagCell = lagManifold.cells[cell.index]
      const count5 = this.countNeighbors(lagCell, lagManifold, 5)
      if (lagCell.state === 5 && count5 === 0) {
        cell.state = 0
      }
    })
    const totalCells = lagManifold.cells.length
    const totalRed = lagManifold.cells.filter(c => c.state === 5).length
    if (totalRed > 0.2 * totalCells) return
    const emptyCells = this.cells.filter(cell => cell.state === 0)
    const growCells = emptyCells.filter(cell => {
      const lagCell = lagManifold.cells[cell.index]
      const count5 = this.countNeighbors(lagCell, lagManifold, 5)
      return count5 > 1
    })
    const maxDistance = Math.max(...growCells.map(c => c.distance))
    growCells.forEach(cell => {
      if (cell.distance === maxDistance) cell.state = 5
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
    const centerCells = range(3).map(_ => choose(this.cells))
    centerCells.forEach(cell => { cell.state = 6 })
    this.cells.forEach(cell => {
      const distances = centerCells.map(centerCell => {
        const dx = cell.x - centerCell.x
        const dy = cell.y - centerCell.y
        return Math.sqrt(dx * dx + dy * dy)
      })
      cell.distance = Math.min(...distances)
    })
    const options = this.cells.filter(c => c.distance < 0.2 * this.size)
    range(300).forEach(_ => {
      const cell = choose(options)
      if (cell.state === 0) cell.state = 5
    })
    range(2).forEach(_ => {
      this.decay()
    })
  }

  summarize (): ManifoldSummary {
    return new ManifoldSummary(this)
  }
}

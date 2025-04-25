import { Manifold } from '../manifold'
import { Wall } from '../wall'
import { CellSummary } from './cellSummary'

export class ManifoldSummary {
  cells: CellSummary[]
  walls: Wall[]
  size: number

  constructor (manifold: Manifold) {
    this.cells = manifold.cells.map(cell => new CellSummary(cell))
    this.walls = manifold.walls
    this.size = manifold.size
  }
}

import { Manifold } from '../manifold'
import { CellSummary } from './cellSummary'

export class ManifoldSummary {
  cells: CellSummary[]
  size: number

  constructor (manifold: Manifold) {
    this.cells = manifold.cells.map(cell => new CellSummary(cell))
    this.size = manifold.size
  }
}

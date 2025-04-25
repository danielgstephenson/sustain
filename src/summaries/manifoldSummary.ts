import { Cell } from '../cell'
import { Manifold } from '../manifold'

export class ManifoldSummary {
  cells: Cell[]
  size: number

  constructor (manifold: Manifold) {
    this.cells = manifold.cells
    this.size = manifold.size
  }
}

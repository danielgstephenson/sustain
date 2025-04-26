import { Cell } from '../cell'

export class CellSummary {
  index: number
  x: number
  y: number
  state: number
  connections: number[]
  mouseover = false

  constructor (cell: Cell) {
    this.index = cell.index
    this.x = cell.x
    this.y = cell.y
    this.state = cell.state
    this.connections = cell.connections.map(x => x.index)
  }
}

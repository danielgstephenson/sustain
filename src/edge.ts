import { Cell } from './cell'

export class Edge {
  horizontal: boolean
  lowIndex: number
  highIndex: number
  x: number
  y: number

  constructor (lowCell: Cell, highCell: Cell) {
    this.lowIndex = lowCell.index
    this.highIndex = highCell.index
    this.x = 0.5 * (lowCell.x + highCell.x)
    this.y = 0.5 * (lowCell.y + highCell.y)
    this.horizontal = lowCell.x === highCell.x
  }
}

export class Cell {
  neighbors: Cell[] = []
  index: number
  x: number
  y: number
  state = 0

  constructor (index: number, x: number, y: number) {
    this.index = index
    this.x = x
    this.y = y
  }
}

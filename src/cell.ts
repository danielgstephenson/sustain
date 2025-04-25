export class Cell {
  neighbors: Cell[] = []
  connections: Cell[] = []
  index: number
  x: number
  y: number
  state = 0 // choose([0, 1, 2])
  visited = false

  constructor (index: number, x: number, y: number) {
    this.index = index
    this.x = x
    this.y = y
  }
}

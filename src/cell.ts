import { choose } from './math'

export class Cell {
  neighbors: number[] = []
  index: number
  x: number
  y: number
  align = choose([0, 1, 2])
  age = 0

  constructor (index: number, x: number, y: number) {
    this.index = index
    this.x = x
    this.y = y
  }
}

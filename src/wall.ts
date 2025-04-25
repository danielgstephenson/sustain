import { Vec2 } from './Vec2'

export class Wall {
  a: Vec2
  b: Vec2

  constructor (a: Vec2, b: Vec2) {
    this.a = a
    this.b = b
  }
}

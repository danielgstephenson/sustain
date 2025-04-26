export class Team {
  choice?: number
  score = 0
  count = 0
  victory = false
  index: number

  constructor (index: number) {
    this.index = index
  }
}

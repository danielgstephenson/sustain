export class Team {
  choices: number[] = []
  score = 0
  count = 0
  victory = false
  ready = false
  index: number

  constructor (index: number) {
    this.index = index
  }
}

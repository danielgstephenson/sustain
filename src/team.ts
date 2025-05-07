export class Team {
  choices: number[] = []
  oldChoices: number[] = []
  score = 0
  cells = 0
  reserve = 1
  victory = false
  ready = false
  index: number

  constructor (index: number) {
    this.index = index
  }
}

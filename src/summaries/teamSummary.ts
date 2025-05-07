import { Team } from '../team'

export class TeamSummary {
  oldChoices: number[] = []
  score = 0
  cells = 0
  reserve = 1
  victory = false
  ready = false

  constructor (team?: Team) {
    if (team != null) {
      this.oldChoices = team.oldChoices
      this.score = team.score
      this.cells = team.cells
      this.reserve = team.reserve
      this.victory = team.victory
      this.ready = team.ready
    }
  }
}

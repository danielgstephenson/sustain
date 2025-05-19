import { Team } from '../team'

export class TeamSummary {
  oldChoices: number[] = []
  cellCount = 0
  reserve = 1
  victory = false
  ready = false

  constructor (team?: Team) {
    if (team != null) {
      this.oldChoices = team.oldChoices
      this.cellCount = team.cellCount
      this.reserve = team.reserve
      this.victory = team.victory
      this.ready = team.ready
    }
  }
}

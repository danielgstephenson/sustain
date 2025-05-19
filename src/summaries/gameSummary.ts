import { Game } from '../game'
import { TeamSummary } from './teamSummary'

export class GameSummary {
  team = 1
  state = 'decision'
  countdown = 0
  cellStates: number[] = []
  token = ''
  maxCountdown = 80
  decisionCount = 0
  stepInterval = 0.25
  teams = {
    1: new TeamSummary(),
    2: new TeamSummary()
  }

  constructor (team: number, game?: Game) {
    this.team = team
    if (game != null) {
      this.state = game.state
      this.countdown = game.countdown
      this.teams[1] = new TeamSummary(game.teams[1])
      this.teams[2] = new TeamSummary(game.teams[2])
      this.cellStates = game.manifold.cells.map(c => c.state)
      this.token = game.token
      this.maxCountdown = game.maxCountdown
      this.decisionCount = game.decisionCount
      this.stepInterval = game.stepInterval
    }
  }
}

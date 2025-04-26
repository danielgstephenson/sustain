import { Game } from '../game'

export class GameSummary {
  team: number
  gameState: string
  countdown: number
  choice?: number
  ready1: boolean
  ready2: boolean
  score1: number
  score2: number
  victory1: boolean
  victory2: boolean
  cellStates: number[]

  constructor (game: Game, team: number) {
    this.team = team
    this.gameState = game.state
    this.countdown = game.countdown
    this.choice = game.teams[team].choice
    this.ready1 = game.teams[1].choice != null
    this.ready2 = game.teams[2].choice != null
    this.score1 = game.teams[1].score
    this.score2 = game.teams[2].score
    this.victory1 = game.teams[1].victory
    this.victory2 = game.teams[2].victory
    this.cellStates = game.manifold.cells.map(c => c.state)
  }
}

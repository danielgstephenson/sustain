import { Game } from '../game'

export class GameSummary {
  team: number
  gameState: string
  countdown: number
  choices: number[]
  ready1: boolean
  ready2: boolean
  score1: number
  score2: number
  victoryScore: number
  victory1: boolean
  victory2: boolean
  cellStates: number[]

  constructor (game: Game, team: number) {
    this.team = team
    this.gameState = game.state
    this.countdown = game.countdown
    this.choices = game.teams[team].choices
    this.ready1 = game.teams[1].ready
    this.ready2 = game.teams[2].ready
    this.score1 = game.teams[1].score
    this.score2 = game.teams[2].score
    this.victoryScore = game.victoryScore
    this.victory1 = game.teams[1].victory
    this.victory2 = game.teams[2].victory
    this.cellStates = game.manifold.cells.map(c => c.state)
  }
}

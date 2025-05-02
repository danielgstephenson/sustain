import { Game } from '../game'

export class GameSummary {
  team: number
  gameState: string
  countdown: number
  ready1: boolean
  ready2: boolean
  score1: number
  score2: number
  cells1: number
  cells2: number
  reserve1: number
  reserve2: number
  victoryScore: number
  victory1: boolean
  victory2: boolean
  cellStates: number[]
  token: string
  stepCount: number
  roundCount: number
  maxCount: number

  constructor (game: Game, team: number) {
    this.team = team
    this.gameState = game.state
    this.countdown = game.countdown
    this.ready1 = game.teams[1].ready
    this.ready2 = game.teams[2].ready
    this.reserve1 = game.teams[1].reserve
    this.reserve2 = game.teams[2].reserve
    this.cells1 = game.teams[1].cells
    this.cells2 = game.teams[2].cells
    this.score1 = game.teams[1].score
    this.score2 = game.teams[2].score
    this.victoryScore = game.victoryScore
    this.victory1 = game.teams[1].victory
    this.victory2 = game.teams[2].victory
    this.cellStates = game.manifold.cells.map(c => c.state)
    this.token = game.token
    this.stepCount = game.stepCount
    this.roundCount = game.roundCount
    this.maxCount = game.maxCount
  }
}

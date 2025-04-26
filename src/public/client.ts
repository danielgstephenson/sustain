import io from 'socket.io-client'
import { Renderer } from './renderer'
import { ManifoldSummary } from '../summaries/manifoldSummary'
import { GameSummary } from '../summaries/gameSummary'

export class Client {
  socket = io()
  manifold?: ManifoldSummary
  renderer: Renderer
  gameState = 'decision'
  countdown = 20
  team = 1
  ready1 = false
  ready2 = false
  score1 = 0
  score2 = 0
  victoryScore = 3000
  victory1 = false
  victory2 = false
  choice?: number
  thinking = true

  constructor () {
    this.renderer = new Renderer(this)
    this.socket.on('connected', () => {
      console.log('connected')
    })
    this.socket.on('setup', (manifold: ManifoldSummary) => {
      this.manifold = manifold
      this.renderer.setup()
    })
    this.socket.on('step', (gameSummary: GameSummary) => {
      this.team = gameSummary.team
      this.ready1 = gameSummary.ready1
      this.ready2 = gameSummary.ready2
      this.score1 = gameSummary.score1
      this.score2 = gameSummary.score2
      this.victoryScore = gameSummary.victoryScore
      this.victory1 = gameSummary.victory1
      this.victory2 = gameSummary.victory2
      this.countdown = gameSummary.countdown
      this.choice = gameSummary.choice
      this.thinking = gameSummary.choice == null
      this.gameState = gameSummary.gameState
      gameSummary.cellStates.forEach((state, i) => {
        if (this.manifold == null) return
        this.manifold.cells[i].state = state
      })
      this.renderer.update()
    })
    document.onmousedown = (event: MouseEvent) => {
      console.log('cells', this.manifold)
    }
  }
}

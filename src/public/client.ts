import io from 'socket.io-client'
import { Renderer } from './renderer'
import { ManifoldSummary } from '../summaries/manifoldSummary'
import { GameSummary } from '../summaries/gameSummary'
import { Cursor } from './cursor'

export class Client {
  socket = io()
  cursor = new Cursor()
  manifold?: ManifoldSummary
  renderer: Renderer
  game: GameSummary
  choices: number[] = []

  constructor () {
    this.game = new GameSummary(1)
    document.oncontextmenu = () => false
    document.onmousedown = (event) => {
      console.log('mousedown', event.button)
      if (event.button === 2) {
        this.socket.emit('ready')
      }
    }
    this.renderer = new Renderer(this)
    this.socket.on('connected', () => {
      console.log('connected')
    })
    this.socket.on('setup', (manifold: ManifoldSummary) => {
      this.manifold = manifold
      this.choices = []
      this.renderer.setup()
    })
    this.socket.on('step', gameSummary => this.onStep(gameSummary))
  }

  onStep (gameSummary: GameSummary): void {
    const newServer = !['', gameSummary.token].includes(this.game.token)
    if (newServer) {
      location.reload()
    }
    if (gameSummary.decisionCount > this.game.decisionCount) {
      this.choices = []
    }
    this.game = gameSummary
    this.cursor.setTeam(this.game.team)
    this.cursor.setTime(this.game.countdown / this.game.maxCountdown)
    this.renderer.readyButton1.style.display = 'none'
    this.renderer.readyButton2.style.display = 'none'
    gameSummary.cellStates.forEach((state, i) => {
      if (this.manifold == null) return
      this.manifold.cells[i].state = state
    })
    this.renderer.update()
  }
}

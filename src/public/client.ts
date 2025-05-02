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
  gameState = 'decision'
  countdown = 20
  team = 1
  ready1 = false
  ready2 = false
  reserve1 = 0
  reserve2 = 0
  cells1 = 0
  cells2 = 0
  score1 = 0
  score2 = 0
  victoryScore = 3000
  victory1 = false
  victory2 = false
  choices: number[] = []
  thinking = true
  stepCount = 0
  roundCount = 0
  maxCount = 1
  token = ''

  constructor () {
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
    const newServer = !['', gameSummary.token].includes(this.token)
    if (newServer) {
      location.reload()
    }
    if (gameSummary.roundCount > this.roundCount) {
      this.choices = []
    }
    this.token = gameSummary.token
    this.stepCount = gameSummary.stepCount
    this.roundCount = gameSummary.roundCount
    this.team = gameSummary.team
    this.ready1 = gameSummary.ready1
    this.ready2 = gameSummary.ready2
    this.reserve1 = gameSummary.reserve1
    this.reserve2 = gameSummary.reserve2
    this.cells1 = gameSummary.cells1
    this.cells2 = gameSummary.cells2
    this.score1 = gameSummary.score1
    this.score2 = gameSummary.score2
    this.victoryScore = gameSummary.victoryScore
    this.victory1 = gameSummary.victory1
    this.victory2 = gameSummary.victory2
    this.countdown = gameSummary.countdown
    this.thinking = this.team === 1 ? !gameSummary.ready1 : !gameSummary.ready2
    this.gameState = gameSummary.gameState
    this.maxCount = gameSummary.maxCount
    this.cursor.setTeam(this.team)
    this.cursor.setTime(this.countdown / this.maxCount)
    const showButton1 = this.gameState === 'decision' && this.team === 1 && !this.ready1
    const showButton2 = this.gameState === 'decision' && this.team === 2 && !this.ready2
    this.renderer.readyButton1.style.display = showButton1 ? 'block' : 'none'
    this.renderer.readyButton2.style.display = showButton2 ? 'block' : 'none'
    gameSummary.cellStates.forEach((state, i) => {
      if (this.manifold == null) return
      this.manifold.cells[i].state = state
    })
    this.renderer.update()
  }
}

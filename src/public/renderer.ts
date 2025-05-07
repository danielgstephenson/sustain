import { CellSummary } from '../summaries/cellSummary'
import { GameSummary } from '../summaries/gameSummary'
import { ManifoldSummary } from '../summaries/manifoldSummary'
import { Client } from './client'
import { Rect, SVG, Svg } from '@svgdotjs/svg.js'

export class Renderer {
  manifold?: ManifoldSummary
  client: Client
  svg: Svg
  squares: Rect[] = []
  teamDiv1: HTMLDivElement
  teamDiv2: HTMLDivElement
  titleDiv1: HTMLDivElement
  titleDiv2: HTMLDivElement
  scoreDiv1: HTMLDivElement
  scoreDiv2: HTMLDivElement
  cellDiv1: HTMLDivElement
  cellDiv2: HTMLDivElement
  reserveDiv1: HTMLDivElement
  reserveDiv2: HTMLDivElement
  countdownDiv1: HTMLDivElement
  countdownDiv2: HTMLDivElement
  readyButton1: HTMLDivElement
  readyButton2: HTMLDivElement
  game: GameSummary

  choiceColors = [
    'hsl(0, 0%, 0%)',
    'hsl(200, 100%, 50%)',
    'hsl(120, 75%, 50%)'
  ]

  colors = [
    'hsl(0, 0%, 0%)',
    'hsl(220, 100%, 50%)',
    'hsl(120, 100%, 30%)',
    'hsl(180, 100%, 20%)',
    'hsl(180, 100%, 10%)',
    'hsl(0, 100%, 15%)'
  ]

  constructor (client: Client) {
    this.client = client
    this.game = new GameSummary(1)
    this.svg = SVG()
    this.svg.addTo('#svgDiv')
    this.svg.size('100vmin', '100vmin')
    this.teamDiv1 = document.getElementById('teamDiv1') as HTMLDivElement
    this.teamDiv2 = document.getElementById('teamDiv2') as HTMLDivElement
    this.titleDiv1 = document.getElementById('titleDiv1') as HTMLDivElement
    this.titleDiv2 = document.getElementById('titleDiv2') as HTMLDivElement
    this.scoreDiv1 = document.getElementById('scoreDiv1') as HTMLDivElement
    this.scoreDiv2 = document.getElementById('scoreDiv2') as HTMLDivElement
    this.cellDiv1 = document.getElementById('cellDiv1') as HTMLDivElement
    this.cellDiv2 = document.getElementById('cellDiv2') as HTMLDivElement
    this.reserveDiv1 = document.getElementById('reserveDiv1') as HTMLDivElement
    this.reserveDiv2 = document.getElementById('reserveDiv2') as HTMLDivElement
    this.countdownDiv1 = document.getElementById('countdownDiv1') as HTMLDivElement
    this.countdownDiv2 = document.getElementById('countdownDiv2') as HTMLDivElement
    this.readyButton1 = document.getElementById('readyButton1') as HTMLDivElement
    this.readyButton2 = document.getElementById('readyButton2') as HTMLDivElement
    this.teamDiv1.style.color = this.choiceColors[1]
    this.teamDiv2.style.color = this.choiceColors[2]
    this.readyButton1.style.color = this.choiceColors[1]
    this.readyButton2.style.color = this.choiceColors[2]
    this.readyButton1.style.outlineColor = this.choiceColors[1]
    this.readyButton2.style.outlineColor = this.choiceColors[2]
    this.readyButton1.onclick = () => { this.client.socket.emit('ready') }
    this.readyButton2.onclick = () => { this.client.socket.emit('ready') }
  }

  setup (): void {
    this.game = this.client.game
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    const size = this.manifold.size
    const padding = 0.5
    this.svg.viewbox(`-${padding} -${padding} ${size + 2 * padding} ${size + 2 * padding}`)
    this.squares = []
    this.manifold.cells.forEach(cell => {
      const color = this.getColor(cell)
      const rect = this.svg.rect(1, 1)
      this.squares[cell.index] = rect
      rect.fill(color)
      rect.move(cell.x, cell.y)
      rect.attr('shape-rendering', 'crispEdges')
      rect.click(event => {
        const team1 = this.game.teams[1]
        const team2 = this.game.teams[2]
        if (this.game.state === 'decision') {
          const chosen = this.client.choices.includes(cell.index)
          if (chosen) {
            this.client.choices = this.client.choices.filter(i => i !== cell.index)
          } else {
            const reserve = this.game.team === 1 ? team1.reserve : team2.reserve
            if (this.client.choices.length < reserve) {
              this.client.choices.push(cell.index)
            }
          }
          rect.fill(this.getColor(cell))
          this.client.socket.emit('choices', this.client.choices)
        }
      })
      rect.mouseenter(event => {
        const team1 = this.game.teams[1]
        const team2 = this.game.teams[2]
        const reserve = this.game.team === 1 ? team1.reserve : team2.reserve
        console.log('reserve', reserve)
        console.log('this.client.choices.length', this.client.choices.length)
        if (this.client.choices.length < reserve) {
          console.log(cell.index, 'mouseOver')
          cell.mouseover = true
        }
        rect.fill(this.getColor(cell))
      })
      rect.mouseleave(event => {
        cell.mouseover = false
        rect.fill(this.getColor(cell))
      })
    })
  }

  getColor (cell: CellSummary): string {
    const chosen = this.client.choices.includes(cell.index)
    const option = [0, 3, 4].includes(cell.state) && !chosen
    const considering = cell.mouseover && option
    const choice = chosen || considering
    if (choice && this.game.state === 'decision') {
      return this.choiceColors[this.game.team]
    }
    return this.colors[cell.state]
  }

  update (): void {
    this.game = this.client.game
    this.updateManifold()
    this.updateInfo()
  }

  updateManifold (): void {
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    const team1 = this.game.teams[1]
    const team2 = this.game.teams[2]
    const otherTeam = this.game.team === 1 ? team2 : team1
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      rect.fill(this.getColor(cell))
      rect.stroke({ color: 'black', opacity: 0, width: 0.1 })
    })
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      if (otherTeam.oldChoices.includes(cell.index)) {
        rect.front()
        rect.stroke({ color: 'rgb(190,190,190)', opacity: 1, width: 0.1 })
      }
    })
  }

  updateInfo (): void {
    const team1 = this.game.teams[1]
    const team2 = this.game.teams[2]
    const team = this.game.team
    this.scoreDiv1.innerHTML = `Score: ${team1.score} / ${this.game.victoryScore}`
    this.scoreDiv2.innerHTML = `Score: ${team2.score} / ${this.game.victoryScore}`
    this.cellDiv1.innerHTML = `Cells: ${team1.cells}`
    this.cellDiv2.innerHTML = `Cells: ${team2.cells}`
    const R1 = team1.reserve
    const R2 = team2.reserve
    const C = this.client.choices.length
    const reserve1 = team === 1 ? R1 - C : R1
    const reserve2 = team === 2 ? R2 - C : R2
    this.reserveDiv1.innerHTML = `Reserve: ${reserve1}`
    this.reserveDiv2.innerHTML = `Reserve: ${reserve2}`
    const showButton1 = this.game.state === 'decision' && this.game.team === 1 && !team1.ready
    const showButton2 = this.game.state === 'decision' && this.game.team === 2 && !team2.ready
    this.readyButton1.style.display = showButton1 ? 'block' : 'none'
    this.readyButton2.style.display = showButton2 ? 'block' : 'none'
    this.countdownDiv1.innerHTML = `Countdown: ${this.game.countdown}`
    this.countdownDiv2.innerHTML = `Countdown: ${this.game.countdown}`
    if (this.game.state === 'action') {
      this.titleDiv1.innerHTML = 'Action'
      this.titleDiv2.innerHTML = 'Action'
    }
    if (this.game.state === 'decision') {
      this.titleDiv1.innerHTML = team1.ready ? 'Ready' : 'Thinking'
      this.titleDiv2.innerHTML = team2.ready ? 'Ready' : 'Thinking'
      if (!team1.ready && !team2.ready) {
        this.countdownDiv1.innerHTML = ''
        this.countdownDiv2.innerHTML = ''
      }
    }
    if (this.game.state === 'victory') {
      this.titleDiv1.innerHTML = team1.victory ? 'VICTORY!' : ''
      this.titleDiv2.innerHTML = team2.victory ? 'VICTORY!' : ''
    }
  }
}

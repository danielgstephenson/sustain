import { CellSummary } from '../summaries/cellSummary'
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

  choiceColors = [
    'hsl(0, 0%, 0%)',
    'hsl(195, 100%, 50%)',
    'hsl(120, 40%, 50%)'
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
        if (this.client.gameState === 'decision') {
          const chosen = this.client.choices.includes(cell.index)
          if (chosen) {
            this.client.choices = this.client.choices.filter(i => i !== cell.index)
          } else {
            const reserve = this.client.team === 1 ? this.client.reserve1 : this.client.reserve2
            if (this.client.choices.length < reserve) {
              this.client.choices.push(cell.index)
            }
          }
          rect.fill(this.getColor(cell))
          this.client.socket.emit('choices', this.client.choices)
        }
      })
      rect.mouseenter(event => {
        const reserve = this.client.team === 1 ? this.client.reserve1 : this.client.reserve2
        if (this.client.choices.length < reserve) {
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
    if (choice && this.client.gameState === 'decision') {
      return this.choiceColors[this.client.team]
    }
    return this.colors[cell.state]
  }

  update (): void {
    this.updateManifold()
    this.updateInfo()
  }

  updateManifold (): void {
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      rect.fill(this.getColor(cell))
    })
  }

  updateInfo (): void {
    this.scoreDiv1.innerHTML = `Score: ${this.client.score1} / ${this.client.victoryScore}`
    this.scoreDiv2.innerHTML = `Score: ${this.client.score2} / ${this.client.victoryScore}`
    this.cellDiv1.innerHTML = `Cells: ${this.client.cells1}`
    this.cellDiv2.innerHTML = `Cells: ${this.client.cells2}`
    const R1 = this.client.reserve1
    const R2 = this.client.reserve2
    const C = this.client.choices.length
    const team = this.client.team
    const reserve1 = team === 1 ? R1 - C : R1
    const reserve2 = team === 2 ? R2 - C : R2
    this.reserveDiv1.innerHTML = `Reserve: ${reserve1}`
    this.reserveDiv2.innerHTML = `Reserve: ${reserve2}`
    this.countdownDiv1.innerHTML = `Countdown: ${this.client.countdown}`
    this.countdownDiv2.innerHTML = `Countdown: ${this.client.countdown}`
    if (this.client.gameState === 'action') {
      this.titleDiv1.innerHTML = 'Action'
      this.titleDiv2.innerHTML = 'Action'
    }
    if (this.client.gameState === 'decision') {
      this.titleDiv1.innerHTML = this.client.ready1 ? 'Ready' : 'Thinking'
      this.titleDiv2.innerHTML = this.client.ready2 ? 'Ready' : 'Thinking'
    }
    if (this.client.gameState === 'victory') {
      this.titleDiv1.innerHTML = this.client.victory1 ? 'VICTORY!' : ''
      this.titleDiv2.innerHTML = this.client.victory2 ? 'VICTORY!' : ''
      this.countdownDiv1.innerHTML = `Countdown: ${this.client.countdown}`
      this.countdownDiv2.innerHTML = `Countdown: ${this.client.countdown}`
    }
  }
}

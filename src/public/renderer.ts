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
  countdownDiv1: HTMLDivElement
  countdownDiv2: HTMLDivElement
  colors = [
    'hsl(0, 0%, 0%)',
    'hsl(220, 100%, 50%)',
    'hsl(120, 100%, 33%)',
    'hsl(180, 20%, 30%)',
    'hsl(180, 20%, 20%)'
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
    this.countdownDiv1 = document.getElementById('countdownDiv1') as HTMLDivElement
    this.countdownDiv2 = document.getElementById('countdownDiv2') as HTMLDivElement
    this.teamDiv1.style.color = this.colors[1]
    this.teamDiv2.style.color = this.colors[2]
  }

  setup (): void {
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    const size = this.manifold.size
    const padding = 0.5
    this.svg.viewbox(`-${padding} -${padding} ${size + 2 * padding} ${size + 2 * padding}`)
    this.squares = []
    this.manifold.cells.forEach(cell => {
      const color = this.colors[cell.state]
      const rect = this.svg.rect(1, 1)
      this.squares[cell.index] = rect
      rect.fill(color)
      rect.move(cell.x, cell.y)
      rect.attr('shape-rendering', 'crispEdges')
      rect.click(event => {
        this.client.socket.emit('click', cell.index)
      })
      rect.mouseenter(event => {
        cell.mouseover = true
        if (cell.state === 0 && this.client.thinking && this.client.gameState === 'decision') {
          const color = this.colors[this.client.team]
          rect.fill(color)
        }
      })
      rect.mouseleave(event => {
        cell.mouseover = false
        if (cell.state === 0 && this.client.gameState === 'decision') {
          const color = this.colors[0]
          rect.fill(color)
        }
      })
    })
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
      const color = this.colors[cell.state]
      rect.fill(color)
      if (cell.state === 0 && this.client.gameState === 'decision') {
        const consider = cell.mouseover && this.client.thinking
        const chosen = this.client.choices.includes(cell.index)
        if (consider || chosen) {
          const color = this.colors[this.client.team]
          rect.fill(color)
        }
      }
    })
  }

  updateInfo (): void {
    this.scoreDiv1.innerHTML = `Score: ${this.client.score1} / ${this.client.victoryScore}`
    this.scoreDiv2.innerHTML = `Score: ${this.client.score2} / ${this.client.victoryScore}`
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

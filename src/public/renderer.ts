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
    'hsl(180, 20%, 12%)',
    'hsl(220, 100%, 50%)',
    'hsl(120, 100%, 35%)',
    'hsl(180, 20%, 50%)',
    'hsl(180, 10%, 30%)'
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
    this.svg.viewbox(`-1 -1 ${size + 2} ${size + 2}`)
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
        if (cell.state === 0 && this.client.thinking && this.client.gameState === 'decision') {
          const color = this.colors[0]
          rect.fill(color)
        }
      })
    })
    const wallColor = 'hsl(180, 10%, 30%)'
    this.manifold.walls.forEach(wall => {
      const line = this.svg.line(wall.a.x, wall.a.y, wall.b.x, wall.b.y)
      line.stroke({ color: wallColor, width: 0.2, linejoin: 'round', linecap: 'round' })
    })
  }

  update (): void {
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      const color = this.colors[cell.state]
      rect.fill(color)
      if (cell.state === 0 && this.client.gameState === 'decision') {
        const consider = cell.mouseover && this.client.thinking
        const chosen = cell.index === this.client.choice && !this.client.thinking
        if (consider || chosen) {
          const color = this.colors[this.client.team]
          rect.fill(color)
        }
      }
    })
    this.scoreDiv1.innerHTML = `Score: ${this.client.score1}`
    this.scoreDiv2.innerHTML = `Score: ${this.client.score2}`
    if (this.client.gameState === 'action') {
      this.titleDiv1.innerHTML = 'Action'
      this.titleDiv2.innerHTML = 'Action'
      this.countdownDiv1.innerHTML = `Countdown: ${this.client.countdown}`
      this.countdownDiv2.innerHTML = `Countdown: ${this.client.countdown}`
    }
    if (this.client.gameState === 'decision') {
      this.titleDiv1.innerHTML = this.client.ready1 ? 'Ready' : 'Thinking'
      this.titleDiv2.innerHTML = this.client.ready2 ? 'Ready' : 'Thinking'
      if (this.client.ready1 || this.client.ready2) {
        this.countdownDiv1.innerHTML = `Countdown: ${this.client.countdown}`
        this.countdownDiv2.innerHTML = `Countdown: ${this.client.countdown}`
      } else {
        this.countdownDiv1.innerHTML = ''
        this.countdownDiv2.innerHTML = ''
      }
    }
    if (this.client.gameState === 'victory') {
      this.titleDiv1.innerHTML = this.client.victory1 ? 'VICTORY!' : ''
      this.titleDiv2.innerHTML = this.client.victory2 ? 'VICTORY!' : ''
      this.countdownDiv1.innerHTML = `Countdown: ${this.client.countdown}`
      this.countdownDiv2.innerHTML = `Countdown: ${this.client.countdown}`
    }
  }
}

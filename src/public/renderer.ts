import { ManifoldSummary } from '../summaries/manifoldSummary'
import { Client } from './client'
import { Rect, SVG, Svg } from '@svgdotjs/svg.js'

export class Renderer {
  manifold?: ManifoldSummary
  client: Client
  svg: Svg
  squares: Rect[] = []
  colors = [
    'hsl(180, 20%, 12%)',
    'hsl(230, 100%, 50%)',
    'hsl(120, 100%, 35%)',
    'hsl(230, 20%, 50%)',
    'hsl(120, 20%, 35%)',
    'hsl(0, 100%, 40%)'
  ]

  constructor (client: Client) {
    this.client = client
    this.svg = SVG()
    this.svg.addTo('#interfaceDiv')
    this.svg.size('100vmin', '100vmin')
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
      const square = this.squares[cell.index]
      if (square == null) return
      const color = this.colors[cell.state]
      square.fill(color)
    })
  }
}

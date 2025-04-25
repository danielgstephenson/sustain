import { Cell } from '../cell'
import { ManifoldSummary } from '../summaries/manifoldSummary'
import { Client } from './client'

export class Renderer {
  manifold?: ManifoldSummary
  client: Client
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D

  constructor (client: Client) {
    this.client = client
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D
    this.draw()
  }

  draw (): void {
    window.requestAnimationFrame(() => this.draw())
    this.setupCanvas()
    this.resetContext()
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    this.manifold.cells.forEach(cell => this.drawCell(cell))
    this.manifold.cells.forEach(cell => this.drawWalls(cell))
  }

  drawCell (cell: Cell): void {
    if (this.manifold == null) return
    const x = cell.x
    const y = cell.y
    const dim = cell.align === 2 ? 0.6 : 1
    const H = cell.align === 1 ? 240 : 120
    const S = cell.align === 0 ? 0 : 100
    const L = cell.align === 0 ? 20 : 50 * dim
    this.context.fillStyle = `hsl(${H} ${S} ${L})`
    this.context.beginPath()
    this.context.rect(x - 0.5, y - 0.5, 1, 1)
    this.context.fill()
  }

  drawWalls (cell: Cell): void {
    if (this.manifold == null) return
    const x = cell.x
    const y = cell.y
    this.context.strokeStyle = 'hsl(0 0 0)'
    this.context.lineWidth = 0.2
    this.context.beginPath()
    this.context.rect(x - 0.5, y - 0.5, 1, 1)
    this.context.stroke()
  }

  setupCanvas (): void {
    if (this.manifold == null) return
    const vmin = Math.min(window.innerWidth, window.innerHeight)
    this.canvas.width = vmin
    this.canvas.height = vmin
  }

  resetContext (): void {
    if (this.manifold == null) return
    this.context.resetTransform()
    this.context.translate(0.5 * this.canvas.width, 0.5 * this.canvas.height)
    const vmin = Math.min(this.canvas.width, this.canvas.height)
    const scale = vmin / (this.manifold.size)
    this.context.scale(scale, -scale)
    const offset = -0.5 * (this.manifold.size - 1)
    this.context.translate(offset, offset)
    this.context.globalAlpha = 1
  }
}

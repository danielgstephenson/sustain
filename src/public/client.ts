import io from 'socket.io-client'
import { Renderer } from './renderer'
import { ManifoldSummary } from '../summaries/manifoldSummary'

export class Client {
  socket = io()
  manifold?: ManifoldSummary
  renderer: Renderer

  constructor () {
    this.renderer = new Renderer(this)
    this.socket.on('connected', () => {
      console.log('connected')
      setInterval(() => this.updateServer(), 1000 / 5)
    })
    this.socket.on('setup', (manifold: ManifoldSummary) => {
      this.manifold = manifold
      this.renderer.setup()
    })
    this.socket.on('update', (manifold: ManifoldSummary) => {
      this.manifold = manifold
      this.renderer.update()
    })
    document.onmousedown = (event: MouseEvent) => {
      console.log('cells', this.manifold)
    }
  }

  updateServer (): void {
    this.socket.emit('update')
  }
}

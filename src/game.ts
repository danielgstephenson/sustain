import { Manifold } from './manifold'
import { Server } from './server'
import { ManifoldSummary } from './summaries/manifoldSummary'

export class Game {
  server: Server
  manifold: Manifold
  summary: ManifoldSummary

  constructor () {
    this.server = new Server()
    this.manifold = new Manifold()
    this.summary = new ManifoldSummary(this.manifold)
    this.setupIo()
    setInterval(() => this.step(), 500)
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      console.log('connect:', socket.id)
      socket.emit('connected')
      socket.emit('setup', this.summary)
      socket.on('update', () => {
        socket.emit('update', this.summary)
      })
      socket.on('click', (index: number) => {
        const cell = this.manifold.cells[index]
        console.log('click', cell.x, cell.y)
        cell.state = 1
        this.summary = new ManifoldSummary(this.manifold)
      })
      socket.on('disconnect', () => {
        console.log('disconnect:', socket.id)
      })
    })
  }

  step (): void {
    const lagManifold = new ManifoldSummary(this.manifold)
    this.manifold.cells.forEach(cell => {
      const lagCell = lagManifold.cells[cell.index]
      if (lagCell.state === 1) {
        cell.state = 3
      }
      if (lagCell.state === 3) {
        cell.state = 0
      }
      if (lagCell.state === 0) {
        const connections1 = lagCell.connections.filter(i => {
          const lagConnection = lagManifold.cells[i]
          return lagConnection.state === 1
        })
        if (connections1.length > 0) cell.state = 1
      }
    })
    this.summary = new ManifoldSummary(this.manifold)
  }
}

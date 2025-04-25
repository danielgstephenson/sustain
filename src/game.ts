import { Manifold } from './manifold'
import { Server } from './server'

export class Game {
  server: Server
  manifold: Manifold

  constructor () {
    this.server = new Server()
    this.manifold = new Manifold()
    this.setupIo()
    setInterval(() => this.step(), 1000)
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      console.log('connect:', socket.id)
      socket.emit('connected')
      socket.on('input', () => {
        socket.emit('cells', this.manifold.summarize())
      })
      socket.on('disconnect', () => {
        console.log('disconnect:', socket.id)
      })
    })
  }

  step (): void {
    //
  }
}

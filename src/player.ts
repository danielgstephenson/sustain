import { DefaultEventsMap, Socket } from 'socket.io'
import { Game } from './game'

type DefaultSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>

export class Player {
  team: number
  id: string
  socket: DefaultSocket

  constructor (game: Game, socket: DefaultSocket) {
    this.id = socket.id
    this.socket = socket
    this.team = game.getSmallTeam()
  }
}

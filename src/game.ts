import { Manifold } from './manifold'
import { choose } from './math'
import { Player } from './player'
import { Server } from './server'
import { GameSummary } from './summaries/gameSummary'
import { Team } from './team'

export class Game {
  server = new Server()
  manifold = new Manifold()
  teams: Record<number, Team> = {}
  players: Player[] = []
  state = 'decision'
  victoryScore = 3000
  actionSteps = 20
  decisionSteps = 30
  victorySteps = 40
  countdown = 100
  stepTime: number

  constructor () {
    this.teams[1] = new Team(1)
    this.teams[2] = new Team(2)
    this.setupIo()
    this.stepTime = 0.5 / this.server.config.timeScale
    this.countdown = this.decisionSteps
    setInterval(() => this.step(), this.stepTime * 1000)
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      const player = new Player(this, socket)
      this.players.push(player)
      console.log('connect:', socket.id)
      socket.emit('connected')
      socket.emit('setup', this.manifold.summary)
      socket.on('click', (index: number) => {
        const cell = this.manifold.cells[index]
        const team = this.teams[player.team]
        if (cell.state === 0) {
          team.choices.push(index)
          // const otherTeam = this.teams[3 - player.team]
          // const otherTeamCount = this.getPlayerCount(3 - player.team)
          // if (otherTeamCount === 0) {
          //   otherTeam.choices = this.getBotChoice()
          // }
        }
      })
      socket.on('disconnect', () => {
        console.log('disconnect:', socket.id)
        this.players = this.players.filter(p => p.id !== socket.id)
      })
    })
  }

  step (): void {
    if (this.state === 'action') {
      this.actionStep()
    } else if (this.state === 'decision') {
      this.decisionStep()
    } else if (this.state === 'victory') {
      this.victoryStep()
    }
    const summary1 = new GameSummary(this, 1)
    const summary2 = new GameSummary(this, 2)
    this.players.forEach(player => {
      const summary = player.team === 1 ? summary1 : summary2
      player.socket.emit('step', summary)
    })
  }

  victoryStep (): void {
    this.countdown = Math.max(0, this.countdown - 1)
    if (this.countdown === 0) {
      this.manifold = new Manifold()
      this.manifold.summary = this.manifold.summarize()
      this.teams[1] = new Team(1)
      this.teams[2] = new Team(2)
      this.players.forEach(player => {
        player.team = 0
      })
      this.players.forEach(player => {
        const smallTeam = this.getSmallTeam()
        console.log('smallTeam', smallTeam)
        player.team = smallTeam
      })
      this.countdown = this.decisionSteps
      this.state = 'decision'
      this.players.forEach(player => {
        player.socket.emit('setup', this.manifold.summary)
      })
    }
  }

  decisionStep (): void {
    const choices1 = this.teams[1].choices
    const choices2 = this.teams[2].choices
    if (this.countdown === 0) {
      this.state = 'action'
      this.countdown = this.actionSteps
      choices1.forEach(choice => {
        const cell = this.manifold.cells[choice]
        if (choices2.includes(choice)) {
          cell.state = 3
          return
        }
        cell.state = 1
      })
      choices2.forEach(choice => {
        const cell = this.manifold.cells[choice]
        if (choices1.includes(choice)) {
          cell.state = 3
          return
        }
        cell.state = 2
      })
      return
    }
    this.countdown = Math.max(0, this.countdown - 1)
  }

  actionStep (): void {
    this.manifold.step()
    const cellCount1 = this.manifold.cells.filter(c => c.state === 1).length
    const cellCount2 = this.manifold.cells.filter(c => c.state === 2).length
    this.teams[1].score = cellCount1
    this.teams[2].score = cellCount2
    const score1 = this.teams[1].score
    const score2 = this.teams[2].score
    if (score1 > score2 && score1 > this.victoryScore) {
      this.teams[1].victory = true
    }
    if (score2 > score1 && score2 > this.victoryScore) {
      this.teams[2].victory = true
    }
    if (this.teams[1].victory || this.teams[2].victory) {
      this.state = 'victory'
      this.countdown = this.victorySteps
      return
    }
    this.countdown = Math.max(0, this.countdown - 1)
    if (this.countdown === 0 || cellCount1 + cellCount2 === 0) {
      this.state = 'decision'
      this.countdown = this.decisionSteps
      this.teams[1].choices = []
      this.teams[2].choices = []
    }
  }

  getSmallTeam (): number {
    const playerCount1 = this.getPlayerCount(1)
    const playerCount2 = this.getPlayerCount(2)
    if (playerCount2 > playerCount1) return 1
    if (playerCount1 > playerCount2) return 2
    return choose([1, 2])
  }

  getPlayerCount (team: number): number {
    const teamPlayers = this.players.filter(p => p.team === team)
    return teamPlayers.length
  }

  getBotChoice (): number {
    const openCells = this.manifold.cells.filter(c => c.state === 0)
    const options = openCells.map(c => c.index)
    return choose(options)
  }
}

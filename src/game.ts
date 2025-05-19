import { Manifold } from './manifold'
import { choose } from './math'
import { Player } from './player'
import { Server } from './server'
import { GameSummary } from './summaries/gameSummary'
import { Team } from './team'

// DONE:
// Red shapes more contiguous
// More red units
// Red unit Growth
// Red unit Destruction

// TO DO:
// Use ring color to indicate score (green, grey, blue)
// When all red are destroyed highest score wins

export class Game {
  server = new Server()
  manifold = new Manifold()
  teams: Record<number, Team> = {}
  players: Player[] = []
  token = String(Math.random())
  timeScale: number
  countdown: number
  maxCountdown: number
  decisionCount = 0
  maxReserve = 2
  victoryScore = 9999 // 50
  stepInterval = 0.5
  state = 'decision'
  decisionSteps = 15
  actionSteps = 4
  victorySteps = 15

  constructor () {
    this.teams[1] = new Team(1)
    this.teams[2] = new Team(2)
    this.setupIo()
    this.timeScale = this.server.config.timeScale
    this.maxCountdown = this.decisionSteps
    this.countdown = this.maxCountdown
    setInterval(() => this.step(), 1000 * this.stepInterval / this.timeScale)
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      const player = new Player(this, socket)
      this.players.push(player)
      console.log('connect:', socket.id)
      socket.emit('connected')
      socket.emit('setup', this.manifold.summary)
      socket.on('choices', (choices: number[]) => {
        if (this.state === 'decision') {
          const team = this.teams[player.team]
          team.choices = choices
        }
      })
      socket.on('ready', () => {
        const team = this.teams[player.team]
        if (this.state === 'decision') {
          team.ready = true
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
      this.action()
    } else if (this.state === 'decision') {
      this.decision()
    } else if (this.state === 'victory') {
      this.victory()
    }
    const summary1 = new GameSummary(1, this)
    const summary2 = new GameSummary(2, this)
    this.players.forEach(player => {
      const summary = player.team === 1 ? summary1 : summary2
      player.socket.emit('step', summary)
    })
  }

  action (): void {
    this.countdown = Math.max(0, this.countdown - 1)
    this.manifold.step()
    if (this.countdown === 0) {
      this.state = 'decision'
      this.countdown = this.decisionSteps
      this.maxCountdown = this.decisionSteps
      this.manifold.decay()
    }
    this.score()
  }

  decision (): void {
    if (this.teams[1].ready || this.teams[2].ready) {
      this.countdown = Math.max(0, this.countdown - 1)
    }
    const playerCount1 = this.getPlayerCount(1)
    const playerCount2 = this.getPlayerCount(2)
    const playerCount = playerCount1 + playerCount2
    const ready1 = this.teams[1].ready || playerCount1 === 0
    const ready2 = this.teams[2].ready || playerCount2 === 0
    const ready = ready1 && ready2 && playerCount > 0
    if (ready || this.countdown === 0) {
      this.deploy()
      this.teams[1].ready = false
      this.teams[2].ready = false
      this.state = 'action'
      this.countdown = this.actionSteps
      this.maxCountdown = this.actionSteps
    }
  }

  victory (): void {
    this.countdown = Math.max(0, this.countdown - 1)
    if (this.countdown === 0) {
      this.restart()
    }
  }

  deploy (): void {
    this.decisionCount += 1
    const choices1 = this.teams[1].choices
    const choices2 = this.teams[2].choices
    this.teams[1].oldChoices = [...choices1]
    this.teams[2].oldChoices = [...choices2]
    this.countdown = this.decisionSteps
    this.maxCountdown = this.actionSteps
    choices1.forEach(choice => {
      const cell = this.manifold.cells[choice]
      if (choices2.includes(choice)) {
        cell.state = 5
        return
      }
      cell.state = 1
    })
    choices2.forEach(choice => {
      const cell = this.manifold.cells[choice]
      if (choices1.includes(choice)) {
        cell.state = 5
        return
      }
      cell.state = 2
    })
    Object.values(this.teams).forEach(team => {
      team.reserve = team.reserve - team.choices.length
      team.choices = []
    })
    Object.values(this.teams).forEach(team => {
      team.reserve = this.maxReserve
    })
  }

  score (): void {
    const cellCount1 = this.manifold.cells.filter(c => c.state === 1).length
    const cellCount2 = this.manifold.cells.filter(c => c.state === 2).length
    this.teams[1].cells = cellCount1
    this.teams[2].cells = cellCount2
    if (cellCount1 > cellCount2) {
      this.teams[1].score += 1
      this.teams[2].score = 0
    }
    if (cellCount2 > cellCount1) {
      this.teams[1].score = 0
      this.teams[2].score += 1
    }
    const score1 = this.teams[1].score
    const score2 = this.teams[2].score
    if (score1 > score2 && score1 >= this.victoryScore) {
      this.teams[1].victory = true
    }
    if (score2 > score1 && score2 >= this.victoryScore) {
      this.teams[2].victory = true
    }
    if (this.teams[1].victory || this.teams[2].victory) {
      this.state = 'victory'
      this.countdown = this.victorySteps
    }
  }

  restart (): void {
    this.manifold = new Manifold()
    this.manifold.summary = this.manifold.summarize()
    this.teams[1] = new Team(1)
    this.teams[2] = new Team(2)
    this.players.forEach(player => {
      player.team = 0
    })
    this.players.forEach(player => {
      const smallTeam = this.getSmallTeam()
      player.team = smallTeam
    })
    this.countdown = this.decisionSteps
    this.decisionCount = 0
    this.state = 'decision'
    this.players.forEach(player => {
      player.socket.emit('setup', this.manifold.summary)
    })
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

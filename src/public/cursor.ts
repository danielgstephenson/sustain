import { Circle, Line, Svg, SVG } from '@svgdotjs/svg.js'
import { GameSummary } from '../summaries/gameSummary'

export class Cursor {
  cursorDiv = document.getElementById('cursorDiv') as HTMLDivElement
  horizontalLine: Line
  verticalLine: Line
  circle: Circle
  svg: Svg
  color1 = 'rgb(3, 184, 255)'
  color2 = 'rgb(3, 255, 37)'
  diameter = 90

  constructor () {
    this.svg = SVG()
    this.svg.addTo(this.cursorDiv)
    this.svg.size('100%', '100%')
    this.svg.viewbox(0, 0, 100, 100)
    this.verticalLine = this.svg.line(50, 40, 50, 60)
    this.verticalLine.stroke({ width: 2, color: 'white' })
    this.horizontalLine = this.svg.line(40, 50, 60, 50)
    this.horizontalLine.stroke({ width: 2, color: 'white' })
    this.circle = this.svg.circle(this.diameter)
    this.circle.center(50, 50)
    this.circle.fill({ opacity: 0 })
    this.circle.stroke({ width: 7, color: 'white', opacity: 0.5 })
    document.addEventListener('mousemove', (event) => {
      const x = event.clientX
      const y = event.clientY
      this.cursorDiv.style.transform = `translate3d(${x}px,${y}px,0)`
    })
  }

  onStep (game: GameSummary): void {
    const circumference = this.diameter * Math.PI
    const time = game.countdown / game.maxCountdown
    const difference = game.teams[2].cellCount - game.teams[1].cellCount
    const H = difference > 0 ? 120 : 220
    const S = 3 * Math.abs(difference)
    this.circle.stroke({
      dasharray: `${time * circumference} ${circumference}`,
      color: `hsl(${H}, ${S}%, 50%)`,
      opacity: game.state === 'victory' ? 0.75 : 0.5
    })
  }

  setTeam (team: number): void {
    const color = team === 1 ? this.color1 : this.color2
    this.horizontalLine.stroke({ color })
    this.verticalLine.stroke({ color })
  }
}

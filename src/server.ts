import express, { Express } from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server as SocketIoServer } from 'socket.io'
import { Config } from './config'

export class Server {
  config: Config
  app: Express
  httpServer: http.Server | https.Server
  io: SocketIoServer

  constructor () {
    this.config = new Config()
    this.app = express()
    const dirname = path.dirname(__filename)
    const staticPath = path.join(dirname, 'public')
    const staticMiddleware = express.static(staticPath)
    this.app.use(staticMiddleware)
    const clientHtmlPath = path.join(dirname, 'public', 'client.html')
    this.app.get('/', function (req, res) { res.sendFile(clientHtmlPath) })
    if (this.config.secure) {
      const keyPath = path.join(dirname, '../sis-key.pem')
      const certPath = path.join(dirname, '../sis-cert.pem')
      const key = fs.readFileSync(keyPath)
      const cert = fs.readFileSync(certPath)
      const credentials = { key, cert }
      this.httpServer = https.createServer(credentials, this.app as any)
    } else {
      this.httpServer = http.createServer(this.app as any)
    }
    this.io = new SocketIoServer(this.httpServer)
    this.io.path(staticPath)
    this.httpServer.listen(this.config.port, () => {
      console.log(`Listening on port ${this.config.port}`)
    })
  }
}

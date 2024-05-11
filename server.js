import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configPath = path.join(__dirname, 'config.json')
const fileExists = fs.existsSync(configPath)
const config = fileExists ? fs.readJSONSync(configPath) : {}
if (!fileExists) {
  if (config.port) config.port = process.env.PORT ?? 3000
  if (config.secure) config.secure = false
}
console.log(config)

const app = express()
const staticPath = path.join(__dirname, 'public')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)
const clientHtmlPath = path.join(__dirname, 'public', 'client.html')
app.get('/', function (req, res) { res.sendFile(clientHtmlPath) })
const socketIoPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')
app.get('/socketIo/:fileName', function (req, res) {
  const filePath = path.join(socketIoPath, req.params.fileName)
  res.sendFile(filePath)
})

function makeServer () {
  if (config.secure) {
    const key = fs.readFileSync('./sis-key.pem')
    const cert = fs.readFileSync('./sis-cert.pem')
    const credentials = { key, cert }
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

function makeIo (onListen) {
  const server = makeServer()
  const io = new Server(server)
  io.path(staticPath)
  server.listen(config.port, () => {
    console.log(`Listening on :${config.port}`)
    if (onListen) onListen()
  })
  return io
}

export { makeIo }

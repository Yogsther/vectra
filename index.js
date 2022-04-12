const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)
const fs = require('file-system')

app.use('/', express.static('dist'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dist/index.html')
})

let reminder_messages = [
  "Hey, did you forget to return the car? 🤔",
  "Ok, i'm starting to get a little angry. It's time to return the car.",
  "Why haven't you returned the car??",
  "BRUH, return the car!",
  "RETURN THE CAR ASSHOLE"
]

let config = JSON.parse(fs.readFileSync('config.json'))
var users = JSON.parse(fs.readFileSync('users.json'))
var history = JSON.parse(fs.readFileSync('history.json'))

var clients = {}

var status = {
  booked: false,
  key: null,
  date: new Date(),
  duration: '',
  name: '',
  notifications: [],
}

// Discord bot
const { Client, Intents } = require('discord.js')
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
})

client.once('ready', () => {
  log('Discord bot online')
  client.user.setActivity('vectra.okdev.se')
})

client.on('message', (message) => { })

client.login(config.discord_token)

function sendStatus(socketid) {
  var user = getUser(clients[socketid].key)
  let package = {
    booked: status.booked,
    name: status.name,
    clock:
      zeroPadd(status.date.getHours()) +
      ':' +
      zeroPadd(status.date.getMinutes()),
    duration: status.duration,
    returnTime: status.returnTime,
    isBooker: status.key == clients[socketid].key && status.key != null,
    toBeNotified: user && status.notifications.indexOf(user.discord) != -1,
  }

  io.to(socketid).emit('status', package)
}

function zeroPadd(num) {
  while (String(num).length < 2) num = '0' + num
  return num
}

function bookingStateChanged() {
  for (let id in clients) {
    sendStatus(id)
  }
}

function getUser(key) {
  for (let user of users) {
    if (user.key == key) return user
  }
}

function log(str) {
  let date = new Date()
  console.log(
    zeroPadd(date.getHours()) +
    ':' +
    zeroPadd(date.getMinutes()) +
    ' ' +
    date.getDate() +
    '/' +
    (date.getMonth() + 1) +
    ' ' +
    str,
  )
}

let reminderTimeout
let reminderInterval

io.on('connection', (socket) => {
  clients[socket.id] = { key: null }

  socket.on('book', (info) => {
    let user = getUser(info.key)
    if (user) {
      if (!status.booked) {
        status.booked = true
        status.key = user.key
        status.name = user.name
        status.date = new Date()
        status.duration = Date.now - info.time
        status.returnTime = info.time

        log(`${status.name} booked the car`)

        reminderTimeout = setTimeout(() => {
          let reminderIndex = 0
          client.users.fetch(user.discord, false).then((user) => {
            user.send('Hey! Did you forget to return the car? 🤔')
            log('Reminded ' + user.username + ' to return the car')
          })

          reminderInterval(() => {
            client.users.fetch(user.discord, false).then((user) => {
              let message = reminder_messages[reminderIndex]
              user.send(message)
              log('Reminded ' + user.username + ' to return the car (' + message + ')')
              reminderIndex++
              if (reminderIndex >= reminder_messages.length) reminderIndex = reminder_messages.length - 1
            })
            // 30 seconds
          }, 1000 * 30)

        }, status.returnTime - Date.now())

        bookingStateChanged()
      } else {
        socket.emit('Already booked')
      }
    } else {
      socket.emit('no_admin')
    }
  })

  socket.on('notify', (active) => {
    var user = getUser(clients[socket.id].key)
    if (user) {
      if (active) {
        if (status.notifications.indexOf(user.discord) == -1) {
          status.notifications.push(user.discord)
          sendStatus(socket.id)
          log(user.name + ' asked to be notified')
        }
      } else {
        // User wants to remove notification
        status.notifications.splice(
          status.notifications.indexOf(user.discord),
          1,
        )
        sendStatus(socket.id)
        log(user.name + ' revoked notification')
      }
    } else {
      socket.emit('no_admin')
    }
  })

  socket.on('parking_response', (response) => {
    let parked_user = getUser(clients[socket.id].key)

    if (parked_user && response.did_park) {
      for (let user of users) {
        if (user.name == 'Olle') {
          client.users.fetch(user.discord, false).then((user) => {
            // Message Olle
            user.send(parked_user.name + ' says they parked in a Garage today')
            log(parked_user.name + ' says they parked in a Garage today')
          })
        }
      }
    }
  })

  socket.on('return', () => {
    if (clients[socket.id].key == status.key) {
      if (Date.now() - status.date.getTime() > 1000 * 60) {
        history.push({
          name: status.name,
          from: status.date,
          to: new Date(),
        })
        fs.writeFileSync('history.json', JSON.stringify(history, null, 4))
      }

      // TODO Prevent Olle from seeing
      socket.emit('ask_for_parking')

      for (let discord of status.notifications) {
        client.users.fetch(discord, false).then((user) => {
          user.send('The car is avalible now.')
          log('Alerted discord user ' + user.username)
        })
      }

      status.notifications = []

      clearTimeout(reminderTimeout)

      log(status.name + ' returned the car')

      status.booked = false
      status.key = null
      bookingStateChanged()
    }
  })

  socket.on('login', (key) => {
    clients[socket.id].key = key
    sendStatus(socket.id)
  })

  socket.on('disconnect', () => {
    delete clients[socket.id]
  })
})

server.listen(config.port, () => {
  log('Started server on port ' + config.port)
})

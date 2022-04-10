var socket = io.connect()

var key = localStorage.getItem('key')

var info
/* var status = {
	booked: true,
	name: "Olle",
	clock: "23:52",
	duration: "Not sure",
	isBooker: true,
} */

var loginScreen = document.getElementById('loggin-in')
var bookingWindow = document.getElementById('booking-options')
var bookingWindowOpen = false
var bookButton = document.getElementById('status')
var notificationButton = document.getElementById('notification-button')
var notificationBell = document.getElementById('notification-icon')

setLoginStatus(false)

function setBookingWindowState(open) {
  /* if (open) document.getElementById("booking-time").value = "not sure how long" */
  // Get booking canvas inner height

  bookingWindowOpen = open
  if (open) {
    bookingWindow.classList.add('booking-options-open')
    bookingPosition = Date.now() + 60 * 60 * 1000
    oldBookingPosition = bookingPosition
    updateBookingPosition()
  } else bookingWindow.classList.remove('booking-options-open')
}

function toggleBookingWindow() {
  setBookingWindowState(bookingWindowOpen ? false : true)
}

function setLoginStatus(loggedIn) {
  loginScreen.style.display = loggedIn ? 'none' : 'flex'
}

function onBookButton() {
  if (!info.booked) toggleBookingWindow()
  if (info.isBooker) {
    socket.emit('return')
  }
}

socket.on('ask_for_parking', () => {
  let did_park = confirm(
    'Did you park in an Automatic Parking Garage? (AIMO PARK). Click "OK" if you did.',
  )
  socket.emit('parking_response', { did_park, key })
})

function confirmBooking() {
  socket.emit('book', {
    time: bookingPosition,
    key,
  })
}

let canvasDown = false
let canvasXStart = 0

function updateBookingPosition(x) {
  if (x) {
    let lowestAlloedValue = Date.now() + 30 * 60 * 1000
    let change = x - canvasXStart
    let proposedBookingPosition = oldBookingPosition - change * 50000
    if (proposedBookingPosition < lowestAlloedValue)
      proposedBookingPosition = lowestAlloedValue
    bookingPosition = proposedBookingPosition
  }

  let button = document.getElementById('start-booking')
  let bookingTime = bookingPosition - Date.now()
  // get hours and minutes
  let hours = Math.floor(bookingTime / (60 * 60 * 1000))
  let minutes = Math.floor((bookingTime - hours * 60 * 60 * 1000) / (60 * 1000))
  // Make sure minutes is always two digits
  if (minutes < 10) minutes = '0' + minutes

  let time = ''
  if (hours > 0) time += hours + 'h '
  time += minutes + 'm'

  button.innerText = `Book for ${time}`
  renderCanvas()
}

function confirmBookingPosition() {
  oldBookingPosition = bookingPosition
}

// booking canvas touch move
document
  .getElementById('booking-canvas')
  .addEventListener('touchmove', function (e) {
    e.preventDefault()
    var touch = e.touches[0]
    var x = touch.clientX
    var rect = this.getBoundingClientRect()
    var x = x - rect.left
    updateBookingPosition(x)
  })

// toucn end
document
  .getElementById('booking-canvas')
  .addEventListener('touchend', function (e) {
    e.preventDefault()
    confirmBookingPosition()
  })

// Add touch support to mousedownovercanvas
document
  .getElementById('booking-canvas')
  .addEventListener('touchstart', function (e) {
    e.preventDefault()
    var touch = e.touches[0]
    var x = touch.clientX
    var rect = this.getBoundingClientRect()
    var x = x - rect.left

    canvasDown = true
    canvasXStart = x
  })

document.getElementById('booking-canvas').addEventListener('mousedown', (e) => {
  // Get mouse x position on canvas
  var rect = document.getElementById('booking-canvas').getBoundingClientRect()
  var x = e.clientX - rect.left
  canvasDown = true
  canvasXStart = x
})

document.getElementById('booking-canvas').addEventListener('mouseup', (e) => {
  confirmBookingPosition()
  canvasDown = false
})

document.getElementById('booking-canvas').addEventListener('mousemove', (e) => {
  if (canvasDown) {
    var rect = document.getElementById('booking-canvas').getBoundingClientRect()
    var x = e.clientX - rect.left
    updateBookingPosition(x)
  }
})

let arrow = new Image()
arrow.src = './img/arrow.png'
arrow.onload = function () {
  renderCanvas()
}

let bookingPosition = Date.now()
let oldBookingPosition = bookingPosition

renderCanvas()
function renderCanvas() {
  // grab booking canvas
  var canvas = document.getElementById('booking-canvas')

  // get canvas ctx
  var ctx = canvas.getContext('2d')
  // get canvas width and height
  var width = canvas.width
  var height = canvas.height

  // clear canvas rect
  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#0eee8c'
  // set line width to 5
  ctx.lineWidth = 2

  let zoom = 30000
  let padding = 50

  ctx.fillStyle = '#262626'
  let start = timeToX(Date.now())
  let end = timeToX(bookingPosition)
  ctx.fillRect(start, 0, end - start, height)

  function timeToX(time) {
    return (time - bookingPosition) / zoom + width / 2
  }

  function xToTime(x) {
    return (x - width / 2) * zoom + bookingPosition
  }

  let startTime = xToTime(-50)
  // set start time to the closest whole hour
  startTime = Math.floor(startTime / 3600000) * 3600000
  let time = startTime
  ctx.fillStyle = '#004628'
  while (true) {
    let x = timeToX(time)

    // Get string today, tommorow, or date
    let date = new Date(time)
    let day = date.getDay()
    let dayString =
      day == 0
        ? 'Söndag'
        : day == 1
        ? 'Måndag'
        : day == 2
        ? 'Tisdag'
        : day == 3
        ? 'Onsdag'
        : day == 4
        ? 'Torsdag'
        : day == 5
        ? 'Fredag'
        : 'Lördag'

    // Set daystring to Today if it's today
    if (day == new Date().getDay()) dayString = 'Idag'

    // Write white text on canvas
    ctx.font = '20px HomepageBaukasten'
    ctx.fillStyle = 'grey'

    // Get time hour
    let hour = new Date(time).getHours()
    ctx.fillText(hour, x + 15, 25)

    // Draw day
    ctx.font = '15px HomepageBaukasten'
    ctx.fillStyle = 'grey'
    ctx.fillText(dayString, x + 15, 45)
    // Draw line
    ctx.fillRect(x, 0, 3, height)

    // Add one hour to time
    time += 3600000

    if (x > width + padding) break
  }

  ctx.fillStyle = 'white'
  ctx.fillRect(timeToX(Date.now()), 0, 3, height)

  ctx.fillStyle = '#0eee8c'

  let arrowLineWidth = 5
  ctx.fillRect(
    start,
    height / 2 - arrowLineWidth / 2,
    end - 5 - start,
    arrowLineWidth,
  )
  ctx.drawImage(arrow, timeToX(bookingPosition) - 36, height / 2 - 25, 50, 50)
}

function notificationButtonPressed() {
  socket.emit('notify', !info.toBeNotified)
}

/**
 * @param {*} visible If the button is visible
 * @param {*} active If the notification is active
 */
function setNotificationBell(visible, active) {
  notificationButton.style.display = visible ? 'block' : 'none'
  notificationBell.innerHTML = active
    ? `<path d="M0 0h24v24H0z" fill = "none" /> <path d="M7.58 4.08L6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42zM18 11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2v-5zm-6 11c.14 0 .27-.01.4-.04.65-.14 1.18-.58 1.44-1.18.1-.24.15-.5.15-.78h-4c.01 1.1.9 2 2.01 2z" />`
    : `<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/> `
}

socket.on('connect', () => {
  socket.emit('login', key)
  setLoginStatus(true)
})

socket.on('disconnect', () => {
  setLoginStatus(false)
})

socket.on('status', (pack) => {
  info = pack
  onStatus()
})

function setBookButtonStatus(booked) {
  if (booked) bookButton.classList.add('return')
  else bookButton.classList.remove('return')

  bookButton.innerText = booked ? 'RETURN' : 'BOOK'
}

function setBookButtonVisible(visible) {
  bookButton.style.display = visible ? 'block' : 'none'
}

function onStatus() {
  if (!info.booked || info.isBooker) setNotificationBell(false, false)
  else if (info.booked) setNotificationBell(true, info.toBeNotified)

  if (info.booked && bookingWindowOpen) setBookingWindowState(false)
  if (!info.booked) {
    setBookButtonStatus(false)
    setBookButtonVisible(true)
  }
  if (info.booked) {
    if (info.isBooker) {
      setBookButtonVisible(true)
      setBookButtonStatus(true)
    } else {
      setBookButtonVisible(false)
    }
  }

  updateReturnTime()
}

setInterval(() => {
  updateReturnTime()
}, 1000)

function updateReturnTime() {
  if (!info) return
  if (info.booked) {
    let timeLeft = info.returnTime - Date.now()
    if (timeLeft < 0) timeLeft = 0
    let hours = Math.floor(timeLeft / 3600000)
    let minutes = Math.floor((timeLeft % 3600000) / 60000)

    let timeString = hours > 0 ? `${hours}h, ${minutes}m` : `${minutes}m`

    // Create string bookingTime from info.endTime
    let bookingTime = new Date(info.returnTime).toLocaleString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    })

    setStatusText(
      'Booked from ' + info.clock + ' to ' + bookingTime + ' by ' + info.name,
      'Back in about ' + timeString,
    )
  } else {
    setStatusText('Ready to book', '')
  }
}

function setStatusText(top, bottom) {
  document.getElementById('booked-top').innerText = top
  document.getElementById('booked-by-name').innerText = bottom
}

socket.on('message', (msg) => {
  alert(msg)
  location.reload()
})

socket.on('no_admin', () => {
  let key = prompt('Enter key')
  localStorage.setItem('key', key)
  location.reload()
  return
})

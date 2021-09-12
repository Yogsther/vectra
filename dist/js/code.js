var socket = io.connect()

var key = localStorage.getItem("key")

var info;
/* var status = {
    booked: true,
    name: "Olle",
    clock: "23:52",
    duration: "Not sure",
    isBooker: true,
} */

var loginScreen = document.getElementById("loggin-in")
var bookingWindow = document.getElementById("booking-options")
var bookingWindowOpen = false;
var bookButton = document.getElementById("status")
var notificationButton = document.getElementById("notification-button")
var notificationBell = document.getElementById("notification-icon")

setLoginStatus(false)


function setBookingWindowState(open) {
    if (open) document.getElementById("booking-time").value = "not sure how long"
    bookingWindowOpen = open;
    bookingWindow.style.height = open ? "190px" : "0px"
}

function toggleBookingWindow() {
    setBookingWindowState(bookingWindowOpen ? false : true)
}

function setLoginStatus(loggedIn) {
    loginScreen.style.display = loggedIn ? "none" : "flex"
}

function onBookButton() {
    if (!info.booked) toggleBookingWindow()
    if (info.isBooker) {
        socket.emit("return")
    }
}

function confirmBooking() {
    socket.emit("book",
        {
            time: document.getElementById("booking-time").value,
            key
        })
}

function notificationButtonPressed() {
    socket.emit("notify", !info.toBeNotified)
}

/**
 * @param {*} visible If the button is visible 
 * @param {*} active If the notification is active
 */
function setNotificationBell(visible, active) {
    notificationButton.style.display = visible ? "block" : "none"
    notificationBell.innerHTML = active ? `<path d="M0 0h24v24H0z" fill="none"/><path d="M7.58 4.08L6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42zM18 11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2v-5zm-6 11c.14 0 .27-.01.4-.04.65-.14 1.18-.58 1.44-1.18.1-.24.15-.5.15-.78h-4c.01 1.1.9 2 2.01 2z"/>` : `<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />`
}

socket.on("connect", () => {
    socket.emit("login", key)
    setLoginStatus(true)
})

socket.on("disconnect", () => {
    setLoginStatus(false)
})

socket.on("status", pack => {
    info = pack;
    onStatus()
})

function setBookButtonStatus(booked) {
    if (booked)
        bookButton.classList.add("return")
    else
        bookButton.classList.remove("return")

    bookButton.innerText = booked ? "RETURN" : "BOOK"

}

function setBookButtonVisible(visible) {
    bookButton.style.display = visible ? "block" : "none"
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

    if (info.booked) {
        setStatusText("Car is currently booked from " + info.clock + " by", info.name + ", " + info.duration)
    } else {
        setStatusText("Ready to book", "")
    }
}

function setStatusText(top, bottom) {
    document.getElementById("booked-top").innerText = top;
    document.getElementById("booked-by-name").innerText = bottom;
}

socket.on("message", msg => {
    alert(msg)
    location.reload()
})

socket.on("no_admin", () => {

    let key = prompt("Enter key")
    localStorage.setItem("key", key)
    location.reload()
    return

})

const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users')

const app = express()
//const server = http.createServer(app)
//const io = socketio(server)


const PORT = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


/**
 * Console which port server is listening to
 */
const server = app.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
});
 
// const server = http.createServer(app);
socketio.listen(server);
 
// Setup Socket.io with raw HTTP server
const io = socketio(server);
 
 
// Set up some message when socket.io gets 'connectoion' event
io.on('connection', (socket) => {
    console.log('New WebSocket connection')



    socket.on('join', ({ username, room }, callback) => { 

        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Welcome ${user.username}`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined `))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

     socket.on('sendLocation', (coords, callback) => {
         const user = getUser(socket.id)
        io.to(user.room).emit('locmessage', generateLocationMessage(user.username, `https://www.google.com/maps/?q=${coords.latitude},${coords.longitude}`))
        callback()
    }) 
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
             io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
             io.to(user.room).emit('roomData', {
                 room: user.room,
                 users: getUsersInRoom(user.room)
             })
        }      
    })

  
})
const express = require('express');
const path = require('path');
const socket = require('socket.io');

const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log('Listening on port ' + port);
});

const io = socket(server);

const rooms = {}

io.on('connection', (socket) => {
    console.log('New Connection: ' + socket.id);
    socket.emit('connected', {sid: socket.id});
    socket.on('mouse', (data) => {
        socket.broadcast.emit('mouse', data);
    })
    socket.on('clear', () => {
        socket.broadcast.emit('clear');
    })
});

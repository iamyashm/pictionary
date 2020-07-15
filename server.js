const express = require('express');
const path = require('path');
const socket = require('socket.io');

const {v4: uuidv4} = require('uuid');

const app = express();

// Room to socket list mapping
const rooms = {}

// Maps a socket ID to a player object
const socketToPlayer = {}

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(express.json());


const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log('Listening on port ' + port);
});
const io = socket(server);


// @route POST /join
// @desc Join a room
// @access Public
app.post('/join', (req, res) => {
    let roomId = req.body.roomId;
    let socketId = req.body.socketId;
    let name = req.body.name;
    if (!socketId in socketToPlayer) return res.status(400).json({msg: 'Bad request'}); // If player socket not connected
    
    // Return error if player is already in a room
    if (socketToPlayer[socketId].roomId != null) return res.status(400).json({msg: 'Already in a game'});

    //Checking if roomId is valid and player is not in room
    if (roomId in rooms) {
        if (rooms[roomId].includes(socketId))  return res.status(400).json({msg: 'Already in room'});
        socketToPlayer[socketId].name = name;
        socketToPlayer[socketId].roomId = roomId;
        socketToPlayer[socketId].playerId = rooms[roomId].length + 1;
        rooms[roomId].push(socketId);
        io.sockets.connected[socketId].join(roomId);    
        playerList = []
        for (let sId of rooms[roomId]) 
            playerList.push(socketToPlayer[sId]); //Join socket room
        io.to(roomId).emit('newJoin', {playerList: playerList}); // Notify players in room about new join
        return res.json({user: socketToPlayer[socketId].toJson(), roomId: roomId});
    }
    else return res.status(404).json({msg: 'Room does not exist'});
});


// @route POST /create
// @desc Create new room
// @access Public
app.post('/create', (req, res) => {
    let socketId = req.body.socketId;
    let name = req.body.name;

    // If player socket not connected
    if (!socketId in socketToPlayer) return res.status(400).json({msg: 'Bad request'}); 

    // Return error if player is already in a room
    if (socketToPlayer[socketId].roomId !== null) return res.status(400).json({msg: 'Already in a game'});

    let roomId = uuidv4();
    socketToPlayer[socketId].name = name;
    socketToPlayer[socketId].roomId = roomId;
    socketToPlayer[socketId].playerId = 1;
    socketToPlayer[socketId].isHost = true; 
    rooms[roomId] = [socketId];
    io.sockets.connected[socketId].join(roomId);  // Join socket room
    io.to(roomId).emit('newJoin', {playerList: [socketToPlayer[socketId]]}); // Notify players in room about new join
    return res.json({user: socketToPlayer[socketId].toJson(), roomId: roomId});
});


io.on('connection', (socket) => {
    console.log('New Connection: ' + socket.id);
    socketToPlayer[socket.id] =  new Player(null, 0, socket.id);

    socket.on('startGame', () => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('startGame');
    });

    //Client drawing on canvas
    socket.on('mouse', (data) => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('mouse', data);
    });

    //Client clearing canvas
    socket.on('clear', () => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('clear');
    });

    socket.on('chatMessage', (data) => {
        io.to(socketToPlayer[socket.id].roomId).emit('chatMessage', {
            name: data.name, 
            message: data.message, 
            timestamp: new Date().getTime()
        });
    });

    socket.on('disconnect', () => {
        let roomId = socketToPlayer[socket.id].roomId;
        socket.leave(roomId);
        io.to(roomId).emit('playerDisconnected', {id: socket.id});
    });


});

class Game {
    constructor(roomId, currRound, currPlayer) {
        this.roomId = roomId;
        this.currRound = currRound;
        this.currPlayer = currPlayer;
    }
}

class Player {
    constructor(name, id, socketId, roomId=null, isHost=false) {
        this.name = name;
        this.playerId = id;
        this.socketId = socketId;
        this.roomId = roomId;
        this.isHost = isHost;
    }

    toJson() {
        return {
            name: this.name, 
            playerId: this.playerId,
            socketId: this.socketId,
            roomId: this.roomId,
            isHost: this.isHost
        };
    }
}
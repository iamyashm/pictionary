const express = require('express');
const path = require('path');
const socket = require('socket.io');
const {v4: uuidv4} = require('uuid');
const fs = require('fs');

const app = express();

// Room to socket list mapping
const rooms = {}

// Maps a socket ID to a player object
const socketToPlayer = {}

// Maps room ID to game instance
const roomToGame = {}

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
        socketToPlayer[socketId].setValues(name, roomId, rooms[roomId].length + 1);
        rooms[roomId].push(socketId);
        io.sockets.connected[socketId].join(roomId);    
        playerList = []
        for (let sId of rooms[roomId]) 
            playerList.push(socketToPlayer[sId]); //Join socket room
        roomToGame[roomId].numPlayers += 1;
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
    
    // Create new game instance
    roomToGame[roomId] = new Game(socketToPlayer[socketId]);
    roomToGame[roomId].numPlayers += 1;

    socketToPlayer[socketId].setValues(name, roomId, 1, true);
    rooms[roomId] = [socketId];
    io.sockets.connected[socketId].join(roomId);  // Join socket room
    io.to(roomId).emit('newJoin', {playerList: [socketToPlayer[socketId]]}); // Notify players in room about new join
    return res.json({user: socketToPlayer[socketId].toJson(), roomId: roomId});
});

var rawdata = fs.readFileSync('wordlist.json');
var wordlist = JSON.parse(rawdata)['words'];

io.on('connection', (socket) => {
    console.log('New Connection: ' + socket.id);
    socketToPlayer[socket.id] =  new Player(null, 0, socket.id);

    // Host starts game
    socket.on('startGame', () => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('startGame');
    });

    // Client drawing on canvas
    socket.on('mouse', (data) => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('mouse', data);
    });

    // Client clearing canvas
    socket.on('clear', () => {
        socket.broadcast.to(socketToPlayer[socket.id].roomId).emit('clear');
    });

    // New guess message
    socket.on('chatMessage', (data) => {
        let roomId = socketToPlayer[socket.id].roomId;
        let isCorrect = false;
        // Checking if guess was correct
        if (roomToGame[roomId].currWord === data.message) {
            if (!roomToGame[roomId].hasGuessed(socket.id) &&
            socketToPlayer[socket.id].playerId !== roomToGame[roomId].currPlayer) {
                isCorrect = true;
                socketToPlayer[socket.id].incrementScore(1);
                roomToGame[roomId].addCorrectGuesser(socket.id);
                io.to(roomId).emit('correctGuess', {game: roomToGame[roomId].toJson(), userId: socket.id, increment: 1, user: socketToPlayer[socket.id]});

                // Everyone has guessed the word, TODO: or time over
                if (roomToGame[roomId].correctGuess.length === rooms[roomId].length - 1) {
                    let correctWord = roomToGame[roomId].currWord;
                    roomToGame[roomId].nextPlayer();
                    io.to(roomId).emit('showRoundStats', {game: roomToGame[roomId].toJson(), correctWord: correctWord});
                }
            }
        }

        // Broadcast guess to all players if not correct
        if (!isCorrect) {
            io.to(roomId).emit('chatMessage', {
                name: data.name, 
                message: data.message, 
                timestamp: new Date().getTime()
            });
        }
    });

    //New game beginning
    socket.on('beginRound', (data) => {
        roomToGame[data.roomId].nextPlayer();
        io.to(data.roomId).emit('gameUpdate', {game: roomToGame[data.roomId].toJson()});
    });

    // Client disconnected
    socket.on('disconnect', () => {
        let roomId = socketToPlayer[socket.id].roomId;
        socket.leave(roomId);
        io.to(roomId).emit('playerDisconnected', {id: socket.id});
    });


});

class Game {
    constructor(currRound, currPlayer, host) {
        this.currRound = 0;
        this.currPlayer = 0;
        this.currWord = null;
        this.correctGuess = null;
        this.host = host;
        this.numPlayers = 0;
    }

    setRandomWord() {
        // TODO: random words api or something
        let words = ['hat', 'cat', 'dog', 'house', 'car', 'sun', 'moon', 'orange']; //test data
        let rndIndex = Math.floor(Math.random() * words.length);
        return words[rndIndex];
    }

    nextPlayer() {
        this.correctGuess = [];
        this.currWord = this.setRandomWord();
        this.currPlayer += 1;
        if (this.currPlayer > this.numPlayers) {
            this.currPlayer = 1;
            this.currRound += 1;
        }
    }

    hasGuessed(socketId) {
        if (this.correctGuess && this.correctGuess.includes(socketId))
            return true;
        return false;
    }

    setCurrPlayer(player) {
        this.currPlayer = player;
    }

    setCurrWord(word) {
        this.currWord = word;
    }

    addCorrectGuesser(player) {
        this.correctGuess.push(player);
    }

    toJson() {
        return {
            currRound: this.currRound,
            currPlayer: this.currPlayer,
            host: this.host,
            currWord: this.currWord,
            correctGuess: this.correctGuess
        }
    }
}

class Player {
    constructor(name, id, socketId) {
        this.name = name;
        this.playerId = id;
        this.socketId = socketId;
        this.roomId = null;
        this.isHost = false;
        this.score = 0;
    }

    setValues(name, room, playerId, isHost=false) {
        this.name = name;
        this.roomId = room;
        this.playerId = playerId;
        this.isHost = isHost;
    }

    incrementScore(value) {
        this.score += value;
    }

    toJson() {
        return {
            name: this.name, 
            playerId: this.playerId,
            socketId: this.socketId,
            roomId: this.roomId,
            isHost: this.isHost,
            score: this.score
        };
    }
}
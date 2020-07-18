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

var rawdata = fs.readFileSync('wordlist.json');
var wordlist = JSON.parse(rawdata)['words'];

// Function that shuffles the input array. Source: https://stackoverflow.com/a/2450976
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
}
  
  
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

// @route GET /words
// @desc Get 3 random words
// @access Public
app.get('/words', (req, res) => {
    shuffle(wordlist);
    res.json({words: [wordlist[3], wordlist[197], wordlist[1071]]}); // Selecting 3 elements, choice of index is arbitrary
});


if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}


io.on('connection', (socket) => {
    console.log('New Connection: ' + socket.id);
    socketToPlayer[socket.id] =  new Player(null, 0, socket.id);

    // Host starts game
    socket.on('startGame', () => {
        let roomId = socketToPlayer[socket.id].roomId;
        if (roomToGame[roomId].numPlayers > 1)
            io.to(roomId).emit('startGame');
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
        if (roomToGame[roomId].currWord.toLowerCase() === data.message.toLowerCase()) {
            if (!roomToGame[roomId].hasGuessed(socket.id) &&
            socketToPlayer[socket.id].playerId !== roomToGame[roomId].currPlayer) {
                isCorrect = true;
                socketToPlayer[socket.id].incrementScore(1);
                roomToGame[roomId].addCorrectGuesser(socket.id);
                io.to(roomId).emit('correctGuess', {game: roomToGame[roomId].toJson(), userId: socket.id, user: socketToPlayer[socket.id]});

                // Everyone has guessed the word
                if (roomToGame[roomId].correctGuess.length === rooms[roomId].length - 1) {
                    let correctWord = roomToGame[roomId].currWord;
                    io.to(roomId).emit('showRoundStats', {
                        correctWord: correctWord, msg: 'All players guessed the word!'});
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

    // New round beginning
    socket.on('nextRound', (data) => {
        roomToGame[data.roomId].nextPlayer();
    
        // End game after 3 rounds, show leaderboard
        if (roomToGame[data.roomId].currRound >= 4) {
            io.to(data.roomId).emit('leaderboard');

            // Clear room data for players
            for (p of rooms[data.roomId])
                socketToPlayer[p].reset();
            delete rooms[data.roomId];
            delete roomToGame[data.roomId];

        }
        else {
            let artist;
            for (let p of rooms[data.roomId]) {
                if (socketToPlayer[p].playerId === roomToGame[data.roomId].currPlayer) {
                    artist = socketToPlayer[p].name;
                    break;
                }
            }
            io.to(data.roomId).emit('beginRound', {game: roomToGame[data.roomId].toJson(), artist: artist});
        }
    });

    // Word selected
    socket.on('wordSelected', (data) => {
        roomToGame[data.roomId].setCurrWord(data.word);
        io.to(data.roomId).emit('beginDraw', {game: roomToGame[data.roomId].toJson()});
    });
    
    // Timer update 
    socket.on('timerUpdate', (data) => {
        socket.broadcast.to(data.roomId).emit('timerUpdate');
    });

    socket.on('timeUp', (data) => {
        let correctWord = roomToGame[data.roomId].currWord;
        io.to(data.roomId).emit('showRoundStats', { correctWord: correctWord, msg: 'Time Up!'})
    });

    // Client disconnected
    socket.on('disconnect', () => {
        let roomId = socketToPlayer[socket.id].roomId;
        let name = socketToPlayer[socket.id].name;
        if (roomId) {
            rooms[roomId] = rooms[roomId].filter(user => {
                return user !== socket.id;
            });
            socket.leave(roomId);
            if (rooms[roomId].length < 2) {
                for (let player of rooms[roomId]) 
                    socketToPlayer[player].roomId = null;
                
                delete rooms[roomId];
                io.to(roomId).emit('endgame');
            }
            else {
                
                io.to(roomId).emit('playerDisconnected', {id: socket.id});
                io.to(roomId).emit('chatMessage', {
                    name: 'Server', 
                    message: name + ' has disconnected.', 
                    timestamp: new Date().getTime()
                });
                
                // Add disconnected player to skip list
                roomToGame[roomId].addSkip(socketToPlayer[socket.id].playerId, socket.id);

                // If the player currently drawing disconnects, change turns
                if (roomToGame[roomId].currPlayer === socketToPlayer[socket.id].playerId) {
                    roomToGame[roomId].nextPlayer();
                    let artist;
                    for (let p of rooms[roomId]) {
                        if (socketToPlayer[p].playerId === roomToGame[roomId].currPlayer) {
                            artist = socketToPlayer[p].name;
                            break;
                        }
                    }
                    io.to(roomId).emit('beginRound', {game: roomToGame[roomId].toJson(), artist: artist});
                }
            }
        }
        delete socketToPlayer[socket.id];
    });


});

class Game {
    constructor(currRound, currPlayer, host) {
        this.currRound = 1;
        this.currPlayer = 0;
        this.currWord = null;
        this.correctGuess = null;
        this.host = host;
        this.skipList = []
        this.numPlayers = 0;
    }

    nextPlayer() {
        this.correctGuess = [];
        this.currPlayer += 1;
        if (this.currPlayer > this.numPlayers) {
            this.currRound += 1;
            this.currPlayer %= this.numPlayers;
        }
        while (this.skipList.includes(this.currPlayer)) {
            this.currPlayer += 1;
            if (this.currPlayer > this.numPlayers) {
                this.currRound += 1;
                this.currPlayer %= this.numPlayers;
            }
        }
    }

    hasGuessed(socketId) {
        if (this.correctGuess && this.correctGuess.includes(socketId))
            return true;
        return false;
    }
    
    addSkip(id, sId) {
        this.skipList.push(id);
        this.correctGuess.filter(s => {
            return s !== sId;
        })
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

    reset() {
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.score = 0;
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
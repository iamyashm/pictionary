import React, { Component } from 'react'
import p5 from 'p5';
import 'font-awesome/css/font-awesome.min.css';
import socket from '../service/socket';
import '../styles/Game.css';
import { Redirect } from 'react-router-dom';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import Person from '@material-ui/icons/Person';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import IconButton from '@material-ui/core/IconButton';
import CreateIcon from '@material-ui/icons/Create';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { green } from '@material-ui/core/colors';
import axios from 'axios';


export class Game extends Component {
    
    constructor(props) {
        super(props)
        this.myRef = React.createRef()
    }

    state = {
        redirectToHome: false,
        input: '',
        chats: [],
        correctGuesses: [],
        game: null
    }

    componentDidMount() {
        if (this.props.user === null) { 
            this.setState({
                redirectToHome: true
            });
        }
        else {
            this.myP5 = new p5(this.Sketch, this.myRef.current);

            if (this.props.user.isHost)
                socket.emit('nextRound', {roomId: this.props.roomId});

            socket.on('chatMessage', (data) => {
                this.setState({
                    chats: [...this.state.chats, [data.name, data.message, data.timestamp]]
                });
            });
    
            socket.on('correctGuess', (data) => {
                this.props.updatePlayer(data.userId, data.increment);
                this.setState({
                    correctGuesses: [...this.state.correctGuesses, data.user],
                    game: data.game
                });
            });
            
        }
    }

    handleChange = (e) => {
        this.setState({
            input: e.target.value
        });
    }

    handleSubmit = (e) => {
        if (e.target.value.trim() !== '' && e.key === 'Enter') {
            socket.emit('chatMessage', {name: this.props.user.name, message: this.state.input.trim()});
            this.setState({
                input: ''
            });
        }
    }

    scrollToBottom = () => {
        this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    }
      
      
    componentDidUpdate() {
        this.scrollToBottom();
    }

      Sketch = (p) => {
        
        let colorInput, weight;
        let loading = true;
        let gameState = 'WORD_SELECT';
        let wordlist = [];
        let startFrame;
        let time, time2;

        let checkUser = () => {
            return this.state.game !== null && 
            ( this.props.user.playerId === this.state.game.currPlayer);
        }

        p.setup = () => {
            p.createCanvas(800, 700);
            p.background(255);
            p.textAlign(p.CENTER);

            colorInput = document.getElementById('color');
            weight = document.getElementById('weight');
            
            socket.on('mouse', (data) => {
                p.stroke(data.color);
                p.strokeWeight(data.weight);
                p.line(data.x, data.y, data.px, data.py);
            });

            socket.on('clear', () => {
                p.background(255);
            });

            socket.on('beginRound', async (data) => {
                loading = false;
                this.setState({
                    game: data.game,
                    correctGuesses: []
                });
                if (checkUser()) {
                    let response = await axios.get('/words');
                    wordlist = response.data.words;
                }
                gameState = 'WORD_SELECT';
                p.background(255);
                p.noStroke();
                p.fill(0);
                p.textSize(30);
                if (checkUser()) {
                    p.text('Choose a word to draw:', 400, 250);
                    for (let i = 0; i < 3; i++) {
                        p.text((i + 1) + '. ' + wordlist[i], 400, 320 + 70 * i);
                    }
                }   
                else {
                    p.text(this.props.playerList[data.game.currPlayer - 1].name + ' is selecting a word...', 400, 250);
                }
                
            });

            socket.on('beginDraw', (data) => {
                this.setState({
                    game: data.game
                });
                p.background(255);
                gameState = 'DRAWING';
                let word = '';
                if (checkUser()) word = data.game.currWord;
                else {
                    word = data.game.currWord.replace(/\s/gi, "\xa0 \xa0").replace(/[a-zA-Z]/gi, "_ "); 
                }
                setHeader(word);
                startFrame = p.frameCount;
                time = 5;
            });

            socket.on('showRoundStats', (data) => {
                setHeader();
                p.background(255);
                p.noStroke();
                p.fill(0);
                p.textSize(30);
                p.text(data.msg, 400, 250);
                p.text('The word was: ' + data.correctWord, 400, 300);
                time = 5;
                gameState = 'SHOW_STATS';
                startFrame = p.frameCount;
                time2 = 5;
            });

            socket.on('timerUpdate', () => {
                updateTimer();
            });
        }

        let setHeader = (word='') => {
            p.fill(200);
            p.strokeWeight(3);
            p.rect(0, 0, 800, 70);
            p.noStroke();
            p.fill(0);
            p.textSize(35);
            p.text(word, 400, 50);
        }
    
        p.mouseClicked = () => {
            if (gameState === 'WORD_SELECT' && checkUser()) {
                let selection = null;
                if (p.mouseX > 250 && p.mouseX < 550) {
                    if (p.mouseY >= 290 && p.mouseY <= 330) {
                        selection = wordlist[0];
                    }
                    else if (p.mouseY >= 360 && p.mouseY <= 400) {
                        selection = wordlist[1];
                    }
                    else if (p.mouseY >= 430 && p.mouseY <= 470) {
                        selection = wordlist[2];;
                    }
                }
                if (selection !== null) {
                    p.cursor(p.ARROW);
                    socket.emit('wordSelected', {word: selection, roomId: this.props.roomId});
                }
            }
        }

        let updateTimer = () => {
            time -= 1;
            p.fill(200);
            p.noStroke();
            p.rect(0, 0, 70, 70);
            p.textSize(35);
            p.fill(0);
            p.text(time, 35, 35);
        }

        p.draw = () => {
            if (loading === true) {
                p.background(255);
                p.noStroke();
                p.fill(0);
                p.textSize(35);
                p.text('Loading....', 220, 250);
            }

            else if (gameState === 'WORD_SELECT') {
                if (p.mouseX > 250 && p.mouseX <= 550 && p.mouseY >= 290 && p.mouseY <=470)
                    p.cursor(p.HAND);
                else
                    p.cursor(p.ARROW);
            }

            else if (gameState === 'DRAWING' && checkUser()) {
                if (time === 0) {
                    socket.emit('timeUp', {roomId: this.props.roomId});
                }
                else if ((p.frameCount - startFrame) % 60 === 0) {
                    updateTimer(time);
                    socket.emit('timerUpdate', {roomId: this.props.roomId});
                }
                if (p.mouseIsPressed) {
                    var data = {
                        x: p.mouseX, 
                        y: p.mouseY,
                        px: p.pmouseX,
                        py: p.pmouseY,
                        color: colorInput.value,
                        weight: weight.value
                    }
                    if (p.mouseY > 72 && p.pmouseY  > 72 ) {
                        socket.emit('mouse', data);
                        p.stroke(colorInput.value);
                        p.strokeWeight(weight.value);
                        p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
                    }
                }
            }

            else if (gameState === 'TRANSITION') {
                p.background(255);
            }

            else if (gameState === 'SHOW_STATS') {
                if ((p.frameCount - startFrame) % 60 === 0) {
                    time2 -= 1;
                    if (time2 === 0 && checkUser()) {
                        gameState = 'TRANSITION';
                        socket.emit('nextRound', {userId: this.props.user.name, roomId: this.props.roomId});
                    }
                }
            }
        }

        document.getElementById('clear').addEventListener('click', () => {
            if (gameState === 'DRAWING' && checkUser()) {
                p.background(255);
                socket.emit('clear');
            }
        });
        
      }

    
    render() {
        
        if (this.state.redirectToHome) return <Redirect to="/" /> 
        let playerList = this.props.playerList.map(player => {
            return (
                <ListItem key={player.socketId}>
                    <ListItemAvatar>
                    <Avatar>
                        <Person color="disabled"/>
                    </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={player.name} secondary={"Score: " + player.score} 
                        secondaryTypographyProps={{ style: {color: "grey"} }}
                    />
                    <ListItemSecondaryAction>
                    { this.state.game && player.playerId === this.state.game.currPlayer &&
                        <IconButton edge="end" aria-label="pencil">
                        <CreateIcon color="secondary" />
                        </IconButton>
                    }
                    { this.state.game && this.state.game.correctGuess.includes(player.socketId) &&
                        <IconButton edge="end" aria-label="done">
                        <CheckCircleIcon  style={{ color: green[500] }} />
                        </IconButton>
                    }
                  </ListItemSecondaryAction>
                </ListItem>
              );
        })

        let chatMessages = this.state.chats.map((message, index) => {
            return (
                <React.Fragment key={message[2]}>
                <ListItem className="chatItem">
                    <ListItemText primaryTypographyProps={{ style: { fontSize: '0.8rem'} }}
                     primary={<div><span style={{fontWeight: "bold"}}>{message[0]}{": "} </span> {message[1]} </div>}/>
                </ListItem>
                <Divider />
                </React.Fragment>
            );
        });

        return (
            <div className="Game">
            <div className="playerStats">
            <List style={{maxHeight: '100%', overflow: 'auto'}}>
                {playerList}
            </List>
            </div>
            <div ref={this.myRef}></div>

            <div className="rightPane">
                <div className="sidebar">
                    <ul>
                        <li>
                            <label htmlFor="color">Color:</label>
                            <input type="color" id="color" />
                        </li>
                        <li>
                            <label htmlFor="weight">Brush Size:</label>
                            <input type="range" id="weight" min="2" max="50" defaultValue="10" />
                        </li>
                        <li>
                            <button id="clear"><i className="fa fa-trash"></i></button>
                        </li>
                    </ul>
                </div>
                <div className="chatBox">
                    <div className="chatHistory">
                        <List style={{ maxHeight: "100%", overflow: "auto"}}className="chatList">
                            {chatMessages}
                            <div style={{ float:"left", clear: "both" }}
                                ref={(el) => { this.messagesEnd = el; }}>
                            </div>
                        </List>
                    </div>
                    <TextField 
                        variant="outlined" 
                        placeholder="Enter guess here" 
                        id="chatInput" 
                        size="small" 
                        fullWidth 
                        margin="dense" 
                        color="secondary"
                        onChange={this.handleChange}
                        onKeyUp={this.handleSubmit}
                        value={this.state.input}
                    />
                </div>
            </div>
            </div>
        )
    }
}

export default Game


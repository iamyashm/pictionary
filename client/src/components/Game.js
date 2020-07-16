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
        correctWord: '',
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
                socket.emit('beginRound', {roomId: this.props.roomId});

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

        let checkUser = () => {
            return this.state.game !== null && 
            ( this.props.user.playerId === this.state.game.currPlayer);
        }

        p.setup = () => {
            p.createCanvas(800, 700);
            p.background(255);
            
            colorInput = document.getElementById('color');
            weight = document.getElementById('weight');
            
            setHeader();

            socket.on('mouse', (data) => {
                p.stroke(data.color);
                p.strokeWeight(data.weight);
                p.line(data.x, data.y, data.px, data.py);
            });

            socket.on('clear', () => {
                p.background(255);
            });

            socket.on('gameUpdate', (data) => {
                this.setState({
                    game: data.game
                });
                console.log(data.game.currWord);
                let word = '';
                if (checkUser()) word = data.game.currWord;
                else {
                    word = data.game.currWord.replace(/\s/gi, "\xa0 \xa0").replace(/[a-zA-Z]/gi, "_ "); 
                }
                setHeader(word);
            });

            socket.on('showRoundStats', (data) => {
                setHeader();
                p.background(255);
                p.noStroke();
                p.fill(0);
                p.textSize(30);
                p.text('All players got it right!', 240, 250);
                p.text('The word was: ' + data.correctWord, 250, 300);
                setTimeout(() => {
                    this.setState({ correctGuesses: [], game: data.game });
                    p.background(255);
                    let word = '';
                    if (checkUser()) word = data.game.currWord;
                    else {
                        word = data.game.currWord.replace(/\s/gi, "\xa0 \xa0").replace(/[a-zA-Z]/gi, "_ "); 
                    }
                    setHeader(word);
                }, 5000);
            });
        }

        let setHeader = (word='') => {
            p.fill(200);
            p.strokeWeight(3);
            p.rect(0, 0, 800, 70);
            p.noStroke();
            p.fill(0);
            p.textSize(35);
            p.text(word, 350, 50);
        }
    
        p.draw = () => {
            if(checkUser() && p.mouseIsPressed) {
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

        document.getElementById('clear').addEventListener('click', () => {
            if (checkUser()) {
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


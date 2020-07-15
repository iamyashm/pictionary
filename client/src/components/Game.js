import React, { Component } from 'react'
import p5 from 'p5';
import 'font-awesome/css/font-awesome.min.css';
import socket from '../service/socket';
import '../styles/Game.css';
import { Redirect } from 'react-router-dom';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import AccountCircle from '@material-ui/icons/AccountCircle';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';

export class Game extends Component {
    
    constructor(props) {
        super(props)
        this.myRef = React.createRef()
    }

    state = {
        redirectToHome: false,
        input: '',
        chats: []
    }

    componentDidMount() {
        socket.on('chatMessage', data => {
            this.setState({
                chats: [...this.state.chats, [data.name, data.message, data.timestamp]]
            });
        });

        // if (this.props.user === null) { 
        //     this.setState({
        //         redirectToHome: true
        //     });
        // }
        // else 
            this.myP5 = new p5(this.Sketch, this.myRef.current);
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

        p.setup = () => {
            p.createCanvas(800, 600);
            p.background(255);
            
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
        }
        
        p.draw = () => {
            if(p.mouseIsPressed) {
                var data = {
                    x: p.mouseX, 
                    y: p.mouseY,
                    px: p.pmouseX,
                    py: p.pmouseY,
                    color: colorInput.value,
                    weight: weight.value
                }
                socket.emit('mouse', data);
                p.stroke(colorInput.value);
                p.strokeWeight(weight.value);
                p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
            }
        
        }

        document.getElementById('clear').addEventListener('click', () => {
            p.background(255);
            socket.emit('clear');
        });
        
      }

    
    render() {
        if (this.state.redirectToHome) return <Redirect to="/" />

        let playerList = this.props.playerList.map(player => {
            return (
                <ListItem key={player.socketId}>
                    <AccountCircle style={{marginRight:"3%"}} />
                    <ListItemText primary={player.name} />
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
        })
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


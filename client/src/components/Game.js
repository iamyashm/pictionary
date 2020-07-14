import React, { Component } from 'react'
import p5 from 'p5';
import 'font-awesome/css/font-awesome.min.css';
import socket from '../service/socket';

export class Game extends Component {
    constructor(props) {
        super(props)
        this.myRef = React.createRef()
      }
    
      Sketch = (p) => {
        
        let colorInput, weight;
        //let playerId;
        let socketId;

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

            socket.on('connected', data => {
                //playerId = data.id;
                socketId = data.sid;
                console.log(socketId);
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
    
      componentDidMount() {
        this.myP5 = new p5(this.Sketch, this.myRef.current)
      }
    
      render() {
        return (
            <div>
            <div ref={this.myRef}></div>
            <div className="sidebar">
                <ul>
                    <li>
                        <label htmlFor="color">Color:</label>
                        <input type="color" id="color" />
                    </li>
                    <li>
                        <label htmlFor="weight">Brush Size:</label>
                        <input type="range" id="weight" min="2" max="30" defaultValue="5" />
                    </li>
                    <li>
                        <button id="clear"><i className="fa fa-trash"></i></button>
                    </li>
                </ul>
            </div>
            </div>
        )
      }
}

export default Game

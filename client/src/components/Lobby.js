import React, { Component } from 'react'
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import 'font-awesome/css/font-awesome.min.css';
import '../styles/Lobby.css';
import { Button } from '@material-ui/core';
import { Redirect } from 'react-router-dom';
import socket from '../service/socket';

export class Lobby extends Component {

    state = {
        startGame: false
    }

    componentDidMount() {
        socket.on('startGame', () => {
            this.setState({
                startGame: true
            });
        })
    }

    startHandler = (e) => {
        socket.emit('startGame');
        this.setState({
            startGame: true
        });
    }

    render() {
        if (this.state.startGame)
            return <Redirect push to="/game" />
        if (this.props.user === null)
            return <Redirect to="/" />
        let playerGrid = this.props.playerList.map(player => {
            return (
                <GridListTile key={player.socketId} className="gridtile" cols={1}>
                <i className="fa fa-user-circle-o fa-4x" aria-hidden="true"></i>
                <p>{ player.name }</p>
                </GridListTile>
            );
        });
        return (
            <div className="Lobby">        
                <p>Room ID: {this.props.roomId}</p> 
                <GridList className="gridlist" cols={6}>
                    {playerGrid}
                </GridList>
                
                {this.props.user.isHost && 
                <Button onClick={this.startHandler} variant="contained" size="large" color="secondary" style={{marginBottom: "5%"}}>
                    Start
                </Button> }
            </div>
        )
    }
}

export default Lobby

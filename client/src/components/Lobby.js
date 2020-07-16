import React, { Component} from 'react'
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import 'font-awesome/css/font-awesome.min.css';
import '../styles/Lobby.css';
import { Button, IconButton } from '@material-ui/core';
import { Redirect } from 'react-router-dom';
import socket from '../service/socket';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { pink } from '@material-ui/core/colors';

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

    handleCopy = (e) => {
        let dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.setAttribute('value', this.props.roomId);
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
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
                <div className="head">
                    <p>Room ID: {this.props.roomId}</p> 
                    <IconButton onClick={this.handleCopy}>
                        <FileCopyIcon style={{ color: pink[50] }} />
                    </IconButton>
                </div> 
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

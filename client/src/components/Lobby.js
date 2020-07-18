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
import { withStyles } from '@material-ui/core/styles';

const StyledButton = withStyles({
    root: {
      background: 'linear-gradient(45deg, #FE6B8B 30%, #ff5353 90%)',
      borderRadius: 3,
      border: 0,
      color: 'white',
      height: 48,
      padding: '0 30px',
      boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)'
    },
  })(Button);



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
                <p className="playerNames">{ player.name }</p>
                </GridListTile>
            );
        });
        return (
            <div className="Lobby">       
                <div className="head">
                    <p>Room ID: {this.props.roomId}</p> 
                    <Button
                        onClick={this.handleCopy}
                        startIcon={<FileCopyIcon style={{ color: pink[200] }}/>}
                        style={{ color: pink[200] }}
                    >
                        Copy
                    </Button>
                </div> 
                <GridList className="gridlist" cols={6}>
                    {playerGrid}
                </GridList>
                
                {this.props.user.isHost && 
                <StyledButton className="startButton" onClick={this.startHandler} variant="contained" size="large" color="secondary" style={{marginBottom: "5%"}}>
                    Start
                </StyledButton> }
            </div>
        )
    }
}

export default Lobby

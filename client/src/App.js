import React, { Component } from 'react';
import Game from './components/Game';
import Home from './components/Home';
import Lobby from './components/Lobby';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import socket from './service/socket';

class App extends Component {
  state = {
    playerList: [],
    roomId: null,
    user: null
  }
  
  componentDidMount() {
    socket.on('newJoin', (data) => { 
      this.setState({
        playerList: data.playerList,
      });
    });

    socket.on('playerDisconnected', (data) => {
      this.setState({
        playerList: this.state.playerList.filter(player => {
          return player.socketId !== data.id;
        })
      });
    });
  }

  changeUser = (user) => {
    this.setState({
      user: user
    });
  }

  changeRoomId = (id) => {
    this.setState({
      roomId: id
    });
  }

  render() {
    return (
      
      <div className="App">
      <Router>
        <Switch>
        <Route exact path="/" render={(props) => 
        <Home {...props}  changeUser={this.changeUser} changeRoomId={this.changeRoomId} roomId={this.state.roomId} user={this.state.user} />} />
        <Route exact path="/lobby" render={(props) => 
        <Lobby {...props} playerList={this.state.playerList} roomId={this.state.roomId} user={this.state.user} />} />
        <Route exact path="/game" render={(props) => 
        <Game {...props} playerList={this.state.playerList} roomId={this.state.roomId} user={this.state.user} />} />
        </Switch>
      </Router>
      </div>
    );
  }
  
}

export default App;

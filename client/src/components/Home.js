import React, { Component } from 'react'
import { TextField, Container, Button } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert'
import '../styles/Home.css';
import axios from 'axios';
import socket from '../service/socket';
import { Redirect } from 'react-router-dom';

export class Home extends Component {
    state = {
        name: '',
        roomId: '',
        showNameError: false,
        showRoomError: false,
        showOtherError: false,
        errorMsg: '',
        redirectToLobby: false
    }

    changeHandler = (e) => {
        let key;
        if (e.target.name === 'name')
            key = 'showNameError';
        else key = 'showRoomError';

        this.setState({
            [e.target.name]: e.target.value,
            [key] : false
        });
    }

    joinHandler = async (e) => {
        if (this.state.name.trim() === '') 
            this.setState({
                showNameError: true
            });
        else if (this.state.roomId.trim() === '')
            this.setState({
                showRoomError: true
            });
        else {
            try {
                let res = await axios.post('/join', {socketId: socket.id, roomId: this.state.roomId.trim(), name: this.state.name.trim()});
                this.props.changeUser(res.data.user);
                this.props.changeRoomId(res.data.roomId);
                this.setState({
                    redirectToLobby: true
                });
            } catch(err) {
                console.log(err.response);
                if (err.response.status === 404) {
                    this.setState({
                        showRoomError: true
                    });
                }
                if (err.response.status === 400) {
                    this.setState({
                        showOtherError: true, 
                        errorMsg: err.response.data.msg
                    });
                }
            }
        }
    }

    createHandler = async (e) => {
        if (this.state.name.trim() === '') 
            this.setState({
                showNameError: true
            });
        else {
            try {
                let res = await axios.post('/create', {socketId: socket.id, name: this.state.name.trim()});
                this.props.changeUser(res.data.user);
                this.props.changeRoomId(res.data.roomId);
                this.setState({
                    redirectToLobby: true
                });
            } catch(err) {
                if (err.response.status === 400) {
                    this.setState({
                        showOtherError: true, 
                        errorMsg: err.response.data.msg
                    });
                }
            }
        }
    }

    render() {
        if (this.state.redirectToLobby)
            return <Redirect push to="/lobby" />;
        return (
            <div className="HomeContainer">
                <div className="Home">
                <Container className="container">
                <p>PICTIONARY</p>
                <form noValidate autoComplete="off">
                        <TextField  onChange={this.changeHandler} name="name" label="Name" variant="outlined" style={{marginBottom: "20px", width: "100%"}} />
                        <TextField onChange={this.changeHandler} name="roomId" label="Room ID" variant="outlined" style={{marginBottom: "20px", width: "70%"}} />
                        <Button onClick={this.joinHandler} variant="contained" color="primary" size="large" style={{marginLeft: "5%", width: "20%", marginTop: "1%"}}>
                            Join
                        </Button>
                        <Button onClick={this.createHandler} variant="contained" size="large" color="primary" style={{ width: "100%", marginBottom: "5%"}}>
                            Create new room
                        </Button>
                        {this.state.showNameError && 
                        <Alert id="name-error" severity="error">Name cannot be empty</Alert> }
                        
                        {this.state.showRoomError &&
                        <Alert id="room-error" severity="error">Invalid room ID</Alert> }  

                        {this.state.showOtherError &&
                        <Alert id="other-error" severity="error"> {this.state.errorMsg} </Alert> }  
                </form>
                </Container>
            </div>
            </div>
        )
    }
}


export default Home

import React, { Component } from 'react'
import { TextField, Container, Button } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert'
import '../styles/Home.css';
import axios from 'axios';
import socket from '../service/socket';
import { Redirect } from 'react-router-dom';
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

const StyledTextField = withStyles({
root: {
    '& label.Mui-focused': {
    color: 'white',
    },
    '& .MuiInput-underline:after': {
    borderBottomColor: "rgba(255, 180, 180, 0.8)",
    },
    '& .MuiOutlinedInput-root': {
    '& fieldset': {
        borderColor: 'rgba(200, 200, 200, 0.8)',
    },
    '&:hover fieldset': {
        borderColor: 'rgba(200, 200, 200, 0.8)',
    },
    '&.Mui-focused fieldset': {
        borderColor: "rgba(255, 180, 180, 0.8)",
    },
    },
},
})(TextField);

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
                <p>PICTIONARY</p>
                <Container className="container">
                <form noValidate autoComplete="off">
                        <StyledTextField  
                            inputProps={{ style: { color: 'white'}}}
                            InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.5)'}}}
                            error={this.state.showNameError}
                            onChange={this.changeHandler} 
                            name="name" 
                            label="Name" 
                            variant="outlined" 
                            style={{marginBottom: "20px", width: "100%"}} 
                        />
                        <StyledTextField 
                            inputProps={{ style: { color: 'white'}}}
                            InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.5)'}}}
                            error={this.state.showRoomError}
                            onChange={this.changeHandler} 
                            name="roomId" 
                            label="Room ID" 
                            variant="outlined" 
                            style={{marginBottom: "20px", width: "75%"}} 
                        />
                        <StyledButton 
                            onClick={this.joinHandler} 
                            variant="contained" 
                            size="large" 
                            style={{marginLeft: "4%", width: "20%", marginTop: "1%", marginRight: "0%"}}>
                            JOIN
                        </StyledButton>
                        <div className="strike">
                            <span>OR</span>
                        </div>
                        <StyledButton 
                            onClick={this.createHandler} 
                            variant="contained" 
                            size="large" 
                            style={{ width: "100%", marginBottom: "5%"}}>
                            CREATE NEW ROOM
                        </StyledButton>
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

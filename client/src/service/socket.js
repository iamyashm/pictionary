import openSocket from 'socket.io-client';

let socket;

if (process.env.NODE_ENV === 'production')
    socket = openSocket();
else
    socket = openSocket('http://localhost:5000');

export default socket;
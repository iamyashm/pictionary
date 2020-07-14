var socket;

function setup() {
    createCanvas(500, 500);
    background(51);
    socket = io();
    socket.on('mouse', (data) => {
        noStroke();
        fill(255, 0, 100);
        ellipse(data.x, data.y, 40, 40);
    });
}

function mouseDragged() {
    var data = {
        x: mouseX, 
        y: mouseY
    }
    socket.emit('mouse', data);
    noStroke();
    fill(255);
    ellipse(mouseX, mouseY, 40, 40);
}

function draw() {
}
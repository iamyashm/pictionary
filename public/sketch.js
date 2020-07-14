var socket;
var colorInput, weight;

function setup() {
    createCanvas(800, 600);
    background(255);
    colorInput = document.getElementById('color');
    weight = document.getElementById('weight');
    socket = io();
    socket.on('mouse', (data) => {
        stroke(data.color);
        strokeWeight(data.weight);
        line(data.x, data.y, data.px, data.py);
    });
}

function draw() {
    if(mouseIsPressed) {
        var data = {
            x: mouseX, 
            y: mouseY,
            px: pmouseX,
            py: pmouseY,
            color: colorInput.value,
            weight: weight.value
        }
        socket.emit('mouse', data);
        stroke(colorInput.value);
        strokeWeight(weight.value);
        line(mouseX, mouseY, pmouseX, pmouseY);
    }

}

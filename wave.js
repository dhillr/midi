let waveCanvas = document.getElementById("wave-canvas");
let waveCtx = waveCanvas.getContext("2d");

waveCtx.canvas.width = window.innerWidth;

let globalT = 0;
let waveScale = waveCtx.canvas.width / 1024;

addEventListener('resize', () => {
    waveCtx.canvas.width = window.innerWidth;
    waveScale = waveCtx.canvas.width / 1024;
});

setInterval(() => {
    waveCtx.fillStyle = "black";
    waveCtx.fillRect(0, 0, waveCtx.canvas.width, waveCtx.canvas.height);
    for (let i = 0; i < 1024; i++) {
        let t = globalT + i;
        waveCtx.fillStyle = "white";
        waveCtx.fillRect(i * waveScale, (eval(bytebeatInput) & 0xFF) / 2.56, 1, 1);
    }


    globalT += 1024;
}, 1000 / (audioCtx.sampleRate / 1024));
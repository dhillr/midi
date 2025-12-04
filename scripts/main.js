class vec2_xy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

let vec2 = (x, y) => new vec2_xy(x, y);

let audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 44100});
let gainNode = audioCtx.createGain();

let keys = [];
let buffers = [];

let canvas = document.getElementById("midi-canvas");
let ctx = canvas.getContext("2d");

let popup = document.getElementById("popup");
let audioPopup = document.getElementById("audio-popup");
let bytebeatInputElem = document.getElementById("input-dark");
let errorElem = document.getElementById("error");
let increaseCodeWindowElem = document.getElementById("increase-code-window");

let bytebeatInput = "";
bytebeatInput = bytebeatInputElem.value;

let frames = 0;
let popupOpacity = 0;

let globalVolume = 0.25;
let bufferWaitTime = 980;

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

let width = ctx.canvas.width;
let height = ctx.canvas.height;

let notes = [];
let noteSize = ctx.canvas.width / 128;

let sharpNotes = [1, 3, 6, 8, 10];

function updateBytebeatInput() {
    if (bytebeatInputElem.value.toString().includes("window") || bytebeatInputElem.value.toString().includes("document")) {
        errorElem.innerHTML = "Nice try";
        return;
    }

    bytebeatInput = bytebeatInputElem.value;
    bytebeatNode.port.postMessage({keys: keys, bytebeatInput: bytebeatInput});

    try {
        let t;
        eval(bytebeatInput);
        errorElem.innerHTML = "";
    } catch (e) {
        errorElem.innerHTML = e;
    }
}

function codeWindowButton() {
    if (increaseCodeWindowElem.innerHTML == "-") {
        bytebeatInputElem.style.height = "";
        increaseCodeWindowElem.innerHTML = "+";
    } else {
        bytebeatInputElem.style.height = "50vh";
        increaseCodeWindowElem.innerHTML = "-";
    }
}

async function removeAudioPopup() {
    while (parseFloat(getComputedStyle(audioPopup).opacity) >= 0) {
        audioPopup.style.opacity = (parseFloat(getComputedStyle(audioPopup).opacity) - 0.1).toString(); 
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

function audioCtxUsable() {
    audioCtx.resume();
    if (audioCtx.state == "suspended")
        setTimeout(audioCtxUsable, 100);
    else
        removeAudioPopup();
}

function genBytebeatBuffer(note, gain, timeOffset) {
    let res = audioCtx.createBufferSource();
    let buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    let chan = buf.getChannelData(0);

    for (let i = 0; i < audioCtx.sampleRate; i++) {
        let t = Math.pow(2, note / 12) * (i + timeOffset) / (audioCtx.sampleRate / 256) * 440;
        chan[i] = gain * ((eval(bytebeatInput) & 0xFF) / 128 - 1);
    }

    res.buffer = buf;
    return res;
}

function genBufferRefillFunction(bufferSrc, note, gain, offset=audioCtx.sampleRate) {
    return () => {
        let bufferIndex = buffers.indexOf(bufferSrc);
        if (bufferIndex < 0) return;

        let time = Date.now();
        let srcBuf = genBytebeatBuffer(note, gain, offset);
        srcBuf.connect(audioCtx.destination);
        srcBuf.start();
        let dt = Date.now() - time;

        buffers[bufferIndex] = srcBuf;

        setTimeout(genBufferRefillFunction(srcBuf, note, gain, offset + audioCtx.sampleRate), bufferWaitTime);
    };
}

let bytebeatNode;
(async () => {
    await audioCtx.audioWorklet.addModule("scripts/bytebeat_processor.js");
    bytebeatNode = new AudioWorkletNode(audioCtx, "bp", {});

    bytebeatNode.port.postMessage({keys: keys, bytebeatInput: bytebeatInput});

    bytebeatNode.connect(audioCtx.destination);
})();

audioCtxUsable();

addEventListener('resize', () => {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    width = ctx.canvas.width;
    height = ctx.canvas.height;

    noteSize = ctx.canvas.width / 128;
});

setInterval(() => {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "lightblue";

    for (let i in notes) {
        let note = notes[i];
        let noteHeight = (note[2] ? note[2] : frames) - note[1];

        ctx.fillRect(note[0].x * noteSize, note[0].y, noteSize, noteHeight);
        note[0].y--;

        if (note[0].y < -noteHeight) 
            notes.splice(i, 1);
    }

    ctx.strokeStyle = "grey";
    for (let i = 0; i < 128; i++) {
        if (sharpNotes.includes(i % 12))
            ctx.fillStyle = "black";
        else
            ctx.fillStyle = "white";

        for (let key of keys) {
            if (i == key + 57)
                ctx.fillStyle = "lightblue";
        }

        ctx.strokeRect(i * noteSize, 0.9 * height, noteSize, 0.1 * height);
        ctx.fillRect(i * noteSize, 0.9 * height, noteSize, 0.1 * height);
    }

    frames++;
    popupOpacity -= 0.01;

    popup.style.opacity = popupOpacity.toString();
}, 10);

if (navigator.requestMIDIAccess)
    navigator.requestMIDIAccess().then(onMidiConnect, onMidiError);

function onMidiConnect(access) {
    console.log(access);
    access.inputs.forEach(elem => {
        elem.onmidimessage = (e) => {
            console.log(e);
            let note = e.data[1] - 57;
             
            if (e.data[0] & 0b100000) {
                popupOpacity = 1;
            } else {
                if (e.data[0] & 0b10000) {
                    keys.push(note);
                    let gain = 1;

                    if (e.data[2])
                        gain = 0.005 * e.data[2];

                    notes.push([vec2(e.data[1], 0.9 * height), frames, undefined]);
                    bytebeatNode.port.postMessage({keys: keys});
                } else {
                    let lastNote = notes.filter(elem_e => (elem_e[0].x == e.data[1] && !elem_e[2]));
                    let lastNoteIndex = notes.indexOf(lastNote[0]);

                    if (lastNoteIndex >= 0)
                        notes[lastNoteIndex][2] = frames;

                    let index = keys.indexOf(note);
                    keys.splice(index, 1);

                    bytebeatNode.port.postMessage({keys: keys});
                }
            }
        };
    });

    access.onstatechange = e => {
        console.log(e);
        console.log(e.port.manufacturer);
    };
}

function onMidiError() {
    console.log("could not find device");
}
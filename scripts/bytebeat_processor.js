function bytebeat(beat, time, key, gain) {
    let t = time * (2 ** (key / 12));
    return ((eval(beat) & 0xFF) / 128 - 1) * gain;
}

class BytebeatProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.keys = [];
        this.bytebeatInput = "";

        this.port.onmessage = e => {
            for (let prop of Object.getOwnPropertyNames(e.data)) {
                if (e.data[prop]) this[prop] = e.data[prop];
            }
        };
    }

    process(_, [out]) {
        for (let i = 0; i < 128; i++) {
            let time = (currentFrame + i) / (sampleRate / 256) * 440;

            for (let j in this.keys) {
                out[0][i] += bytebeat(this.bytebeatInput, time, this.keys[j], this.gains[j]);
            }
        }

        return true;
    }
}

registerProcessor("bp", BytebeatProcessor);
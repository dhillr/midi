class BytebeatProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.keys = [];
        this.bytebeatInput = "";

        this.port.onmessage = e => {
            this.keys = e.data.keys;

            if (e.data.bytebeatInput)
                this.bytebeatInput = e.data.bytebeatInput;
        };
    }

    process(_, [out]) {
        for (let i = 0; i < 128; i++) {
            let time = (currentFrame + i) / (sampleRate / 256) * 440;

            for (let key of this.keys) {
                let t = time * (2 ** (key / 12));
                out[0][i] += ((eval(this.bytebeatInput) & 0xFF) / 128 - 1) * 0.1;
            }
        }

        return true;
    }
}

registerProcessor("bp", BytebeatProcessor);
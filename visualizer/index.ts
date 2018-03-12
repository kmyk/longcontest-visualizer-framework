declare var GIF: any;  // for https://github.com/jnordberg/gif.js

module visualizer {
    const error = (msg: string) => {
        alert(msg);
        throw new Error(msg);
    };

    class InputFile {
        public taxis: [number, number][];
        public passengers: [number, number][];
        public zones: [number, number][];
        public passengersDict: any;
        public zonesDict: any;

        constructor(content: string) {
            const words = content.trim().split(new RegExp('\\s+')).reverse();

            // parse
            const t = parseInt(words.pop());
            this.taxis = [];
            for (let i = 0; i < t; ++ i) {
                const x = parseInt(words.pop());  // TODO: parse strictly
                const y = parseInt(words.pop());  // TODO: make a parser class, use line numbers for error messages
                this.taxis.push([ x, y ]);
            }

            // parse
            const p = parseInt(words.pop());
            this.passengers = [];
            this.passengersDict = {};
            for (let i = 0; i < p; ++ i) {
                const x = parseInt(words.pop());
                const y = parseInt(words.pop());
                this.passengers.push([ x, y ]);
                this.passengersDict[[ x, y ].toString()] = i;
            }

            // parse
            const z = parseInt(words.pop());
            this.zones = [];
            this.zonesDict = {};
            for (let i = 0; i < z; ++ i) {
                const x = parseInt(words.pop());
                const y = parseInt(words.pop());
                this.zones.push([ x, y ]);
                this.zonesDict[[ x, y ].toString()] = i;
            }
        }
    };

    class OutputFile {
        public commands: [number, number, number[]][];

        constructor(content: string) {
            const words = content.trim().split(/\s+/).reverse();

            // parse
            const k = parseInt(words.pop());
            this.commands = [];
            for (let i = 0; i < k; ++ i) {
                const command = words.pop();
                if (command != "MOVE") error("\"MOVE\" expected");
                const x = parseInt(words.pop());
                const y = parseInt(words.pop());
                const t = parseInt(words.pop());
                const targets = [];
                for (let j = 0; j < t; ++ j) {
                    const target = parseInt(words.pop());
                    targets.push(target);
                }
                this.commands.push([ x, y, targets ]);
            }
        }
    };

    class TesterFrame {
        public input: InputFile;
        public previousFrame: TesterFrame | null;
        public taxis: { x: number, y: number, carrying: boolean }[];
        public passengers: { carried: boolean }[];
        public age: number;
        public command: [ number, number, number[] ] | null;
        public penaltyDelta: number | null;
        public penaltySum: number;

        constructor(input: InputFile);
        constructor(frame: TesterFrame, command: [number, number, number[]]);
        constructor(something1: any, something2?: any) {

            if (something1 instanceof InputFile) {  // initial frame
                this.input = something1 as InputFile;
                this.previousFrame = null;
                this.age = 0;
                this.command = null;

                this.taxis = [];
                for (const taxi of this.input.taxis) {
                    this.taxis.push({ x: taxi[0], y: taxi[1], carrying: false });
                }
                this.passengers = [];
                for (let i = 0; i < this.input.passengers.length; ++ i) {
                    this.passengers.push({ carried: false });
                }
                this.penaltyDelta = null;
                this.penaltySum = 0;

            } else if (something1 instanceof TesterFrame) {  // successor frame
                this.previousFrame = something1 as TesterFrame;
                this.command = something2 as [number, number, number[]];
                this.input = this.previousFrame.input;
                this.age = this.previousFrame.age + 1;

                // apply the command
                this.taxis = JSON.parse(JSON.stringify(this.previousFrame.taxis));  // deep copy
                this.passengers = JSON.parse(JSON.stringify(this.previousFrame.passengers));  // deep copy
                const dx = this.command[0];
                const dy = this.command[1];
                for (let i of this.command[2]) {
                    i -= 1;
                    if (i < 0 || this.taxis.length <= i) error("index out of range");
                    this.taxis[i].x += dx;
                    this.taxis[i].y += dy;
                    const key = [ this.taxis[i].x, this.taxis[i].y ].toString();
                    if (this.taxis[i].carrying) {
                        const j = this.input.zonesDict[key];
                        if (j !== undefined) {
                            this.taxis[i].carrying = false;
                        }
                    } else {
                        const j = this.input.passengersDict[key];
                        if (j !== undefined && ! this.passengers[j].carried) {
                            this.taxis[i].carrying = true;
                            this.passengers[j].carried = true;
                        }
                    }
                }
                this.penaltyDelta = Math.sqrt(dx * dx + dy * dy) * (1 + this.command[2].length / this.taxis.length);
                this.penaltySum = this.previousFrame.penaltySum + this.penaltyDelta;
            }
        }
    };

    class Tester {
        public frames: TesterFrame[];
        constructor(input: InputFile, output: OutputFile) {
            this.frames = [ new TesterFrame(input) ];
            for (const command of output.commands) {
                let lastFrame = this.frames[this.frames.length - 1];
                this.frames.push( new TesterFrame(lastFrame, command) );
            }
        }
    };

    class Visualizer {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;
        private xInput: HTMLInputElement;
        private yInput: HTMLInputElement;
        private taxisInput: HTMLInputElement;
        private penaltyDeltaInput: HTMLInputElement;
        private penaltySumInput: HTMLInputElement;

        constructor() {
            this.canvas = <HTMLCanvasElement> document.getElementById("canvas");  // TODO: IDs should be given as arguments
            const size = 800;
            this.canvas.height = size;  // pixels
            this.canvas.width  = size;  // pixels
            this.ctx = this.canvas.getContext('2d');
            if (this.ctx == null) {
                error('unsupported browser');
            }
            this.xInput = <HTMLInputElement> document.getElementById("xInput");
            this.yInput = <HTMLInputElement> document.getElementById("yInput");
            this.taxisInput = <HTMLInputElement> document.getElementById("taxisInput");
            this.penaltyDeltaInput = <HTMLInputElement> document.getElementById("penaltyDeltaInput");
            this.penaltySumInput = <HTMLInputElement> document.getElementById("penaltySumInput");
        }

        public draw(frame: TesterFrame) {
            // update input tags
            if (frame.age == 0) {
                this.xInput.value = "";
                this.yInput.value = "";
                this.taxisInput.value = "";
                this.penaltyDeltaInput.value = "";
                this.penaltySumInput.value = "0";
            } else {
                this.xInput.value = frame.command[0].toString();
                this.yInput.value = frame.command[1].toString();
                this.taxisInput.value = frame.command[2].toString();
                this.penaltyDeltaInput.value = frame.penaltyDelta.toString();
                this.penaltySumInput.value = frame.penaltySum.toString();
            }

            // prepare from input
            let minX = 0;
            let maxX = 0;
            let minY = 0;
            let maxY = 0;
            const updateMinMaxXY = (x: number, y: number) => {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            };
            for (const taxi of frame.input.taxis) {
                updateMinMaxXY(taxi[0], taxi[1]);
            }
            for (const passenger of frame.input.passengers) {
                updateMinMaxXY(passenger[0], passenger[1]);
            }
            for (const zone of frame.input.zones) {
                updateMinMaxXY(zone[0], zone[1]);
            }
            const size = Math.max(maxX - minX, maxY - minY) * 1.2;
            const offset = - (Math.min(0, minX, minY)) * 1.2;
            const scale = this.canvas.height / size;  // height == width
            const transform = (z: number) => {
                return Math.floor((z + offset) * scale);
            };
            const drawPixel = (x: number, y: number) => {
                this.ctx.fillRect(transform(x), transform(y), 5, 5);
            };

            // update the canvas
            const height = this.canvas.height;
            const width = this.canvas.width;
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, width, height);

            // draw entities
            this.ctx.fillStyle = 'green';
            for (let i = 0; i < frame.input.passengers.length; ++ i) {
                const passenger = frame.input.passengers[i];
                const carried = frame.passengers[i].carried;
                if (carried) continue;
                drawPixel(passenger[0], passenger[1]);
            }
            this.ctx.fillStyle = 'red';
            for (const taxi of frame.taxis) {
                drawPixel(taxi.x, taxi.y);
            }
            this.ctx.fillStyle = 'blue';
            for (const zone of frame.input.zones) {
                drawPixel(zone[0], zone[1]);
            }

            // draw lines
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 1;
            if (frame.age != 0) {
                for (let i = 0; i < frame.input.taxis.length; ++ i) {
                    const cur = frame.taxis[i];
                    const prv = frame.previousFrame.taxis[i];
                    this.ctx.beginPath();
                    this.ctx.moveTo(transform(prv.x) + 2, transform(prv.y) + 2);
                    this.ctx.lineTo(transform(cur.x) + 2, transform(cur.y) + 2);
                    this.ctx.stroke();
                }
            }
        }
    };

    const saveUrlAsLocalFile = (url: string, filename: string) => {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        const evt = document.createEvent('MouseEvent');
        evt.initEvent("click", true, true);
        anchor.dispatchEvent(evt);
    };

    export const main = () => {
        const inputFile = <HTMLInputElement> document.getElementById("inputFile");
        const outputFile = <HTMLInputElement> document.getElementById("outputFile");
        const saveAsImage = <HTMLInputElement> document.getElementById("saveAsImage");
        const saveAsVideo = <HTMLInputElement> document.getElementById("saveAsVideo");
        const canvas = <HTMLCanvasElement> document.getElementById("canvas");

        // controls
        const seekRange = <HTMLInputElement> document.getElementById("seekRange");
        const seekNumber = <HTMLInputElement> document.getElementById("seekNumber");
        const fpsInput = <HTMLInputElement> document.getElementById("fpsInput");
        const firstButton = <HTMLInputElement> document.getElementById("firstButton");
        const prevButton = <HTMLInputElement> document.getElementById("prevButton");
        const playButton = <HTMLInputElement> document.getElementById("playButton");
        const nextButton = <HTMLInputElement> document.getElementById("nextButton");
        const lastButton = <HTMLInputElement> document.getElementById("lastButton");
        const runIcon = document.getElementById("runIcon");

        let intervalId: number | null = null;
        const resetInterval = () => {
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
                runIcon.classList.remove('stop');
                runIcon.classList.add('play');
            }
        };

        const visualizer = new Visualizer();
        let tester: Tester | null = null;
        const updateTo = (i: number) => {
            i = Math.max(0, Math.min(tester.frames.length - 1, i));  // clamp
            seekRange.value = seekNumber.value = i.toString();
            visualizer.draw(tester.frames[i]);
        };

        const run = (inputContent: string, outputContent: string) => {
            tester = new Tester( new InputFile(inputContent), new OutputFile(outputContent) );
            seekRange.min   = seekNumber.min   = '0';
            seekRange.max   = seekNumber.max   = (tester.frames.length - 1).toString();
            seekRange.step  = seekNumber.step  = '1';
            updateTo(tester.frames.length - 1);  // draw the last frame

            let fps = parseInt(fpsInput.value);  // TODO: disabled now, make variable
            let updateInterval = Math.floor(1000 / fps);

            seekRange .onchange = seekRange .oninput = () => { updateTo(parseInt(seekRange .value)); };
            seekNumber.onchange = seekNumber.oninput = () => { updateTo(parseInt(seekNumber.value)); };
            firstButton.onclick = () => { updateTo(0); };
            prevButton .onclick = () => { updateTo(parseInt(seekRange.value) - 1); };
            nextButton .onclick = () => { updateTo(parseInt(seekRange.value) + 1); };
            lastButton .onclick = () => { updateTo(tester.frames.length - 1); };

            saveAsImage.onclick = () => {
                saveUrlAsLocalFile(canvas.toDataURL('image/png'), 'canvas.png');
            };
            saveAsVideo.onclick = () => {
                if (location.href.match(new RegExp('^file://'))) {
                    alert('to use this feature, you must re-open this file via "http://", instead of "file://". e.g. you can use "$ python -m SimpleHTTPServer 8000"');
                }
                resetInterval();
                const gif = new GIF();
                for (let i = 0; i < tester.frames.length; ++ i) {
                    updateTo(i);
                    gif.addFrame(canvas, { copy: true, delay: updateInterval });
                }
                gif.on('finished', function(blob) {
                    saveUrlAsLocalFile(URL.createObjectURL(blob), 'canvas.gif');
                });
                gif.render();
                alert('please wait for a while, about 2 minutes.');
            };

            const play = () => {
                if (seekRange.value == seekRange.max) {  // if last, go to first
                    updateTo(0);
                }
                const stop = () => {
                    resetInterval();
                    playButton.onclick = play;
                };
                intervalId = setInterval(() => {
                    const i = parseInt(seekRange.value);
                    if (i == tester.frames.length - 1) {
                        stop();
                    } else {
                        updateTo(i + 1);
                    }
                }, updateInterval);
                runIcon.classList.remove('play');
                runIcon.classList.add('stop');
                playButton.onclick = stop;
            };

            fpsInput.onchange = () => {
                fps = parseInt(fpsInput.value);
                updateInterval = Math.floor(1000 / fps);
                if (intervalId != null) {
                    resetInterval();
                    play();
                }
            };

            const autoPlay = true;
            if (autoPlay) {
                play();
            } else {
                playButton.onclick = play;
                playButton.focus();
            }
        };

        const load_to = (file: File, callback: (value: string) => void) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onloadend = function () {
                callback(reader.result);
            }
        };

        const reloadFiles = () => {
            if (! inputFile.files || ! outputFile.files) return;
            load_to(inputFile.files[0], (inputContent: string) => {
                load_to(outputFile.files[0], (outputContent: string) => {
                    resetInterval();
                    intervalId = null;
                    run(inputContent, outputContent);
                });
            });
        };
        inputFile.onchange = reloadFiles;
        outputFile.onchange = reloadFiles;
        return reloadFiles;
    };
}

window.onload = () => {
    (<HTMLButtonElement> document.getElementById("run")).onclick = visualizer.main();
};

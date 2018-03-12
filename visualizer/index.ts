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

    const loadFile = (file: File, callback: (value: string) => void) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onloadend = function () {
            callback(reader.result);
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

    export class App {
        // system
        public inputFile: HTMLInputElement;
        public outputFile: HTMLInputElement;
        public reloadButton: HTMLInputElement;
        public saveAsImage: HTMLInputElement;
        public saveAsVideo: HTMLInputElement;
        public canvas: HTMLCanvasElement;

        // controls
        public seekRange: HTMLInputElement;
        public seekNumber: HTMLInputElement;
        public fpsInput: HTMLInputElement;
        public firstButton: HTMLInputElement;
        public prevButton: HTMLInputElement;
        public playButton: HTMLInputElement;
        public nextButton: HTMLInputElement;
        public lastButton: HTMLInputElement;
        public runIcon: HTMLElement;

        public intervalId: number | null = null;
        public visualizer: Visualizer;
        public tester: Tester;

        constructor() {
            // system
            this.inputFile = <HTMLInputElement> document.getElementById("inputFile");
            this.outputFile = <HTMLInputElement> document.getElementById("outputFile");
            this.reloadButton = <HTMLInputElement> document.getElementById("reloadButton");
            this.saveAsImage = <HTMLInputElement> document.getElementById("saveAsImage");
            this.saveAsVideo = <HTMLInputElement> document.getElementById("saveAsVideo");
            this.canvas = <HTMLCanvasElement> document.getElementById("canvas");

            // controls
            this.seekRange = <HTMLInputElement> document.getElementById("seekRange");
            this.seekNumber = <HTMLInputElement> document.getElementById("seekNumber");
            this.fpsInput = <HTMLInputElement> document.getElementById("fpsInput");
            this.firstButton = <HTMLInputElement> document.getElementById("firstButton");
            this.prevButton = <HTMLInputElement> document.getElementById("prevButton");
            this.playButton = <HTMLInputElement> document.getElementById("playButton");
            this.nextButton = <HTMLInputElement> document.getElementById("nextButton");
            this.lastButton = <HTMLInputElement> document.getElementById("lastButton");
            this.runIcon = document.getElementById("runIcon");

            this.intervalId = null;
            this.visualizer = new Visualizer();

            this.inputFile.onchange = () => { this.reloadFiles(); };
            this.outputFile.onchange = () => { this.reloadFiles(); };
            this.reloadButton.onclick = () => { this.reloadFiles(); };
        }

        updateTo(i: number) {
            i = Math.max(0, Math.min(this.tester.frames.length - 1, i));  // clamp
            this.seekRange.value = this.seekNumber.value = i.toString();
            this.visualizer.draw(this.tester.frames[i]);
        }

        reloadFiles() {
            if (this.inputFile.files.length == 0 || this.outputFile.files.length == 0) return;
            loadFile(this.inputFile.files[0], (inputContent: string) => {
                loadFile(this.outputFile.files[0], (outputContent: string) => {
                    this.resetInterval();
                    this.intervalId = null;
                    this.fileLoaded(inputContent, outputContent);
                });
            });
        }

        getUpdateInterval(): number {
            const fps = parseInt(this.fpsInput.value);
            return Math.floor(1000 / fps);
        }

        fileLoaded(inputContent: string, outputContent: string) {
            this.tester = new Tester( new InputFile(inputContent), new OutputFile(outputContent) );
            this.seekRange.min   = this.seekNumber.min   = '0';
            this.seekRange.max   = this.seekNumber.max   = (this.tester.frames.length - 1).toString();
            this.seekRange.step  = this.seekNumber.step  = '1';
            this.updateTo(this.tester.frames.length - 1);  // draw the last frame

            this.seekRange .onchange = this.seekRange .oninput = () => { this.updateTo(parseInt(this.seekRange .value)); };
            this.seekNumber.onchange = this.seekNumber.oninput = () => { this.updateTo(parseInt(this.seekNumber.value)); };
            this.firstButton.onclick = () => { this.updateTo(0); };
            this.prevButton .onclick = () => { this.updateTo(parseInt(this.seekRange.value) - 1); };
            this.nextButton .onclick = () => { this.updateTo(parseInt(this.seekRange.value) + 1); };
            this.lastButton .onclick = () => { this.updateTo(this.tester.frames.length - 1); };

            this.saveAsImage.onclick = () => {
                saveUrlAsLocalFile(this.canvas.toDataURL('image/png'), 'canvas.png');
            };
            this.saveAsVideo.onclick = () => {
                if (location.href.match(new RegExp('^file://'))) {
                    alert('to use this feature, you must re-open this file via "http://", instead of "file://". e.g. you can use "$ python -m SimpleHTTPServer 8000"');
                }
                this.resetInterval();
                const gif = new GIF();
                for (let i = 0; i < this.tester.frames.length; ++ i) {
                    this.updateTo(i);
                    gif.addFrame(this.canvas, { copy: true, delay: this.getUpdateInterval() });
                }
                gif.on('finished', function(blob) {
                    saveUrlAsLocalFile(URL.createObjectURL(blob), 'canvas.gif');
                });
                gif.render();
                alert('please wait for a while, about 2 minutes.');
            };

            this.fpsInput.onchange = () => {
                if (this.intervalId != null) {
                    this.resetInterval();
                    this.play();
                }
            };

            this.reloadButton.innerHTML = '<i class="sync icon"></i> reload';

            const autoPlay = true;
            if (autoPlay) {
                this.play();
            } else {
                this.playButton.onclick = () => { this.play(); };
                this.playButton.focus();
            }
        }

        resetInterval() {
            if (this.intervalId != null) {
                clearInterval(this.intervalId);
                this.intervalId = null;
                this.runIcon.classList.remove('stop');
                this.runIcon.classList.add('play');
            }
        }
        play() {
            if (this.seekRange.value == this.seekRange.max) {  // if last, go to first
                this.updateTo(0);
            }
            this.intervalId = setInterval(() => {
                const i = parseInt(this.seekRange.value);
                if (i == this.tester.frames.length - 1) {
                    this.stop();
                } else {
                    this.updateTo(i + 1);
                }
            }, this.getUpdateInterval());
            this.runIcon.classList.remove('play');
            this.runIcon.classList.add('stop');
            this.playButton.onclick = () => { this.stop(); };
        }
        stop() {
            this.resetInterval();
            this.playButton.onclick = () => { this.play(); };
        }
    }
}

window.onload = () => {
    new visualizer.App();
};

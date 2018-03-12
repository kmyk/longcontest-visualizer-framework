declare var GIF: any;  // for https://github.com/jnordberg/gif.js

module visualizer {
    class FileParser {
        private filename: string;
        private content: string[][];
        private y: number;
        private x: number

        constructor(filename: string, content: string) {
            this.filename = filename;
            this.content = [];
            for (const line of content.split('\n')) {
                const words = line.trim().split(new RegExp('\\s+'));
                this.content.push(words);
            }
            this.y = 0;
            this.x = 0;
        }

        public getWord(): string {
            if (this.content.length <= this.y) {
                this.reportError('a word expected, but EOF');
            }
            if (this.content[this.y].length <= this.x) {
                this.reportError('a word expected, but newline');
            }
            const word = this.content[this.y][this.x];
            this.x += 1;
            return word;
        }
        public getInt(): number {
            const word = this.getWord();
            if (! word.match(new RegExp('^[-+]?[0-9]+$'))) {
                this.reportError(`a number expected, but word ${JSON.stringify(this.content[this.y][this.x])}`);
            }
            return parseInt(word);
        }
        public getNewline() {
            if (this.content.length <= this.y) {
                this.reportError('newline expected, but EOF');
            }
            if (this.x < this.content[this.y].length) {
                this.reportError(`newline expected, but word ${JSON.stringify(this.content[this.y][this.x])}`);
            }
            this.x = 0;
            this.y += 1;
        }

        public unwind() {
            if (this.x == 0) {
                this.y -= 1;
                this.x = this.content[this.y].length - 1;
            } else {
                this.x -= 1;
            }
        }
        public reportError(msg: string) {
            msg = `${this.filename}: line ${this.y + 1}: ${msg}`;
            alert(msg);
            throw new Error(msg);
        }
    }

    class InputFile {
        public taxis: [number, number][];
        public passengers: [number, number][];
        public zones: [number, number][];
        public passengersDict: any;
        public zonesDict: any;

        constructor(content: string) {
            const parser = new FileParser('<input-file>', content);

            // parse
            const t = parser.getInt();
            parser.getNewline();
            this.taxis = [];
            for (let i = 0; i < t; ++ i) {
                const x = parser.getInt();
                const y = parser.getInt();
                parser.getNewline();
                this.taxis.push([ x, y ]);
            }

            // parse
            const p = parser.getInt();
            parser.getNewline();
            this.passengers = [];
            this.passengersDict = {};
            for (let i = 0; i < p; ++ i) {
                const x = parser.getInt();
                const y = parser.getInt();
                parser.getNewline();
                this.passengers.push([ x, y ]);
                this.passengersDict[[ x, y ].toString()] = i;
            }

            // parse
            const z = parser.getInt();
            parser.getNewline();
            this.zones = [];
            this.zonesDict = {};
            for (let i = 0; i < z; ++ i) {
                const x = parser.getInt();
                const y = parser.getInt();
                parser.getNewline();
                this.zones.push([ x, y ]);
                this.zonesDict[[ x, y ].toString()] = i;
            }
        }
    };

    class OutputFile {
        public commands: [number, number, number[]][];

        constructor(content: string) {
            const parser = new FileParser('<output-file>', content);

            // parse
            const k = parser.getInt();
            parser.getNewline();
            this.commands = [];
            for (let i = 0; i < k; ++ i) {
                const command = parser.getWord();
                if (command != "MOVE") {
                    parser.reportError("\"MOVE\" expected");
                }
                const x = parser.getInt();
                const y = parser.getInt();
                const t = parser.getInt();
                const targets = [];
                for (let j = 0; j < t; ++ j) {
                    const target = parser.getInt();
                    targets.push(target);
                }
                parser.getNewline();
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
                    if (i < 0 || this.taxis.length <= i) alert("<tester>: index out of range");
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
        constructor(inputContent: string, outputContent: string) {
            const input  = new  InputFile( inputContent);
            const output = new OutputFile(outputContent);
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
                alert('unsupported browser');
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

        public getCanvas(): HTMLCanvasElement {
            return this.canvas;
        }
    };

    class FileSelector {
        public callback: (inputContent: string, outputContent: string) => void;

        private inputFile: HTMLInputElement;
        private outputFile: HTMLInputElement;
        private reloadButton: HTMLInputElement;

        constructor() {
            this.inputFile = <HTMLInputElement> document.getElementById("inputFile");
            this.outputFile = <HTMLInputElement> document.getElementById("outputFile");
            this.reloadButton = <HTMLInputElement> document.getElementById("reloadButton");

            this.reloadFilesClosure = () => { this.reloadFiles(); };
            this. inputFile.addEventListener('change', this.reloadFilesClosure);
            this.outputFile.addEventListener('change', this.reloadFilesClosure);
            this.reloadButton.addEventListener('click', this.reloadFilesClosure);
        }

        private reloadFilesClosure: () => void;
        reloadFiles() {
            if (this.inputFile.files.length == 0 || this.outputFile.files.length == 0) return;
            loadFile(this.inputFile.files[0], (inputContent: string) => {
                loadFile(this.outputFile.files[0], (outputContent: string) => {
                    this. inputFile.removeEventListener('change', this.reloadFilesClosure);
                    this.outputFile.removeEventListener('change', this.reloadFilesClosure);
                    this.reloadButton.classList.remove('disabled');
                    if (this.callback !== undefined) {
                        this.callback(inputContent, outputContent);
                    }
                });
            });
        }
    }

    class RichSeekBar {
        public callback: (value: number) => void;

        private seekRange: HTMLInputElement;
        private seekNumber: HTMLInputElement;
        private fpsInput: HTMLInputElement;
        private firstButton: HTMLInputElement;
        private prevButton: HTMLInputElement;
        private playButton: HTMLInputElement;
        private nextButton: HTMLInputElement;
        private lastButton: HTMLInputElement;
        private runIcon: HTMLElement;
        private intervalId: number;
        private playClosure: () => void;
        private stopClosure: () => void;

        constructor() {
            this.seekRange  = <HTMLInputElement> document.getElementById("seekRange");
            this.seekNumber = <HTMLInputElement> document.getElementById("seekNumber");
            this.fpsInput = <HTMLInputElement> document.getElementById("fpsInput");
            this.firstButton = <HTMLInputElement> document.getElementById("firstButton");
            this.prevButton = <HTMLInputElement> document.getElementById("prevButton");
            this.playButton = <HTMLInputElement> document.getElementById("playButton");
            this.nextButton = <HTMLInputElement> document.getElementById("nextButton");
            this.lastButton = <HTMLInputElement> document.getElementById("lastButton");
            this.runIcon = document.getElementById("runIcon");
            this.intervalId = null;

            this.setMinMax(-1, -1);
            this.seekRange .addEventListener('change', () => { this.setValue(parseInt(this.seekRange .value)); });
            this.seekNumber.addEventListener('change', () => { this.setValue(parseInt(this.seekNumber.value)); });
            this.seekRange .addEventListener('input',  () => { this.setValue(parseInt(this.seekRange .value)); });
            this.seekNumber.addEventListener('input',  () => { this.setValue(parseInt(this.seekNumber.value)); });
            this.fpsInput.addEventListener('change', () => { if (this.intervalId !== null) { this.play(); } });
            this.firstButton.addEventListener('click', () => { this.stop(); this.setValue(this.getMin()); });
            this.prevButton .addEventListener('click', () => { this.stop(); this.setValue(this.getValue() - 1); });
            this.nextButton .addEventListener('click', () => { this.stop(); this.setValue(this.getValue() + 1); });
            this.lastButton .addEventListener('click', () => { this.stop(); this.setValue(this.getMax()); });
            this.playClosure = () => { this.play(); };
            this.stopClosure = () => { this.stop(); };
            this.playButton.addEventListener('click', this.playClosure);
        }

        public setMinMax(min: number, max: number) {
            this.seekRange.min   = this.seekNumber.min   = min.toString();
            this.seekRange.max   = this.seekNumber.max   = max.toString();
            this.seekRange.step  = this.seekNumber.step  = '1';
            this.setValue(min);
        }
        public getMin(): number {
            return parseInt(this.seekRange.min);
        }
        public getMax(): number {
            return parseInt(this.seekRange.max);
        }

        public setValue(value: number) {
            value = Math.max(this.getMin(),
                    Math.min(this.getMax(), value));  // clamp
            this.seekRange.value = this.seekNumber.value = value.toString();
            if (this.callback !== undefined) {
                this.callback(value);
            }
        }
        public getValue(): number {
            return parseInt(this.seekRange.value);
        }

        public getDelay(): number {
            const fps = parseInt(this.fpsInput.value);
            return Math.floor(1000 / fps);
        }
        private resetInterval() {
            if (this.intervalId !== undefined) {
                clearInterval(this.intervalId);
                this.intervalId = undefined;
            }
        }
        public play() {
            this.playButton.removeEventListener('click', this.playClosure);
            this.playButton.   addEventListener('click', this.stopClosure);
            this.runIcon.classList.remove('play');
            this.runIcon.classList.add('stop');
            if (this.getValue() == this.getMax()) {  // if last, go to first
                this.setValue(this.getMin());
            }
            this.resetInterval();
            this.intervalId = setInterval(() => {
                if (this.getValue() == this.getMax()) {
                    this.stop();
                } else {
                    this.setValue(this.getValue() + 1);
                }
            }, this.getDelay());
        }
        public stop() {
            this.playButton.removeEventListener('click', this.stopClosure);
            this.playButton.   addEventListener('click', this.playClosure);
            this.runIcon.classList.remove('stop');
            this.runIcon.classList.add('play');
            this.resetInterval();
        }
    }

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

    class FileExporter {
        constructor(canvas: HTMLCanvasElement, seek: RichSeekBar) {
            const saveAsImage = <HTMLInputElement> document.getElementById("saveAsImage");
            const saveAsVideo = <HTMLInputElement> document.getElementById("saveAsVideo");

            saveAsImage.addEventListener('click', () => {
                saveUrlAsLocalFile(canvas.toDataURL('image/png'), 'canvas.png');
            });

            saveAsVideo.addEventListener('click', () => {
                if (location.href.match(new RegExp('^file://'))) {
                    alert('to use this feature, you must re-open this file via "http://", instead of "file://". e.g. you can use "$ python -m SimpleHTTPServer 8000"');
                }
                seek.stop();
                const gif = new GIF();
                for (let i = seek.getMin(); i < seek.getMax(); ++ i) {
                    seek.setValue(i);
                    gif.addFrame(canvas, { copy: true, delay: seek.getDelay() });
                }
                gif.on('finished', function(blob) {
                    saveUrlAsLocalFile(URL.createObjectURL(blob), 'canvas.gif');
                });
                gif.render();
                alert('please wait for a while, about 2 minutes.');
            });
        }
    }

    export class App {
        public visualizer: Visualizer;
        public tester: Tester;
        public loader: FileSelector;
        public seek: RichSeekBar;
        public exporter: FileExporter;

        constructor() {
            this.visualizer = new Visualizer();
            this.loader = new FileSelector();
            this.seek = new RichSeekBar();
            this.exporter = new FileExporter(this.visualizer.getCanvas(), this.seek);

            this.seek.callback = (value: number) => {
                if (this.tester !== undefined) {
                    this.visualizer.draw(this.tester.frames[value]);
                }
            };

            this.loader.callback = (inputContent: string, outputContent: string) => {
                this.tester = new Tester(inputContent, outputContent);
                this.seek.setMinMax(0, this.tester.frames.length - 1);
                this.seek.setValue(0);
                this.seek.play();
            }
        }
    }
}

window.onload = () => {
    new visualizer.App();
};

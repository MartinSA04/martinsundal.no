"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
class SlidingBlockPart {
    constructor(x, y, x_pos, ypos, image, context) {
        this.x = x;
        this.y = y;
        this.x_pos = x_pos;
        this.y_pos = ypos;
        this.image = image;
        this.context = context;
    }
    draw() {
        this.context.drawImage(this.image, this.x, this.y);
    }
}
class SlidingBlockGame {
    constructor(image, context) {
        this.parts = [];
        this.current_empty = [0, 0];
        this.sub_width = 0;
        this.sub_height = 0;
        this.rows = 5;
        this.cols = 5;
        this.speed = 300;
        this.move_queue = [];
        this.runnning = false;
        this.image = image;
        this.context = context;
    }
    get x() {
        let bounding = this.image.getBoundingClientRect();
        return bounding.left;
    }
    get y() {
        let bounding = this.image.getBoundingClientRect();
        return bounding.top;
    }
    slice_image(rows = 5, cols = 5) {
        return __awaiter(this, void 0, void 0, function* () {
            this.sub_width = Math.floor(this.image.width / rows);
            this.sub_height = Math.floor(this.image.height / cols);
            this.rows = rows;
            this.cols = cols;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    if (i === rows - 1 && j === cols - 1) {
                        this.current_empty = [i, j];
                        continue;
                    }
                    const part = yield window.createImageBitmap(this.image, i * this.sub_width, j * this.sub_height, this.sub_width, this.sub_height);
                    this.parts.push(new SlidingBlockPart(i * this.sub_width, j * this.sub_height, i, j, part, this.context));
                }
            }
        });
    }
    draw() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.image.width, this.image.height);
        this.parts.forEach(part => {
            part.draw();
        });
    }
    get_part(x, y) {
        let part = this.parts.find(part => part.x_pos === x && part.y_pos === y);
        if (!part) {
            throw new Error('Part not found');
        }
        return part;
    }
    get_relevant_parts(x, y) {
        var parts = [];
        if (this.current_empty[0] === x && this.current_empty[1] === y) {
            return parts;
        }
        if (this.current_empty[0] !== x && this.current_empty[1] !== y) {
            return parts;
        }
        if (this.current_empty[0] === x) {
            const step = y > this.current_empty[1] ? -1 : 1;
            for (let col = y; col !== this.current_empty[1]; col += step) {
                parts.push(this.get_part(x, col));
            }
        }
        else {
            const step = x > this.current_empty[0] ? -1 : 1;
            for (let row = x; row !== this.current_empty[0]; row += step) {
                parts.push(this.get_part(row, y));
            }
        }
        return parts;
    }
    animate_move(parts, x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            const direction = this.current_empty[0] === x ? 'y' : 'x';
            if (direction === 'x') {
                var step = this.current_empty[0] > x ? 1 : -1;
                var delta = this.sub_width;
                parts.forEach(part => {
                    part.x_pos += step;
                });
            }
            else {
                var step = this.current_empty[1] > y ? 1 : -1;
                var delta = this.sub_height;
                parts.forEach(part => {
                    part.y_pos += step;
                });
            }
            let step_size = 3;
            if (this.speed < 100) {
                step_size = 10;
            }
            let interval_time = this.speed / (delta / step_size);
            console.log(interval_time);
            yield new Promise((resolve) => {
                const interval = setInterval(() => {
                    parts.forEach(part => {
                        part[direction] += step * step_size;
                    });
                    this.draw();
                    delta -= step_size;
                    if (delta < step_size) {
                        step_size = delta;
                    }
                    if (delta === 0) {
                        clearInterval(interval);
                        resolve();
                    }
                }, interval_time);
            });
        });
    }
    move(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            const parts = this.get_relevant_parts(x, y);
            if (parts.length === 0) {
                return false;
            }
            yield this.animate_move(parts, x, y);
            this.current_empty = [x, y];
            this.draw();
            return true;
        });
    }
    shuffle() {
        return __awaiter(this, void 0, void 0, function* () {
            this.speed = 50;
            for (let i = 0; i < 100; i++) {
                if (i % 2) {
                    var x = Math.floor(Math.random() * this.cols);
                    var y = this.current_empty[1];
                }
                else {
                    var x = this.current_empty[0];
                    var y = Math.floor(Math.random() * this.rows);
                }
                yield this.move(x, y);
            }
            this.speed = 300;
        });
    }
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.runnning = true;
            while (this.move_queue.length > 0) {
                const move = this.move_queue.shift();
                console.log(move);
                if (!move) {
                    break;
                }
                yield this.move(move[0], move[1]);
            }
            this.runnning = false;
        });
    }
    click(event) {
        const x = Math.floor((event.clientX - this.x) / this.sub_width);
        const y = Math.floor((event.clientY - this.y) / this.sub_height);
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return;
        }
        this.move_queue.push([x, y]);
        if (this.runnning === false) {
            this.activate();
        }
    }
}
let images = document.getElementsByTagName('img');
if (!images) {
    throw new Error('Images not found');
}
for (let i = 0; i < images.length; i++) {
    let image = images[i];
    const canvas = document.createElement('canvas');
    (_a = image.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas context not found');
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.backgroundColor = "rgba(0, 0, 0, 0)";
    canvas.width = image.width;
    canvas.height = image.height;
    let bounding = image.getBoundingClientRect();
    canvas.style.top = bounding.top + "px";
    canvas.style.left = bounding.left + "px";
    canvas.style.zIndex = "100";
    const slidingBlockGame = new SlidingBlockGame(image, context);
    slidingBlockGame.slice_image().then(() => {
        slidingBlockGame.draw();
    });
    let button = document.createElement('button');
    (_b = image.parentElement) === null || _b === void 0 ? void 0 : _b.appendChild(button);
    button.innerText = 'Shuffle';
    let button_style = window.getComputedStyle(button);
    button.style.position = 'absolute';
    button.style.top = bounding.top - parseInt(button_style.height) + "px";
    button.style.left = bounding.left + image.width / 2 - parseInt(button_style.width) / 2 - 5 + "px";
    button.addEventListener('click', () => {
        slidingBlockGame.shuffle();
    });
    canvas.addEventListener('click', (event) => {
        slidingBlockGame.click(event);
    });
}

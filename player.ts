const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
    throw new Error('Canvas not found');
}
const context = canvas.getContext('2d') as CanvasRenderingContext2D;
if (!context) {
    throw new Error('Canvas context not found');
}
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function add_polar_vectors(magnitude1: number, angle1: number, magnitude2: number, angle2: number) {
    let x = magnitude1 * Math.cos(angle1) + magnitude2 * Math.cos(angle2);
    let y = magnitude1 * Math.sin(angle1) + magnitude2 * Math.sin(angle2);
    let magnitude = Math.sqrt(x ** 2 + y ** 2);
    let angle = Math.atan2(y, x);
    return [magnitude, angle];
}

function set_context_font(style: CSSStyleDeclaration) {
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function collisionDetection(object1: GameObject, object2: TextObject) {
    // Determine the direction of the collision
    const dx = (object1.x + object1.width / 2) - (object2.x + object2.width / 2);
    const dy = (object1.y + object1.height / 2) - (object2.y + object2.height / 2);
    const width = (object1.width + object2.width) / 2;
    const height = (object1.height + object2.height) / 2;
    const crossWidth = width - Math.abs(dx);
    const crossHeight = height - Math.abs(dy);

    if (crossWidth < 0 || crossHeight < 0) {
        return false;
    }
    if (object1 instanceof GamePlayer) {
        if (crossWidth < crossHeight) {
            object2.x += dx > 0 ? -crossWidth-1 : crossWidth+1;
        }else{
            object2.y += dy > 0 ? -crossHeight-1 : crossHeight+1;
        }
        object2.speed = object1.speed.concat();
        return true;
    }
    let overlap_distance = Math.sqrt(crossWidth ** 2 + crossHeight ** 2);
    let rebound_factor = 1000;
    let angle = Math.atan2(dy, dx);
    let acceleration_vector2 = add_polar_vectors(
        object2.acceleration, object2.acceleration_angle, 
        overlap_distance * rebound_factor, angle
    );
    object2.acceleration_angle = acceleration_vector2[1] + Math.PI;
    object2.acceleration = acceleration_vector2[0];
    let acceleration_vector = add_polar_vectors(
        object1.acceleration, object1.acceleration_angle, 
        overlap_distance * rebound_factor, angle
    );
    object1.acceleration_angle = acceleration_vector[1];
    object1.acceleration = acceleration_vector[0];
    return true;
}


class GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number[] = [0, 0];
    acceleration_angle: number = 0;
    acceleration: number = 0;
    friction: number;

    constructor(x: number, y: number, width: number, height: number, friction: number = 0.95) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.friction = friction;
    }

    update_speed(dt: number) {
        this.speed[0] += this.acceleration * Math.cos(this.acceleration_angle) * dt / 1000;
        this.speed[1] += this.acceleration * Math.sin(this.acceleration_angle) * dt / 1000;

        // Slow down the object (friction)
        this.speed[0] *= Math.pow(this.friction, dt);
        this.speed[1] *= Math.pow(this.friction, dt);
    }

    update_position(dt: number) {
        this.x += this.speed[0] * dt / 1000;
        this.y += this.speed[1] * dt / 1000;
    }
}

class GamePlayer extends GameObject {
    color: string;
    text_array: TextObject[] = [];
    up: boolean = false;
    down: boolean = false;
    left: boolean = false;
    right: boolean = false;
    animation_second: number = 0;
    sprite_sheet: HTMLImageElement;

    constructor(x: number, y: number, width: number, height: number, color: string) {
        super(x, y, width, height, 0.995);
        this.color = color;
        this.sprite_sheet = new Image();
        this.sprite_sheet.src = 'assets/cropped.png';
    }

    async get_sprite() {
        let animation_step = Math.floor((this.animation_second / 250) % 4);
        console.log(animation_step);
        var sx = 0;
        if (this.acceleration_angle < Math.PI / 4 || this.acceleration_angle > 7 * Math.PI / 4) {
            var sy = 85;
        } else if (this.acceleration_angle < 3 * Math.PI / 4) {
            var sy = 0;
            sx += 8
        } else if (this.acceleration_angle < 5 * Math.PI / 4) {
            var sy = 28;
        } else {
            var sy = 57;
            sx += 8;
        }
        if (Math.abs(this.speed[0]) < 5 && Math.abs(this.speed[1]) < 5) {
            sx += 19;
        } else if (animation_step === 0) {
            sx += 19;
        } else if (animation_step === 1) {
            sx += 0;
        } else if (animation_step === 2) {
            sx += 19;
        } else if (animation_step === 3) {
            sx += 38;
        }
        if (!this.sprite_sheet.complete) {
            await new Promise((resolve, reject) => {
                this.sprite_sheet.onload = resolve;
                this.sprite_sheet.onerror = reject;
            });
        }
        let sprite = await window.createImageBitmap(this.sprite_sheet, sx, sy, 19, 26);
        return sprite;
    }

    async draw(dt: number) {
        this.animation_second += dt;
        this.animation_second %= 1000;
        let sprite = await this.get_sprite();
        context.drawImage(sprite, this.x, this.y, 18, 26);
        this.drawText();
    }
    
    async update(dt: number) {
        this.set_direction();
        const maxSpeed = Math.min(canvas.width, canvas.height) * 0.2; 
        
        // Add acceleration to the speed vector
        this.update_speed(dt);
        
        // Calculate the magnitude of the speed vector
        const speedMagnitude = Math.sqrt(this.speed[0] ** 2 + this.speed[1] ** 2);
        
        // Normalize the speed vector if its magnitude exceeds maxSpeed
        if (speedMagnitude > maxSpeed) {
            this.speed[0] = (this.speed[0] / speedMagnitude) * maxSpeed;
            this.speed[1] = (this.speed[1] / speedMagnitude) * maxSpeed;
        }
        
        // If the speed is very small, set it to 0
        if (Math.abs(this.speed[0]) < 0.00001) {
            this.speed[0] = 0;
        }
        if (Math.abs(this.speed[1]) < 0.00001) {
            this.speed[1] = 0;
        }
        
        // Move the player
        this.update_position(dt);
        
        this.check_text_collision();
        this.update_text_objects(dt);
        await this.draw(dt);
    }

    set_direction() {
        let dirs = [this.up, this.down, this.left, this.right];
        if (dirs.filter((dir) => dir).length > 2 || dirs.filter((dir) => dir).length == 0) {
            this.acceleration = 0;
            return;
        }
        this.acceleration = Math.min(canvas.width, canvas.height) * 1.2; 
        if (this.up && this.left) {
            this.acceleration_angle = 5/4 * Math.PI;
        } else if (this.up && this.right) {
            this.acceleration_angle = 7/4 * Math.PI;
        } else if (this.down && this.left) {
            this.acceleration_angle = 3/4 * Math.PI;
        } else if (this.down && this.right) {
            this.acceleration_angle = 1/4 * Math.PI;
        } else if (this.up) {
            this.acceleration_angle = 3/2 * Math.PI;
        } else if (this.down) {
            this.acceleration_angle = Math.PI/2;
        } else if (this.left) {
            this.acceleration_angle = Math.PI;
        } else if (this.right) {
            this.acceleration_angle = 0;
        };
    }

    keydown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowUp':
                this.up = true;
                break;
            case 'ArrowDown':
                this.down = true;
                break;
            case 'ArrowLeft':
                this.left = true;
                break;
            case 'ArrowRight':
                this.right = true;
                break;
        }
    }

    keyup(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowUp':
                this.up = false;
                break;
            case 'ArrowDown':
                this.down = false;
                break;
            case 'ArrowLeft':
                this.left = false;
                break;
            case 'ArrowRight':
                this.right = false;
                break;
        }
    }

    addText(text: TextObject | TextObject[]) {
        if (Array.isArray(text)) {
            this.text_array = this.text_array.concat(text);
            return
        }
        this.text_array.push(text);
    }

    drawText() {
        this.text_array.forEach((text) => {
            text.draw();
        });
    }

    reset_text_acceleration() {
        this.text_array.forEach((text) => {
            text.acceleration = 0;
        });
    }

    check_text_collision() {
        this.reset_text_acceleration();
        this.text_array.forEach((text, index) => {
            collisionDetection(this, text);
            this.text_array.slice(index + 1, -1).forEach((other_text) => {
                collisionDetection(text, other_text)
            });
        });
    }

    update_text_objects(dt: number) {
        this.text_array.forEach((text) => {
            text.update_speed(dt);
            text.update_position(dt);
        });
    }
}

class TextObject extends GameObject {
    text: string;
    style: CSSStyleDeclaration;

    constructor(text: string, style: CSSStyleDeclaration, x: number, y: number) {
        set_context_font(style);
        super(x, y, context.measureText(text).width, parseInt(style.fontSize));
        this.text = text;
        this.style = style;
    }

    draw() {
        context.textBaseline = 'hanging';
        context.fillStyle = this.style.color;
        set_context_font(this.style);
        context.fillText(this.text, this.x, this.y);
    }
}

function sort_words_to_lines(words: string[], width: number) {
    let lines: string[] = [];
    let line = '';
    words.forEach((word) => {
        if (context.measureText(line + ' ' + word).width > width) {
            lines.push(line);
            line = word;
        } else {
            line += ' ' + word;
        }
    });
    lines.push(line);
    return lines;
}

function create_section(text: string, bounding_rect: DOMRect, style: CSSStyleDeclaration) {
    let section: TextObject[] = [];
    let dx = 0;
    let dy = 0;

    const padding_left = style.paddingLeft ? parseInt(style.paddingLeft) : 0;
    const padding_top = style.paddingTop ? parseInt(style.paddingTop) : 0;
    const x = bounding_rect.x - padding_left;
    const y = bounding_rect.y - padding_top;
    const width = bounding_rect.width;
    const font_size = parseInt(style.fontSize);
    const centered = style.textAlign == 'center';
    const words = text.split(" ");

    set_context_font(style);
    const lines = sort_words_to_lines(words, width);
    lines.forEach((line) => {
        dx = 0;
        if (centered) {
            dx = (width - context.measureText(line).width) / 2;
        }
        line.split(" ").forEach((word) => {
            let word_object: TextObject[] = []; 
            word.split("").forEach((char) => {
                const text = new TextObject(char, style, x + dx, y + dy);
                dx += text.width + 0.01;
                word_object.push(text);
            });
            dx += context.measureText(" ").width;
            section = section.concat(word_object);
        }) 
        dy += font_size + 3;
    });

    return section;
}

function add_text_elements_from_html_object(html_object: Element) {
    const text = html_object.innerHTML;
    const bounding_rect = html_object.getBoundingClientRect();
    const style = window.getComputedStyle(html_object);
    const text_objects = create_section(text, bounding_rect, style);
    mainPlayer.addText(text_objects);
}

const mainPlayer = new GamePlayer(0, 0, 34, 52, 'red');
const body = document.body;
function iterate_html_collection(collection: HTMLCollection) {
    for (let i = 0; i < collection.length; i++) {
        let child = collection[i];
        switch (child.tagName) {
            case 'H1':
                add_text_elements_from_html_object(child);
                break;
            case 'H2':
                add_text_elements_from_html_object(child);
                break;
            case 'H3':
                add_text_elements_from_html_object(child);
                break;
            case 'H4':
                add_text_elements_from_html_object(child);
                break;
            case 'H5':
                add_text_elements_from_html_object(child);
                break;
            case 'H6':
                add_text_elements_from_html_object(child);
                break;
            case 'P':
                add_text_elements_from_html_object(child);
                break;
            case 'SPAN':
                add_text_elements_from_html_object(child);
                break;
        }
        if (child.children.length > 0) {
            iterate_html_collection(child.children);
        }
    }
}
iterate_html_collection(body.children);

async function updateGame(dt: number) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    await mainPlayer.update(dt);
}

window.addEventListener('keydown', mainPlayer.keydown.bind(mainPlayer));
window.addEventListener('keyup', mainPlayer.keyup.bind(mainPlayer));
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateGame(0);
});
let last_time = 0;
async function gameLoop(timestamp: number = 0) {
    let delta_time = timestamp - last_time;
    last_time = timestamp;
    await updateGame(delta_time);
    requestAnimationFrame(gameLoop);
}
// document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span').forEach((p) => {
//     (p as HTMLElement).style.color = 'rgba(0, 0, 0, 0)';
// });
gameLoop();
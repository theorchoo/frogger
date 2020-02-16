// Create a simple cross-browser polyfill for modern browsers' requestAnimationFrame()
// method to enable smooth, power-efficient animations. Credit to Paul Irish via
// http://bit.ly/req_anim_frame
window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();


const NUM_ROWS = 15;
const MAX_TIME = 60000;
const NUM_SLOTS = 4;
let GRID_SIZE = 50;
const LEFT = -1;
const RIGHT = 1;
const SPEED = {
    LOW: 0.03,
    MED: 0.05,
    HIGH: 0.07,
    ULTRA: 0.1,
};

function initCanvas() {
    const canvasWrapper = document.getElementById("gameInner");
    const canvas = document.getElementById("canvas");
    const bgCanvas = document.getElementById("background-canvas");

    GRID_SIZE = Math.floor(canvasWrapper.clientHeight / NUM_ROWS);
    canvas.width = GRID_SIZE * Math.floor(canvasWrapper.clientWidth / GRID_SIZE);
    canvas.height = GRID_SIZE * NUM_ROWS;
    canvas.style.top = ((canvasWrapper.clientHeight - canvas.height) / 2).toString() + "px";
    canvas.style.left = ((canvasWrapper.clientWidth - canvas.width) / 2).toString() + "px";

    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    bgCanvas.style.top = canvas.style.top;
    bgCanvas.style.left = canvas.style.left;

    const topBar = document.getElementById("topBar");
    topBar.style.paddingLeft = canvas.style.left;
    topBar.style.paddingRight = canvas.style.left;

    return {canvas: canvas, bgCanvas: bgCanvas};
}


class Gameboard {
    constructor(canvas, bgCanvas) {
        this.ctx = canvas.getContext("2d");
        this.bgCtx = bgCanvas.getContext("2d");
        this.height = canvas.height;
        this.width = canvas.width;
        this.rows = canvas.height / GRID_SIZE;
        this.columns = canvas.width / GRID_SIZE;
        this.freeze = false;
        this.lives = 5;
        this.score = 0;
        this.scoreText = document.getElementById("score");
        this.highscoreText = document.getElementById("highscore");
        this.lifeSprite = document.getElementById("life");
        this.startTime = (new Date()).getTime();

        this.initSlots();
        this.initRows();
        this.initPlayer();
        this.initEventListeners();
        this._lastTimeGameLoopRan = (new Date()).getTime();
        this.drawTopUI();
        this.drawGrid();
        this.gameLoop();
    }

    drawTopUI() {
        this.scoreText.innerText = this.score.toString();
    }

    drawBottomUI() {
        const life_size = GRID_SIZE * 0.6;
        const uiTop = (this.rows - 1) * GRID_SIZE;
        this.ctx.fillStyle = "#f3f3f3";
        this.ctx.fillRect(0, uiTop, this.width, GRID_SIZE);
        for (let j = 0; j < this.lives; j++) {
            this.ctx.drawImage(this.lifeSprite, 5 + (j * life_size), uiTop + (GRID_SIZE * 0.2), life_size, life_size);
        }

        const timeStart = 5 + (5 * life_size) + 10;
        const timeEnd = this.width - 5;
        const currentTime = (new Date()).getTime();
        const timeDifference = currentTime - this.startTime;
        const x = timeStart + ((timeEnd - timeStart) * timeDifference / MAX_TIME);
        this.ctx.fillStyle = "#ff0085";
        this.ctx.fillRect(x, uiTop + (GRID_SIZE * 0.2), Math.max(0, timeEnd - x), GRID_SIZE * 0.6);
        this.ctx.fillStyle = "#f3f3f3";
        this.ctx.font = Math.floor(GRID_SIZE * 0.4).toString() + "px Arcade Classic";
        this.ctx.textAlign = "end";
        this.ctx.fillText("TIME", timeEnd - 10, uiTop + (GRID_SIZE * 0.6));
        if (this.freeze) {
            return;
        }


        if (timeDifference > MAX_TIME) {
            this.death();
        }
    }

    reset() {
        if (this.lives <= 0) {
            this.gameOver();
            return;
        }
        for (let i = 0; i < this.obstacleRows.length; i++) {
            if (this.obstacleRows[i] !== null) {
                this.obstacleRows[i].reset();
            }
        }
        this.player.reset();
        this.startTime = (new Date()).getTime();
        this.freeze = false;
        this.gameLoop();
    }

    gameOver() {
        // handle game over
    }

    fullReset() {

    }

    drawGrid() {
        const img = document.getElementById("bg");
        const newHeight = this.height;
        const newWidth = (newHeight / img.height) * img.width;
        this.bgCtx.drawImage(img, 0, 0, newWidth, newHeight);
        if (newWidth < this.width) {
            this.bgCtx.drawImage(img, newWidth - 1, 0, newWidth, newHeight);
        }
    }

    initSlots() {
        this.slots = [];
        const spaceLeft = this.width - (GRID_SIZE * NUM_SLOTS);
        const gap = spaceLeft / (NUM_SLOTS + 1);
        let curX = gap;
        for (let i = 0; i < NUM_SLOTS; i++) {
            this.slots.push(new Hole(this.ctx, curX));
            curX += GRID_SIZE + gap;
        }
    }

    initPlayer() {
        this.player = new Player(this.rows, this.columns, this.ctx);
    }

    initRows() {
        this.obstacleRows = [
            null,
            null,
            new Row(this.columns, this.ctx, "redwine", 3, SPEED.MED, RIGHT, 2, true),
            new AnimatedRow(this.columns, this.ctx, ["redapple", "redapple_2", "redapple_3"], 2600, 1300, 2, SPEED.HIGH, LEFT, 2, true),
            new Row(this.columns, this.ctx, "whitewine", 5, SPEED.HIGH, RIGHT, 5, true),
            new Row(this.columns, this.ctx, "champagne", 2, SPEED.LOW, RIGHT, 3, true),
            new AnimatedRow(this.columns, this.ctx, ["greenapple", "greenapple_2", "greenapple_3"], 2200, 1000, 3, SPEED.MED, LEFT, 3, true),
            null,
            new Row(this.columns, this.ctx, "fishtail", 2, SPEED.LOW, LEFT, 5, false),
            new Row(this.columns, this.ctx, "bee2", 1, SPEED.ULTRA, RIGHT, 4, false),
            new Row(this.columns, this.ctx, "gefilte_big", 1, SPEED.MED, LEFT, 7, false),
            new Row(this.columns, this.ctx, "gefilte_small", 1, SPEED.LOW, RIGHT, 7, false),
            new Row(this.columns, this.ctx, "bee", 1, SPEED.MED, LEFT, 3, false),
            null
        ];
    }

    initEventListeners() {
        document.addEventListener('keyup', (e) => {
            this.onKey(e.key);
        })
    }

    onKey(key) {
        if (key === 'ArrowUp') {
            this.player.moveUp();
            this.score += 100;
        } else if (key === 'ArrowDown') {
            this.player.moveDown();
            this.score -= 10;
        } else if (key === 'ArrowLeft') {
            this.player.moveLeft();
        } else if (key === 'ArrowRight') {
            this.player.moveRight();
        }
        this.drawTopUI();
        this.checkCollisions();
        this.drawAll();
    }

    drawAll() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // draw slots
        for (let i = 0; i < this.slots.length; i++) {
            this.slots[i].draw();
        }
        // draw obstacles
        for (let i = 0; i < this.obstacleRows.length; i++) {
            if (this.obstacleRows[i] !== null) {
                this.obstacleRows[i].draw(i);
            }
        }
        this.player.draw();
        this.drawBottomUI();
    }

    doAnimation() {
        if (this.freeze) {

        } else {
            for (let i = 0; i < this.obstacleRows.length; i++) {
                if (this.obstacleRows[i] !== null) {
                    this.obstacleRows[i].animate();
                }
            }
        }
    }

    death() {
        this.freeze = true;
        this.player.die(
            () => { this.drawAll() },
            () => { setTimeout(() => { this.lives--; this.reset() }, 1000); }
        );
    }

    enteredSlot(slotNumber) {
        this.player.hide();
        this.score += 1000;
        this.slots[slotNumber].filled = true;
        this.freeze = true;
        setTimeout(() => { this.reset() }, 1000);
    }

    checkCollisions() {
        if (this.player.top < this.obstacleRows.length) {
            const curRow = this.obstacleRows[this.player.top];
            if (curRow === null) {
                // when in the slots row
                if (this.player.top === 1) {
                    for (let i=0; i< this.slots.length; i++) {
                        if (this.slots[i].isColliding(this.player.left)) {
                            this.enteredSlot(i);
                            return;
                        }
                    }
                    // final row but no hole was entered
                    this.death();
                }
                return;
            }
            const isCol = curRow.isColliding(this.player.left);
            if (curRow.invert) {
                if (isCol) {
                    this.player.moveOnObject(curRow.speed * curRow.direction);
                } else {
                    this.death();
                }
            } else {
                if (isCol) {
                    this.death();
                }
            }
        }
    }

    gameLoop() {
        const currentTime = (new Date()).getTime();
        const timeDifference = currentTime - this._lastTimeGameLoopRan;

        // Execute this function again when the next animation frame is ready for use by
        // the browser - keeps the game loop looping
        if (!this.freeze) {
            window.requestAnimationFrame(() => this.gameLoop());
        }

        // If the number of milliseconds passed exceeds the defined refresh rate, draw
        // the obstacles in the updated position on the game board and check for collisions
        if (timeDifference >= 20) {
            this.doAnimation();
            this.checkCollisions();
            this.drawAll();
            // Store the current time for later comparisons to keep the frame rate smooth
            this._lastTimeGameLoopRan = currentTime;
        }
    }
}


class Row {
    constructor(columns, ctx, imageName, width, speed, direction, gap, invert = false) {
        this.columns = columns;
        this.direction = direction;
        this.ctx = ctx;
        this.sprite = document.getElementById(imageName);
        this.width = width;
        this.speed = speed;
        this.gap = Math.min(gap, columns);
        this.invert = invert;
        this.reset();
    }

    reset() {
        this.locs = [];
        const number = Math.ceil(this.columns / (this.width + this.gap));
        for (let i = 0; i < number; i++) {
            this.locs.push(i * (this.width + this.gap));
        }
    }

    draw(rowNumber) {
        for (let i = 0; i < this.locs.length; i++) {
            this.ctx.drawImage(this.sprite, this.locs[i] * GRID_SIZE, rowNumber * GRID_SIZE, this.width * GRID_SIZE, GRID_SIZE);
        }
    }

    animate() {
        for (let i = 0; i < this.locs.length; i++) {
            this.locs[i] += this.speed * this.direction;
            if (this.direction === RIGHT && this.locs[i] >= this.columns) {
                this.locs[i] = -this.width;
            }
            if (this.direction === LEFT && this.locs[i] + this.width <= 0) {
                this.locs[i] = this.columns;
            }
        }
    }

    isColliding(playerLoc) {
        for (let i = 0; i < this.locs.length; i++) {
            if (this.locs[i] <= (playerLoc + 1) && playerLoc <= this.locs[i] + this.width) {
                return true
            }
        }
        return false
    }
}


class AnimatedRow {
    constructor(columns, ctx, imageNames, onTime, offTime, width, speed, direction, gap, invert=false) {
        this.columns = columns;
        this.direction = direction;
        this.onTime = onTime;
        this.offTime = offTime;
        this.ctx = ctx;
        this.sprites = imageNames.map((x) => document.getElementById(x));
        this.sprites.push(null);
        this.curSprite = 0;
        this.width = width;
        this.speed = speed;
        this.gap = Math.min(gap, columns);
        this.invert = invert;
        this.reset();
    }

    reset() {
        this.lastSwitch = (new Date()).getTime();
        this.whileTurning = false;
        this.shown = true;
        this.locs = [];
        const number = Math.ceil(this.columns / (this.width + this.gap));
        for (let i = 0; i < number; i++) {
            this.locs.push(i * (this.width + this.gap));
        }
    }

    draw(rowNumber) {
        if (this.sprites[this.curSprite] === null) {
            return;
        }
        for (let i = 0; i < this.locs.length; i++) {
            this.ctx.drawImage(this.sprites[this.curSprite], this.locs[i] * GRID_SIZE, rowNumber * GRID_SIZE, this.width * GRID_SIZE, GRID_SIZE);
        }
    }

    turn() {
        this.whileTurning = true;
        if (this.shown) {
            this.curSprite = Math.min(this.curSprite + 1, this.sprites.length - 1);
        } else {
            this.curSprite = Math.max(this.curSprite - 1, 0);
        }

        if (this.curSprite > 0 && this.curSprite < this.sprites.length - 1) {
            setTimeout(() => { this.turn() }, 100);
        } else {
            this.shown = !this.shown;
            this.whileTurning = false;
            this.lastSwitch = (new Date()).getTime();
        }
    }

    animate() {
        const timeDifference = (new Date()).getTime() - this.lastSwitch;
        if ((this.shown && timeDifference > this.onTime) ||
            (!this.shown && timeDifference > this.offTime)) {
            if (!this.whileTurning) {
                this.turn();
            }
        }

        for (let i = 0; i < this.locs.length; i++) {
            this.locs[i] += this.speed * this.direction;
            if (this.direction === RIGHT && this.locs[i] >= this.columns) {
                this.locs[i] = -this.width;
            }
            if (this.direction === LEFT && this.locs[i] + this.width <= 0) {
                this.locs[i] = this.columns;
            }
        }
    }

    isColliding(playerLoc) {
        if (!this.shown && this.invert) {
            return false;
        }
        for (let i = 0; i < this.locs.length; i++) {
            if (this.locs[i] <= (playerLoc + 1) && playerLoc <= this.locs[i] + this.width) {
                return true
            }
        }
        return false
    }
}


class Hole {
    constructor(ctx, left) {
        this.ctx = ctx;
        this.sprite = document.getElementById("hole");
        this.spriteFilled = document.getElementById("holeFilled");
        this.left = left;
        this.filled = false;
    }

    draw() {
        this.ctx.drawImage(this.filled ? this.spriteFilled : this.sprite, this.left, 0, GRID_SIZE, 2 * GRID_SIZE);
    }

    isColliding(playerLoc) {
        if (this.filled) {
            return false;
        }
        return (this.left - 10 < playerLoc * GRID_SIZE && playerLoc * GRID_SIZE < this.left + 10)
    }
}

class Player {
    constructor(rows, columns, ctx) {
        this.rows = rows;
        this.columns = columns;
        this.ctx = ctx;
        this.sprite = {
            UP1: document.getElementById("charUp1"),
            UP2: document.getElementById("charUp2"),
            DOWN1: document.getElementById("charDown1"),
            DOWN2: document.getElementById("charDown2"),
            LEFT1: document.getElementById("charLeft1"),
            LEFT2: document.getElementById("charLeft2"),
            RIGHT1: document.getElementById("charRight1"),
            RIGHT2: document.getElementById("charRight2"),
            DEATH1: document.getElementById("death1"),
            DEATH2: document.getElementById("death2"),
            DEATH3: document.getElementById("death3"),
        };
        this.curSprite = this.sprite.UP1;
        this.reset()
    }

    reset() {
        this.left = Math.floor(this.columns / 2);
        this.top = this.rows - 2;
        this.hidden = false;
        this.curSprite = this.sprite.UP1;
    }

    die(animCallback, doneCallback) {
        this.curSprite = this.sprite.DEATH1;
        animCallback();
        setTimeout(() => {
            this.curSprite = this.sprite.DEATH2;
            animCallback();
            setTimeout(() => {
                this.curSprite = this.sprite.DEATH3;
                animCallback();
                doneCallback();
            }, 180)
        }, 180);
    }

    hide() {
        this.hidden = true;
    }

    draw() {
        if (!this.hidden) {
            this.ctx.drawImage(this.curSprite, this.left * GRID_SIZE, this.top * GRID_SIZE, GRID_SIZE, GRID_SIZE)
        }
    }

    moveUp() {
        this.top = Math.max(this.top - 1, 1);
        this.curSprite = this.sprite.UP2;
        setTimeout(() => { this.curSprite = this.sprite.UP1 }, 120);
    }

    moveDown() {
        this.top = Math.min(this.top + 1, this.rows - 2);
        this.curSprite = this.sprite.DOWN2;
        setTimeout(() => { this.curSprite = this.sprite.DOWN1 }, 120);
    }

    moveLeft() {
        this.left = Math.max(this.left - 1, 0);
        this.curSprite = this.sprite.LEFT2;
        setTimeout(() => { this.curSprite = this.sprite.LEFT1}, 120);
    }

    moveRight() {
        this.left = Math.min(this.left + 1, this.columns - 1);
        this.curSprite = this.sprite.RIGHT2;
        setTimeout(() => { this.curSprite = this.sprite.RIGHT1 }, 120);
    }

    moveOnObject(amount) {
        this.left = Math.min(this.columns - 1, Math.max(0, this.left + amount));
    }
}

const canvases = initCanvas();
const gameboard = new Gameboard(canvases.canvas, canvases.bgCanvas);

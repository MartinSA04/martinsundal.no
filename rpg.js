// Top-down RPG that plays out on the live page. Solid DOM elements act as walls;
// the camera follows the player by scrolling the window. Two sprites sit on the
// Cipherbound screenshot in ambient mode and become controllable on Konami.
// Exposes window.MSA_RPG = { start, stop, isActive, Entity, Player, Game }.
(function () {
  "use strict";

  const DEFAULT_ENTITY_SIZE = 40;
  // The screenshot shows 32px RPG sprites captured at 4x scale.
  const CIPHERBOUND_SPRITE_SOURCE_SIZE = 128;
  const CIPHERBOUND_SPRITE_SCALE = 1.5;
  const SPRITE_FRAME_SIZE = 32;
  const SPRITE_FRAMES = 4;
  const ANIM_FPS = 8;

  const PLAYER_SPEED = 240;
  const ATTACK_DURATION = 0.18;
  const ATTACK_REACH = 24;
  const CAMERA_MARGIN = 160;

  const COLLISION_SELECTORS = [
    ".site-header",
    ".card",
    ".project-card",
    ".contact-link",
    ".btn",
    ".theme-toggle",
    ".nav-toggle",
    "footer.site-footer",
  ].join(",");

  const COLLISION_EXCLUDE_ANCESTOR = "#home, [data-rpg-spawn]";
  const SPAWN_SELECTOR = "[data-rpg-spawn]";

  // Ambient sprite anchor points expressed as fractions of the cipherbound image.
  const PLAYER_AMBIENT_POS = { x: 0.54, y: 0.68 };
  const GIRL_AMBIENT_POS = { x: 0.68, y: 0.38 };

  const SPRITE_ROW = { down: 0, up: 1, left: 2, right: 3 };
  const DIR_VECTORS = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };

  const SHEETS = {
    player: createSheet("assets/player_sheet.png"),
    girl: createSheet("assets/girl_sheet.png"),
  };

  function createSheet(src) {
    const image = new Image();
    image.src = src;
    return { src, image };
  }

  function drawSprite(ctx, sheet, direction, frame, dx, dy, dw, dh) {
    if (!sheet?.image?.complete || sheet.image.naturalWidth === 0) {
      ctx.fillStyle = "#ff5566";
      ctx.fillRect(dx, dy, dw, dh);
      return;
    }
    const row = SPRITE_ROW[direction] ?? 0;
    const col = ((frame % SPRITE_FRAMES) + SPRITE_FRAMES) % SPRITE_FRAMES;
    ctx.drawImage(
      sheet.image,
      col * SPRITE_FRAME_SIZE,
      row * SPRITE_FRAME_SIZE,
      SPRITE_FRAME_SIZE,
      SPRITE_FRAME_SIZE,
      dx,
      dy,
      dw,
      dh,
    );
  }

  class Entity {
    constructor(opts) {
      this.x = opts.x;
      this.y = opts.y;
      this.width = opts.width ?? opts.size ?? DEFAULT_ENTITY_SIZE;
      this.height = opts.height ?? opts.size ?? DEFAULT_ENTITY_SIZE;
      this.kind = opts.kind ?? "generic";
      this.direction = opts.direction ?? "down";
      this.solid = opts.solid !== false;
      this.sheet = opts.sheet ?? null;
      this.spriteSize = opts.spriteSize ?? Math.max(this.width, this.height);
      this.frame = 0;
      this.frameTime = 0;
    }

    update(_dt, _game) {}
    onAttacked(_attacker, _game) {}

    draw(ctx, screenX, screenY) {
      const dw = this.spriteSize;
      const dh = this.spriteSize;
      const dx = screenX + (this.width - dw) / 2;
      const dy = screenY + this.height - dh;
      drawSprite(ctx, this.sheet, this.direction, this.frame, dx, dy, dw, dh);
    }
  }

  class Player extends Entity {
    constructor(opts = {}) {
      const size = opts.size ?? opts.width ?? DEFAULT_ENTITY_SIZE;
      super({
        ...opts,
        kind: "player",
        sheet: SHEETS.player,
        width: opts.width ?? size,
        height: opts.height ?? size,
        spriteSize: opts.spriteSize ?? size,
      });
      this.speed = PLAYER_SPEED;
      this.maxHealth = 6;
      this.health = 6;
      this.attackTimer = 0;
    }

    update(dt, game) {
      if (this.attackTimer > 0) {
        this.attackTimer = Math.max(0, this.attackTimer - dt);
      }
      if (game.input.consumeAttack() && this.attackTimer === 0) {
        this.attackTimer = ATTACK_DURATION;
        this._resolveAttack(game);
      }

      const dir = game.input.heldDirection();
      let moved = false;
      if (dir) {
        this.direction = dir;
        const [dx, dy] = DIR_VECTORS[dir];
        const step = this.speed * dt;
        if (dx !== 0) {
          const nx = this.x + dx * step;
          if (game.canPlayerBeAt(nx, this.y, this)) {
            this.x = nx;
            moved = true;
          }
        }
        if (dy !== 0) {
          const ny = this.y + dy * step;
          if (game.canPlayerBeAt(this.x, ny, this)) {
            this.y = ny;
            moved = true;
          }
        }
      }

      if (moved) {
        this.frameTime += dt;
        this.frame = Math.floor(this.frameTime * ANIM_FPS) % SPRITE_FRAMES;
      } else {
        this.frame = 0;
        this.frameTime = 0;
      }
    }

    _resolveAttack(game) {
      const [dx, dy] = DIR_VECTORS[this.direction];
      const cx = this.x + this.width / 2 + dx * (this.width / 2 + ATTACK_REACH / 2);
      const cy = this.y + this.height / 2 + dy * (this.height / 2 + ATTACK_REACH / 2);
      for (const e of game.entities) {
        if (e === this) continue;
        if (
          cx >= e.x &&
          cx <= e.x + e.width &&
          cy >= e.y &&
          cy <= e.y + e.height
        ) {
          e.onAttacked(this, game);
          break;
        }
      }
    }
  }

  class Input {
    constructor() {
      this.held = new Set();
      this.priority = [];
      this._attackQueued = false;
    }

    bind() {
      this._down = (e) => this._handleDown(e);
      this._up = (e) => this._handleUp(e);
      window.addEventListener("keydown", this._down);
      window.addEventListener("keyup", this._up);
    }

    unbind() {
      window.removeEventListener("keydown", this._down);
      window.removeEventListener("keyup", this._up);
      this.held.clear();
      this.priority.length = 0;
      this._attackQueued = false;
    }

    heldDirection() {
      return this.priority.length ? this.priority[this.priority.length - 1] : null;
    }

    consumeAttack() {
      const value = this._attackQueued;
      this._attackQueued = false;
      return value;
    }

    _handleDown(event) {
      if (event.repeat) return;
      const dir = this._keyToDir(event.key);
      if (dir) {
        event.preventDefault();
        if (!this.held.has(dir)) {
          this.held.add(dir);
          this.priority.push(dir);
        }
        return;
      }
      if (event.key === " " || event.key === "z" || event.key === "Z") {
        event.preventDefault();
        this._attackQueued = true;
      }
    }

    _handleUp(event) {
      const dir = this._keyToDir(event.key);
      if (!dir) return;
      this.held.delete(dir);
      this.priority = this.priority.filter((d) => d !== dir);
    }

    _keyToDir(key) {
      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          return "up";
        case "ArrowDown":
        case "s":
        case "S":
          return "down";
        case "ArrowLeft":
        case "a":
        case "A":
          return "left";
        case "ArrowRight":
        case "d":
        case "D":
          return "right";
        default:
          return null;
      }
    }
  }

  class Game {
    constructor() {
      this.canvas = document.createElement("canvas");
      Object.assign(this.canvas.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "9999",
      });
      this.ctx = this.canvas.getContext("2d");
      this.input = new Input();
      this.entities = [];
      this.player = new Player({ x: 0, y: 0 });
      this.entities.push(this.player);
      this.collisionRects = [];
      this.cameraX = 0;
      this.cameraY = 0;
      this.running = false;
      this.lastTime = 0;
      this._customSpawn = null;
    }

    setSpawn(playerPos, npcs = []) {
      this._customSpawn = { playerPos, npcs };
    }

    addEntity(entity) {
      this.entities.push(entity);
      return entity;
    }

    removeEntity(entity) {
      const idx = this.entities.indexOf(entity);
      if (idx !== -1) this.entities.splice(idx, 1);
    }

    refreshCollisionRects() {
      const rects = [];
      document.querySelectorAll(COLLISION_SELECTORS).forEach((el) => {
        if (el.closest(COLLISION_EXCLUDE_ANCESTOR)) return;
        const position = getComputedStyle(el).position;
        if (position === "fixed" || position === "sticky") return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        rects.push({
          left: r.left + window.scrollX,
          top: r.top + window.scrollY,
          right: r.right + window.scrollX,
          bottom: r.bottom + window.scrollY,
        });
      });
      this.collisionRects = rects;
    }

    canPlayerBeAt(x, y, entity) {
      const left = x;
      const top = y;
      const right = x + entity.width;
      const bottom = y + entity.height;

      const docW = Math.max(
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      );
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight,
      );
      if (left < 0 || top < 0 || right > docW || bottom > docH) return false;

      for (const r of this.collisionRects) {
        if (left < r.right && right > r.left && top < r.bottom && bottom > r.top) {
          return false;
        }
      }

      for (const other of this.entities) {
        if (other === entity || !other.solid) continue;
        if (
          left < other.x + other.width &&
          right > other.x &&
          top < other.y + other.height &&
          bottom > other.y
        ) {
          return false;
        }
      }

      return true;
    }

    start() {
      if (this.running) return;
      document.body.appendChild(this.canvas);
      this._resizeCanvas();

      this._previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";

      this.refreshCollisionRects();
      this._placePlayer();

      this.input.bind();

      this._onResize = () => {
        this._resizeCanvas();
        this.refreshCollisionRects();
      };
      this._onWheel = (event) => event.preventDefault();
      window.addEventListener("resize", this._onResize);
      window.addEventListener("wheel", this._onWheel, { passive: false });
      window.addEventListener("touchmove", this._onWheel, { passive: false });

      this.running = true;
      this.lastTime = performance.now();
      this._frame = (t) => this._tick(t);
      requestAnimationFrame(this._frame);
    }

    stop() {
      if (!this.running) return;
      this.running = false;
      this.input.unbind();
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("wheel", this._onWheel);
      window.removeEventListener("touchmove", this._onWheel);
      document.documentElement.style.scrollBehavior = this._previousScrollBehavior ?? "";
      this.canvas.remove();
    }

    _resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx.imageSmoothingEnabled = false;
    }

    _placePlayer() {
      if (this._customSpawn) {
        const { playerPos, npcs } = this._customSpawn;
        this.player.x = playerPos.x;
        this.player.y = playerPos.y;
        applyEntitySize(this.player, playerPos);
        npcs.forEach((spec) => {
          const npcSize = spec.size ?? spec.width ?? DEFAULT_ENTITY_SIZE;
          this.addEntity(
            new Entity({
              x: spec.x,
              y: spec.y,
              kind: spec.kind ?? "npc",
              sheet: spec.sheet,
              direction: spec.direction ?? "down",
              width: spec.width ?? npcSize,
              height: spec.height ?? npcSize,
              spriteSize: spec.spriteSize ?? npcSize,
            }),
          );
        });
        this._centerCameraOnPlayer();
        return;
      }

      const spawnEl = document.querySelector(SPAWN_SELECTOR);
      const target = spawnEl?.querySelector("img") ?? spawnEl;

      if (target) {
        if (target instanceof HTMLImageElement) {
          applyEntitySize(this.player, { size: getCipherboundSpriteSize(target) });
        }
        const r = target.getBoundingClientRect();
        const docCx = r.left + window.scrollX + r.width / 2;
        const docCy = r.top + window.scrollY + r.height / 2;
        this.player.x = docCx - this.player.width / 2;
        this.player.y = docCy - this.player.height / 2;
        this._centerCameraOnPlayer();
        return;
      }

      const cx = window.scrollX + window.innerWidth / 2 - this.player.width / 2;
      const cy = window.scrollY + window.innerHeight / 2 - this.player.height / 2;
      const candidate = this._findOpenSpot(cx, cy, this.player);
      this.player.x = candidate.x;
      this.player.y = candidate.y;
      this.cameraX = window.scrollX;
      this.cameraY = window.scrollY;
    }

    _centerCameraOnPlayer() {
      const docCx = this.player.x + this.player.width / 2;
      const docCy = this.player.y + this.player.height / 2;
      const maxX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      this.cameraX = Math.max(0, Math.min(docCx - window.innerWidth / 2, maxX));
      this.cameraY = Math.max(0, Math.min(docCy - window.innerHeight / 2, maxY));
      window.scrollTo(Math.round(this.cameraX), Math.round(this.cameraY));
    }

    _findOpenSpot(startX, startY, entity) {
      if (this.canPlayerBeAt(startX, startY, entity)) {
        return { x: startX, y: startY };
      }
      const step = 8;
      const maxRadius = Math.max(window.innerWidth, window.innerHeight);
      for (let radius = step; radius <= maxRadius; radius += step) {
        for (let angle = 0; angle < 360; angle += 30) {
          const rad = (angle * Math.PI) / 180;
          const x = startX + Math.cos(rad) * radius;
          const y = startY + Math.sin(rad) * radius;
          if (this.canPlayerBeAt(x, y, entity)) return { x, y };
        }
      }
      return { x: startX, y: startY };
    }

    _tick(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this._update(dt);
      this._render();
      requestAnimationFrame(this._frame);
    }

    _update(dt) {
      for (const e of this.entities) e.update(dt, this);
      this._updateCamera();
    }

    _updateCamera() {
      const cx = this.player.x + this.player.width / 2;
      const cy = this.player.y + this.player.height / 2;
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;

      const leftEdge = this.cameraX + CAMERA_MARGIN;
      const rightEdge = this.cameraX + viewW - CAMERA_MARGIN;
      if (cx < leftEdge) this.cameraX -= leftEdge - cx;
      else if (cx > rightEdge) this.cameraX += cx - rightEdge;

      const topEdge = this.cameraY + CAMERA_MARGIN;
      const bottomEdge = this.cameraY + viewH - CAMERA_MARGIN;
      if (cy < topEdge) this.cameraY -= topEdge - cy;
      else if (cy > bottomEdge) this.cameraY += cy - bottomEdge;

      const maxX = Math.max(0, document.documentElement.scrollWidth - viewW);
      const maxY = Math.max(0, document.documentElement.scrollHeight - viewH);
      this.cameraX = Math.max(0, Math.min(this.cameraX, maxX));
      this.cameraY = Math.max(0, Math.min(this.cameraY, maxY));

      window.scrollTo(Math.round(this.cameraX), Math.round(this.cameraY));
    }

    _render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const e of this.entities) {
        const sx = Math.round(e.x - this.cameraX);
        const sy = Math.round(e.y - this.cameraY);
        e.draw(ctx, sx, sy);
      }

      if (this.player.attackTimer > 0) {
        const sx = Math.round(this.player.x - this.cameraX);
        const sy = Math.round(this.player.y - this.cameraY);
        const [dx, dy] = DIR_VECTORS[this.player.direction];
        const swing = ATTACK_REACH;
        let rx;
        let ry;
        if (dx > 0) {
          rx = sx + this.player.width;
          ry = sy + (this.player.height - swing) / 2;
        } else if (dx < 0) {
          rx = sx - swing;
          ry = sy + (this.player.height - swing) / 2;
        } else if (dy > 0) {
          rx = sx + (this.player.width - swing) / 2;
          ry = sy + this.player.height;
        } else {
          rx = sx + (this.player.width - swing) / 2;
          ry = sy - swing;
        }
        ctx.fillStyle = "#fff7c4";
        ctx.fillRect(rx, ry, swing, swing);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx + 0.5, ry + 0.5, swing - 1, swing - 1);
      }

      this._renderHUD();
    }

    _renderHUD() {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(12, 12, 168, 30);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(12.5, 12.5, 167, 29);

      ctx.fillStyle = "#fff";
      ctx.font = '14px "Silkscreen", monospace';
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const filled = "♥".repeat(this.player.health);
      const empty = "♡".repeat(Math.max(0, this.player.maxHealth - this.player.health));
      ctx.fillText(`${filled}${empty}`, 22, 27);

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText("Esc to exit", this.canvas.width - 14, 24);
    }
  }

  // === Ambient sprite layer (DOM-based, visible until Konami) ===

  let ambient = null;

  function ensureAmbientLayer() {
    if (ambient) return ambient;
    const article = document.querySelector(SPAWN_SELECTOR);
    if (!article) return null;
    const img = article.querySelector("img");
    if (!img) return null;

    if (getComputedStyle(article).position === "static") {
      article.style.position = "relative";
    }

    const playerEl = createAmbientSpriteEl(SHEETS.player);
    const girlEl = createAmbientSpriteEl(SHEETS.girl);
    article.appendChild(playerEl);
    article.appendChild(girlEl);

    ambient = { article, img, playerEl, girlEl };

    const update = () => positionAmbient();
    window.addEventListener("resize", update);
    if (!img.complete) img.addEventListener("load", update);
    positionAmbient();
    return ambient;
  }

  function createAmbientSpriteEl(sheet) {
    const el = document.createElement("div");
    el.className = "rpg-ambient-sprite";
    Object.assign(el.style, {
      position: "absolute",
      backgroundImage: `url(${sheet.src})`,
      backgroundSize: "400% 400%",
      backgroundPosition: "0% 0%",
      imageRendering: "pixelated",
      pointerEvents: "none",
      transform: "translate(-50%, -100%)",
      zIndex: "2",
    });
    return el;
  }

  function positionAmbient() {
    if (!ambient) return;
    const { article, img, playerEl, girlEl } = ambient;
    const articleRect = article.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const localLeft = imgRect.left - articleRect.left;
    const localTop = imgRect.top - articleRect.top;
    const spriteSize = getCipherboundSpriteSize(img, imgRect);

    playerEl.style.width = `${spriteSize}px`;
    playerEl.style.height = `${spriteSize}px`;
    girlEl.style.width = `${spriteSize}px`;
    girlEl.style.height = `${spriteSize}px`;

    playerEl.style.left = `${localLeft + PLAYER_AMBIENT_POS.x * imgRect.width}px`;
    playerEl.style.top = `${localTop + PLAYER_AMBIENT_POS.y * imgRect.height}px`;
    girlEl.style.left = `${localLeft + GIRL_AMBIENT_POS.x * imgRect.width}px`;
    girlEl.style.top = `${localTop + GIRL_AMBIENT_POS.y * imgRect.height}px`;
  }

  function getAmbientFeet() {
    if (!ambient) return null;
    const playerRect = ambient.playerEl.getBoundingClientRect();
    const girlRect = ambient.girlEl.getBoundingClientRect();
    return {
      player: {
        x: playerRect.left + window.scrollX + playerRect.width / 2,
        y: playerRect.bottom + window.scrollY,
        width: playerRect.width,
        height: playerRect.height,
      },
      girl: {
        x: girlRect.left + window.scrollX + girlRect.width / 2,
        y: girlRect.bottom + window.scrollY,
        width: girlRect.width,
        height: girlRect.height,
      },
    };
  }

  function getCipherboundSpriteSize(img, rect = img.getBoundingClientRect()) {
    const naturalWidth = img.naturalWidth || Number(img.getAttribute("width")) || 0;
    const naturalHeight = img.naturalHeight || Number(img.getAttribute("height")) || 0;
    if (!naturalWidth || !naturalHeight || rect.width === 0 || rect.height === 0) {
      return DEFAULT_ENTITY_SIZE;
    }

    const xScale = rect.width / naturalWidth;
    const yScale = rect.height / naturalHeight;
    const objectFit = getComputedStyle(img).objectFit;
    let imageScale;

    if (objectFit === "contain" || objectFit === "scale-down") {
      imageScale = Math.min(xScale, yScale);
    } else if (objectFit === "none") {
      imageScale = 1;
    } else if (objectFit === "fill") {
      imageScale = Math.sqrt(xScale * yScale);
    } else {
      imageScale = Math.max(xScale, yScale);
    }

    return Math.max(
      1,
      Math.round(CIPHERBOUND_SPRITE_SOURCE_SIZE * imageScale * CIPHERBOUND_SPRITE_SCALE),
    );
  }

  function applyEntitySize(entity, spec) {
    const size = spec.size ?? spec.width ?? DEFAULT_ENTITY_SIZE;
    entity.width = spec.width ?? size;
    entity.height = spec.height ?? size;
    entity.spriteSize = spec.spriteSize ?? Math.max(entity.width, entity.height);
  }

  function setAmbientVisible(visible) {
    if (!ambient) return;
    ambient.playerEl.style.visibility = visible ? "" : "hidden";
    ambient.girlEl.style.visibility = visible ? "" : "hidden";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureAmbientLayer);
  } else {
    ensureAmbientLayer();
  }

  // === Public entry points ===

  let active = null;

  function start() {
    if (active) return;
    ensureAmbientLayer();
    const feet = getAmbientFeet();

    const game = new Game();

    if (feet) {
      const playerSpawn = {
        x: feet.player.x - feet.player.width / 2,
        y: feet.player.y - feet.player.height,
        width: feet.player.width,
        height: feet.player.height,
        spriteSize: Math.max(feet.player.width, feet.player.height),
      };
      const girlSpawn = {
        x: feet.girl.x - feet.girl.width / 2,
        y: feet.girl.y - feet.girl.height,
        width: feet.girl.width,
        height: feet.girl.height,
        spriteSize: Math.max(feet.girl.width, feet.girl.height),
        kind: "girl",
        sheet: SHEETS.girl,
      };
      game.setSpawn(playerSpawn, [girlSpawn]);
    }

    setAmbientVisible(false);
    game.start();

    const escHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", escHandler);

    active = { game, escHandler };
  }

  function stop() {
    if (!active) return;
    window.removeEventListener("keydown", active.escHandler);
    active.game.stop();
    setAmbientVisible(true);
    active = null;
  }

  function isActive() {
    return active !== null;
  }

  window.MSA_RPG = { start, stop, isActive, Entity, Player, Game };
})();

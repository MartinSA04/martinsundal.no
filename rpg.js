// Top-down RPG that plays out on the live page. Solid DOM elements act as walls;
// the camera follows the player by scrolling the window. A canvas is mounted on
// boot for static sprites and only starts animating once Konami activates play.
// Exposes window.MSA_RPG = { start, stop, isActive, Entity, Player, Game }.
(function () {
  "use strict";

  const DEFAULT_ENTITY_SIZE = 40;
  // The screenshot shows 32px RPG sprites captured at 4x scale.
  const CIPHERBOUND_SPRITE_SOURCE_SIZE = 128;
  const CIPHERBOUND_SPRITE_SCALE = 1.5;
  const ENTITY_HITBOX_WIDTH_RATIO = 0.42;
  const ENTITY_HITBOX_HEIGHT_RATIO = 0.34;
  const SPRITE_FRAME_SIZE = 32;
  const SPRITE_FRAMES = 4;
  const ANIM_FPS = 8;

  const PLAYER_SPEED = 240;
  const ATTACK_DURATION = 0.18;
  const ATTACK_REACH = 24;
  const CAMERA_MARGIN = 160;
  const DIALOGUE_DURATION = 4.2;
  const GIRL_DIALOGUE = "So you know the code. Welcome behind the page.";

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
      const spriteSize = getEntitySpriteSize(opts);
      const hitbox = getEntityHitbox(opts, spriteSize);
      this.x = opts.x;
      this.y = opts.y;
      this.width = hitbox.width;
      this.height = hitbox.height;
      this.kind = opts.kind ?? "generic";
      this.direction = opts.direction ?? "down";
      this.solid = opts.solid !== false;
      this.sheet = opts.sheet ?? null;
      this.dialogue = opts.dialogue ?? null;
      this.spriteSize = spriteSize;
      this.frame = 0;
      this.frameTime = 0;
    }

    update(_dt, _game) {}

    onAttacked(attacker, game) {
      if (!this.dialogue) return;
      this.direction = directionToward(this, attacker);
      game.showDialogue(this, this.dialogue);
    }

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
      super({
        ...opts,
        kind: "player",
        sheet: SHEETS.player,
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
      if (
        event.key === " " ||
        event.key === "Enter" ||
        event.key === "z" ||
        event.key === "Z"
      ) {
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
        zIndex: "20",
      });
      this.ctx = this.canvas.getContext("2d");
      this.input = new Input();
      this.entities = [];
      this.player = new Player({ x: 0, y: 0 });
      this.entities.push(this.player);
      this.collisionRects = [];
      this.dialogue = null;
      this.cameraX = 0;
      this.cameraY = 0;
      this.mounted = false;
      this.running = false;
      this.lastTime = 0;
      this._rafId = null;
      this._hasGameplayState = false;
      this._customSpawn = null;
      this._staticRenderQueued = false;
    }

    setSpawn(playerPos, npcs = []) {
      this._customSpawn = { playerPos, npcs };
      this._applySpawn(playerPos, npcs);
      this._syncCameraToScroll();
      if (this.mounted && !this.running) this._render();
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

    mount() {
      if (this.mounted) return;
      this._resizeCanvas();
      document.body.appendChild(this.canvas);

      this._previousScrollBehavior = document.documentElement.style.scrollBehavior;
      this.refreshCollisionRects();
      this._placeInitialEntities();
      this._syncCameraToScroll();
      this._render();

      this._onResize = () => {
        this._resizeCanvas();
        this.refreshCollisionRects();
        if (!this.running) {
          if (!this._hasGameplayState) this._placeInitialEntities();
          this._syncCameraToScroll();
          this._requestStaticRender();
        }
      };
      this._onScroll = () => {
        if (!this.running) {
          this._syncCameraToScroll();
          this._requestStaticRender();
        }
      };
      window.addEventListener("resize", this._onResize);
      window.addEventListener("scroll", this._onScroll, { passive: true });
      this._bindAssetRenderEvents();
      this.mounted = true;
    }

    start() {
      if (this.running) return;
      this.mount();
      this._hasGameplayState = true;

      document.documentElement.style.scrollBehavior = "auto";

      this.refreshCollisionRects();
      this._centerCameraOnPlayer();

      this.input.bind();

      this._onWheel = (event) => event.preventDefault();
      window.addEventListener("wheel", this._onWheel, { passive: false });
      window.addEventListener("touchmove", this._onWheel, { passive: false });

      this.running = true;
      this.lastTime = performance.now();
      this._frame = (t) => this._tick(t);
      this._rafId = requestAnimationFrame(this._frame);
    }

    stop() {
      if (!this.running) return;
      this.running = false;
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this.input.unbind();
      window.removeEventListener("wheel", this._onWheel);
      window.removeEventListener("touchmove", this._onWheel);
      document.documentElement.style.scrollBehavior = this._previousScrollBehavior ?? "";
      this.player.attackTimer = 0;
      this._syncCameraToScroll();
      this._render();
    }

    _resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx.imageSmoothingEnabled = false;
    }

    _bindAssetRenderEvents() {
      const redraw = () => {
        if (!this.running) {
          if (!this._hasGameplayState) this._placeInitialEntities();
          this._syncCameraToScroll();
          this._requestStaticRender();
        }
      };
      const spawnImg = getSpawnImage();
      if (spawnImg && !spawnImg.complete) {
        spawnImg.addEventListener("load", redraw, { once: true });
      }
      Object.values(SHEETS).forEach((sheet) => {
        if (!sheet.image.complete) {
          sheet.image.addEventListener("load", redraw, { once: true });
        }
      });
    }

    _requestStaticRender() {
      if (this.running || this._staticRenderQueued) return;
      this._staticRenderQueued = true;
      requestAnimationFrame(() => {
        this._staticRenderQueued = false;
        if (!this.running) {
          this._syncCameraToScroll();
          this._render();
        }
      });
    }

    _syncCameraToScroll() {
      this.cameraX = window.scrollX;
      this.cameraY = window.scrollY;
    }

    _placeInitialEntities() {
      if (this._customSpawn) {
        const { playerPos, npcs } = this._customSpawn;
        this._applySpawn(playerPos, npcs);
        return;
      }

      const spawn = getCipherboundSpawn();
      if (spawn) {
        this._applySpawn(spawn.playerPos, spawn.npcs);
        return;
      }

      const cx = window.scrollX + window.innerWidth / 2 - this.player.width / 2;
      const cy = window.scrollY + window.innerHeight / 2 - this.player.height / 2;
      const candidate = this._findOpenSpot(cx, cy, this.player);
      this.player.x = candidate.x;
      this.player.y = candidate.y;
      this.entities.splice(1);
    }

    _applySpawn(playerPos, npcs = []) {
      this.player.x = playerPos.x;
      this.player.y = playerPos.y;
      applyEntitySize(this.player, playerPos);

      this.entities.splice(1);
      npcs.forEach((spec) => {
        this.addEntity(
          new Entity({
            x: spec.x,
            y: spec.y,
            kind: spec.kind ?? "npc",
            sheet: spec.sheet,
            direction: spec.direction ?? "down",
            dialogue: spec.dialogue,
            width: spec.width,
            height: spec.height,
            hitboxWidth: spec.hitboxWidth,
            hitboxHeight: spec.hitboxHeight,
            spriteSize: spec.spriteSize ?? spec.size,
          }),
        );
      });
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
      this._rafId = requestAnimationFrame(this._frame);
    }

    _update(dt) {
      for (const e of this.entities) e.update(dt, this);
      if (this.dialogue) {
        this.dialogue.timer -= dt;
        if (this.dialogue.timer <= 0) this.dialogue = null;
      }
      this._updateCamera();
    }

    showDialogue(entity, text) {
      this.dialogue = { entity, text, timer: DIALOGUE_DURATION };
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

      const drawOrder = [...this.entities].sort((a, b) => {
        const aFeet = a.y + a.height;
        const bFeet = b.y + b.height;
        return aFeet - bFeet || a.x - b.x;
      });

      for (const e of drawOrder) {
        const sx = Math.round(e.x - this.cameraX);
        const sy = Math.round(e.y - this.cameraY);
        e.draw(ctx, sx, sy);
      }

      if (this.dialogue) this._renderDialogue(this.dialogue);
      if (this.running) this._renderHUD();
    }

    _renderHUD() {
      const ctx = this.ctx;
      const hudY = getHeaderBottomOffset() + 12;
      const hudW = Math.min(this.canvas.width - 24, 344);
      const hudH = 58;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(12, hudY, hudW, hudH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(12.5, hudY + 0.5, hudW - 1, hudH - 1);

      ctx.font = '22px "Silkscreen", monospace';
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const filled = "♥".repeat(this.player.health);
      const empty = "♡".repeat(Math.max(0, this.player.maxHealth - this.player.health));
      ctx.fillStyle = "#ff4d5f";
      ctx.fillText(filled, 22, hudY + 19);
      ctx.fillStyle = "rgba(255, 77, 95, 0.38)";
      ctx.fillText(empty, 22 + ctx.measureText(filled).width, hudY + 19);

      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText("WASD/Arrows move | Enter/Space/Z talk | Esc", 22, hudY + 43);
    }

    _renderDialogue(dialogue) {
      const ctx = this.ctx;
      const entity = dialogue.entity;
      if (!entity || !this.entities.includes(entity)) return;

      const entityX = Math.round(entity.x - this.cameraX);
      const entityY = Math.round(entity.y - this.cameraY);
      const spriteTop = entityY + entity.height - entity.spriteSize;
      const maxBubbleWidth = Math.max(120, Math.min(280, this.canvas.width - 16));
      const paddingX = 12;
      const paddingY = 9;

      ctx.save();
      ctx.font = '13px "Silkscreen", monospace';
      const lines = wrapCanvasText(ctx, dialogue.text, maxBubbleWidth - paddingX * 2);
      const lineHeight = 17;
      const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
      const bubbleWidth = Math.ceil(textWidth + paddingX * 2);
      const bubbleHeight = paddingY * 2 + lines.length * lineHeight;
      const preferredX = entityX + entity.width / 2 - bubbleWidth / 2;
      const preferredY = spriteTop - bubbleHeight - 10;
      const bubbleX = Math.round(clamp(preferredX, 8, this.canvas.width - bubbleWidth - 8));
      const bubbleY = Math.round(
        clamp(preferredY, getHeaderBottomOffset() + 8, this.canvas.height - bubbleHeight - 8),
      );

      drawRoundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6);
      ctx.fillStyle = "rgba(7, 16, 12, 0.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#e6f4e6";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((line, index) => {
        ctx.fillText(line, bubbleX + paddingX, bubbleY + paddingY + index * lineHeight);
      });
      ctx.restore();
    }
  }

  // === Static canvas spawn helpers ===

  function getSpawnImage() {
    return document.querySelector(`${SPAWN_SELECTOR} img`);
  }

  function getCipherboundSpawn() {
    const img = getSpawnImage();
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const size = getCipherboundSpriteSize(img, rect);
    const hitbox = getSpriteHitbox(size);
    const docLeft = rect.left + window.scrollX;
    const docTop = rect.top + window.scrollY;
    const atAnchor = (anchor) => {
      const feetX = docLeft + anchor.x * rect.width;
      const feetY = docTop + anchor.y * rect.height;
      return {
        x: feetX - hitbox.width / 2,
        y: feetY - hitbox.height,
        spriteSize: size,
      };
    };

    return {
      playerPos: atAnchor(PLAYER_AMBIENT_POS),
      npcs: [
        {
          ...atAnchor(GIRL_AMBIENT_POS),
          kind: "girl",
          sheet: SHEETS.girl,
          dialogue: GIRL_DIALOGUE,
        },
      ],
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
    const spriteSize = getEntitySpriteSize(spec);
    const hitbox = getEntityHitbox(spec, spriteSize);
    entity.width = hitbox.width;
    entity.height = hitbox.height;
    entity.spriteSize = spriteSize;
  }

  function getEntitySpriteSize(spec = {}) {
    const explicitSize =
      spec.spriteSize ?? spec.size ?? Math.max(spec.width ?? 0, spec.height ?? 0);
    return explicitSize || DEFAULT_ENTITY_SIZE;
  }

  function getEntityHitbox(spec = {}, spriteSize = getEntitySpriteSize(spec)) {
    const fallback = getSpriteHitbox(spriteSize);
    return {
      width: spec.hitboxWidth ?? spec.collisionWidth ?? spec.width ?? fallback.width,
      height: spec.hitboxHeight ?? spec.collisionHeight ?? spec.height ?? fallback.height,
    };
  }

  function getSpriteHitbox(spriteSize) {
    return {
      width: Math.max(8, Math.round(spriteSize * ENTITY_HITBOX_WIDTH_RATIO)),
      height: Math.max(8, Math.round(spriteSize * ENTITY_HITBOX_HEIGHT_RATIO)),
    };
  }

  function directionToward(entity, target) {
    const entityCx = entity.x + entity.width / 2;
    const entityCy = entity.y + entity.height / 2;
    const targetCx = target.x + target.width / 2;
    const targetCy = target.y + target.height / 2;
    const dx = targetCx - entityCx;
    const dy = targetCy - entityCy;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
    return dy < 0 ? "up" : "down";
  }

  function getHeaderBottomOffset() {
    const header = document.querySelector(".site-header");
    if (!header) return 0;
    return Math.max(0, Math.ceil(header.getBoundingClientRect().bottom));
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(testLine).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(value, max));
  }

  // === Public entry points ===

  let game = null;
  let active = null;

  function ensureGame() {
    if (!game) game = new Game();
    game.mount();
    return game;
  }

  function boot() {
    ensureGame();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  function start() {
    if (active) return;
    const currentGame = ensureGame();
    currentGame.start();

    const escHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", escHandler);

    active = { game: currentGame, escHandler };
  }

  function stop() {
    if (!active) return;
    window.removeEventListener("keydown", active.escHandler);
    active.game.stop();
    active = null;
  }

  function isActive() {
    return active !== null;
  }

  window.MSA_RPG = { start, stop, isActive, Entity, Player, Game };
})();

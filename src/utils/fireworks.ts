interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
  alpha: number;
  trail: { x: number; y: number }[];
}

interface Explosion {
  x: number;
  y: number;
  particles: Particle[];
  maxLife: number;
  age: number;
}

interface StarParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmplitude: number;
  alpha: number;
  maxY: number;
  life: number;
  maxLife: number;
}

type EngineMode = 'fireworks' | 'starRain' | 'sparseStars' | 'none';

const SATURATED_COLORS = [
  '#FF0000', '#FFFF00', '#0066FF', '#00CC00', '#FF8800', '#CC00FF',
  '#FF0044', '#FFCC00', '#0088FF', '#00FF66', '#FF4400', '#8800FF',
];

const STAR_GOLD_COLORS = ['#FFD700', '#FFA500', '#FFEC8B', '#FFC125'];

function randomColor(): string {
  return SATURATED_COLORS[Math.floor(Math.random() * SATURATED_COLORS.length)];
}

export class FireworksEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private explosions: Explosion[] = [];
  private animationId: number | null = null;
  private running = false;
  private roundCount = 0;
  private lastRoundTime = 0;
  private roundInterval = 800;
  mode: EngineMode = 'none';
  private stars: StarParticle[] = [];
  private lastStarSpawn = 0;
  private starRainId: number | null = null;
  private sparseStarsId: number | null = null;
  private sparseStarsStartTime = 0;
  private sparseStarsDuration = 3000;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.roundCount = 0;
    this.lastRoundTime = performance.now();
    this.fireRound();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.fadeOut();
  }

  private fireRound() {
    // 每轮5-8个烟花
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width * 0.8 + this.canvas.width * 0.1;
      const y = Math.random() * this.canvas.height * 0.6 + this.canvas.height * 0.05;
      const baseColor = randomColor();

      // 每个烟花30-50个粒子
      const particleCount = 30 + Math.floor(Math.random() * 21);
      const particles: Particle[] = [];
      for (let j = 0; j < particleCount; j++) {
        const angle = (Math.PI * 2 * j) / particleCount + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 5 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 90 + Math.random() * 50,
          maxLife: 140,
          color: Math.random() < 0.4 ? randomColor() : baseColor,
          size: 4 + Math.random() * 3,
          gravity: 0.04 + Math.random() * 0.04,
          alpha: 1,
          trail: [],
        });
      }
      this.explosions.push({ x, y, particles, maxLife: 140, age: 0 });
    }
    this.roundCount++;
  }

  private fadeOut() {
    const fade = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      let hasParticles = false;
      for (const ex of this.explosions) {
        for (const p of ex.particles) {
          p.alpha -= 0.06;
          if (p.alpha > 0) {
            hasParticles = true;
            this.drawParticle(p);
          }
        }
      }
      if (hasParticles) {
        requestAnimationFrame(fade);
      } else {
        this.explosions = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };
    fade();
  }

  private drawParticle(p: Particle) {
    this.ctx.save();
    this.ctx.globalAlpha = Math.max(0, p.alpha);
    this.ctx.fillStyle = p.color;
    this.ctx.strokeStyle = p.color;
    this.ctx.lineWidth = 2.5;

    // 拖尾
    if (p.trail.length > 1) {
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    }

    // 实心圆点
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private loop = () => {
    if (!this.running) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const now = performance.now();

    // 每800ms一轮新爆炸，至少3轮
    if (this.roundCount < 3 || (this.roundCount >= 3 && now - this.lastRoundTime > this.roundInterval)) {
      if (this.explosions.length < 12) {
        this.fireRound();
        this.lastRoundTime = now;
      }
    }

    // 始终持续生成，直到stop被调用
    if (now - this.lastRoundTime > this.roundInterval && this.explosions.length < 8) {
      this.fireRound();
      this.lastRoundTime = now;
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age++;

      let alive = false;
      for (let j = ex.particles.length - 1; j >= 0; j--) {
        const p = ex.particles[j];

        // 存储拖尾位置
        if (p.life % 3 === 0) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 5) p.trail.shift();
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.life--;

        // 闪烁渐隐
        const fadeRatio = p.life / p.maxLife;
        p.alpha = fadeRatio * (0.8 + 0.2 * Math.sin(p.life * 0.3));

        if (p.life <= 0 || p.alpha <= 0.01) {
          ex.particles.splice(j, 1);
        } else {
          alive = true;
          this.drawParticle(p);
        }
      }

      if (!alive) {
        this.explosions.splice(i, 1);
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    const outerR = size;
    const innerR = size * 0.4;
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * 2 * i) / (spikes * 2) - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  startStarRain() {
    this.stop();
    this.running = true;
    this.mode = 'starRain';
    this.resize();
    this.stars = [];
    this.lastStarSpawn = 0;
    this.starRainLoop();
  }

  private starRainLoop = () => {
    if (!this.running || this.mode !== 'starRain') return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const now = performance.now();

    // 每200ms生成一批星星
    if (now - this.lastStarSpawn > 200) {
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * this.canvas.width;
        const maxY = this.canvas.height + 20;
        this.stars.push({
          x,
          y: -10 - Math.random() * 30,
          speed: 1.2 + Math.random() * 2.2,
          size: 6 + Math.random() * 8,
          color: STAR_GOLD_COLORS[Math.floor(Math.random() * STAR_GOLD_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.03,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.008 + Math.random() * 0.015,
          swayAmplitude: 15 + Math.random() * 30,
          alpha: 1,
          maxY,
          life: 300,
          maxLife: 300,
        });
      }
      this.lastStarSpawn = now;
    }

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.y += s.speed;
      s.rotation += s.rotationSpeed;
      s.swayPhase += s.swaySpeed;
      const baseX = s.x;
      s.x = baseX + Math.sin(s.swayPhase) * s.swayAmplitude;

      // 底部渐隐
      const distFromBottom = s.maxY - s.y;
      s.alpha = Math.min(1, distFromBottom / 120);

      // 随时间渐隐
      s.life--;
      if (s.life < 60) {
        s.alpha *= s.life / 60;
      }

      if (s.y > s.maxY || s.alpha <= 0.01) {
        this.stars.splice(i, 1);
      } else {
        this.drawStar(this.ctx, s.x, s.y, s.size, s.color, s.alpha);
      }
    }

    this.starRainId = requestAnimationFrame(this.starRainLoop);
  };

  startSparseStars(cx: number, cy: number) {
    this.mode = 'sparseStars';
    this.stars = [];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      const startX = cx + Math.cos(angle) * dist * 0.3;
      const startY = cy + Math.sin(angle) * dist * 0.3;
      this.stars.push({
        x: startX,
        y: startY,
        speed: 0.8 + Math.random() * 1.5,
        size: 8 + Math.random() * 10,
        color: STAR_GOLD_COLORS[Math.floor(Math.random() * STAR_GOLD_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayAmplitude: 8 + Math.random() * 20,
        alpha: 1,
        maxY: cy + 60 + Math.random() * 120,
        life: 180,
        maxLife: 180,
      });
    }
    this.sparseStarsStartTime = performance.now();
    if (!this.running) {
      this.running = true;
      this.resize();
    }
    this.sparseStarsLoop();
  }

  private sparseStarsLoop = () => {
    const now = performance.now();
    const elapsed = now - this.sparseStarsStartTime;

    if (elapsed >= this.sparseStarsDuration) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.stars = [];
      this.sparseStarsId = null;
      if (this.mode === 'sparseStars') {
        this.mode = 'none';
        this.running = false;
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 最后0.5秒渐隐
    const globalFade = elapsed > this.sparseStarsDuration - 500
      ? (this.sparseStarsDuration - elapsed) / 500
      : 1;

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.y += s.speed;
      s.rotation += s.rotationSpeed;
      s.swayPhase += s.swaySpeed;
      const baseX = s.x;
      s.x = baseX + Math.sin(s.swayPhase) * s.swayAmplitude;

      const distFromBottom = s.maxY - s.y;
      const alpha = Math.min(1, distFromBottom / 100) * globalFade;

      s.life--;
      if (s.life < 40) {
        s.alpha = alpha * (s.life / 40);
      } else {
        s.alpha = alpha;
      }

      if (s.y > s.maxY || s.life <= 0 || s.alpha <= 0.01) {
        this.stars.splice(i, 1);
      } else {
        this.drawStar(this.ctx, s.x, s.y, s.size, s.color, s.alpha);
      }
    }

    if (this.stars.length > 0 || elapsed < this.sparseStarsDuration) {
      this.sparseStarsId = requestAnimationFrame(this.sparseStarsLoop);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.sparseStarsId = null;
      if (this.mode === 'sparseStars') {
        this.mode = 'none';
        this.running = false;
      }
    }
  };
}

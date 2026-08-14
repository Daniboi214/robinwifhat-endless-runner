import * as THREE from 'three';
import { Engine } from './game/Engine.js';
import { CHARACTERS } from './game/Player.js';
import { THEMES } from './game/ThemeManager.js';

class App {
  constructor() {
    this.highScore = parseInt(localStorage.getItem('subway_runner_highscore') || '0', 10);
    this.totalCoins = parseInt(localStorage.getItem('subway_runner_coins') || '0', 10);
    this.totalRuns = parseInt(localStorage.getItem('subway_runner_runs') || '0', 10);

    this.selectedCharId = localStorage.getItem('subway_runner_char') || 'skeleton';
    this.selectedThemeId = localStorage.getItem('subway_runner_theme') || 'forest';

    this.initDOM();
    this.initEngine();
    this.setupControls();
    this.setupImageUploads();
    this.renderUI();
  }

  initDOM() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.hud = document.getElementById('hud-overlay');
    this.menuOverlay = document.getElementById('menu-overlay');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');

    this.scoreDisplay = document.getElementById('hud-score');
    this.coinDisplay = document.getElementById('hud-coins');
    this.multiplierVal = document.getElementById('hud-multiplier-badge');
    this.speedFill = document.getElementById('speed-fill');
    this.powerupBar = document.getElementById('active-powerups-list');

    this.powerupBanner = document.getElementById('powerup-banner-box');
    this.powerupBannerIcon = document.getElementById('banner-icon');
    this.powerupBannerText = document.getElementById('banner-text');

    this.highScoreVal = document.getElementById('stat-highscore');
    this.totalCoinsVal = document.getElementById('stat-totalcoins');
    this.totalRunsVal = document.getElementById('stat-maxdist');
    this.currentCharName = document.getElementById('summary-runner-name');
    this.currentThemeName = document.getElementById('summary-theme-name');

    this.finalScoreVal = document.getElementById('go-final-score');
    this.finalCoinsVal = document.getElementById('go-coins');
    this.finalDistVal = document.getElementById('go-distance');
    this.goTitle = document.getElementById('go-title');

    this.btnStart = document.getElementById('btn-start-game');
    this.btnRestartGo = document.getElementById('btn-restart-go');
    this.btnMenuGo = document.getElementById('btn-menu-go');

    this.btnPause = document.getElementById('btn-pause');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestartPause = document.getElementById('btn-restart-pause');
    this.btnMenuPause = document.getElementById('btn-menu-pause');
  }

  initEngine() {
    this.engine = new Engine(this.canvasContainer, {
      onHUDUpdate: (data) => this.onHUDUpdate(data),
      onPowerupsUpdate: (powerups) => this.onPowerupsUpdate(powerups),
      onGameOver: (stats) => this.onGameOver(stats)
    });

    this.engine.player.setCharacter(this.selectedCharId);
    this.engine.themeManager.setTheme(this.selectedThemeId);

    const originalGrant = this.engine.grantPowerup.bind(this.engine);
    this.engine.grantPowerup = (powerup) => {
      originalGrant(powerup);
      this.showPowerupBanner(powerup);
    };
  }

  showPowerupBanner(powerup) {
    if (this.powerupBannerTimer) clearTimeout(this.powerupBannerTimer);

    if (this.powerupBannerIcon) this.powerupBannerIcon.textContent = powerup.icon || '⚡';
    if (this.powerupBannerText) this.powerupBannerText.textContent = `${powerup.name || 'POWER-UP'} ACTIVATED!`;
    if (this.powerupBanner) this.powerupBanner.classList.remove('hidden');

    this.powerupBannerTimer = setTimeout(() => {
      if (this.powerupBanner) this.powerupBanner.classList.add('hidden');
    }, 2500);
  }

  setupImageUploads() {
    const charInput = document.getElementById('upload-char-file');
    const coinInput = document.getElementById('upload-coin-file');
    const btnChar = document.getElementById('btn-upload-char');
    const btnCoin = document.getElementById('btn-upload-coin');
    const charStatus = document.getElementById('char-upload-status');
    const coinStatus = document.getElementById('coin-upload-status');

    if (btnChar && charInput) {
      btnChar.addEventListener('click', () => charInput.click());
      charInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            new THREE.TextureLoader().load(event.target.result, (texture) => {
              this.engine.player.setCustomTextures(texture, this.engine.player.customCoinTexture);
              charStatus.textContent = `Applied: ${file.name} ✅`;
              charStatus.style.color = '#7ca84d';
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (btnCoin && coinInput) {
      btnCoin.addEventListener('click', () => coinInput.click());
      coinInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            new THREE.TextureLoader().load(event.target.result, (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              this.engine.themeManager.materials.coinFace.map = texture;
              this.engine.themeManager.materials.coinFace.needsUpdate = true;
              coinStatus.textContent = `Applied: ${file.name} ✅`;
              coinStatus.style.color = '#7ca84d';
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  renderUI() {
    if (this.highScoreVal) this.highScoreVal.textContent = this.highScore.toLocaleString();
    if (this.totalCoinsVal) this.totalCoinsVal.textContent = this.totalCoins.toLocaleString();
    if (this.totalRunsVal) this.totalRunsVal.textContent = `${this.totalRuns}m`;

    const char = Object.values(CHARACTERS).find(c => c.id === this.selectedCharId);
    const theme = Object.values(THEMES).find(t => t.id === this.selectedThemeId);

    const runnerName = char ? char.name : 'CZAR';
    if (this.currentCharName) this.currentCharName.textContent = runnerName;
    if (theme && this.currentThemeName) this.currentThemeName.textContent = theme.name;

    if (this.btnStart) this.btnStart.textContent = `TAP TO RUN WITH ${runnerName}`;
    if (this.btnRestartGo) this.btnRestartGo.textContent = `RUN AGAIN WITH ${runnerName}`;

    this.renderCharacterGrid();
    this.renderThemeGrid();
  }

  renderCharacterGrid() {
    const grid = document.querySelector('.character-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(CHARACTERS).forEach(char => {
      const card = document.createElement('div');
      card.className = `card-item ${char.id === this.selectedCharId ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="card-icon">${char.icon}</span>
        <span class="card-title">${char.name}</span>
        <span class="card-desc">${char.desc}</span>
      `;

      card.addEventListener('click', () => {
        this.selectedCharId = char.id;
        localStorage.setItem('subway_runner_char', char.id);
        this.engine.player.setCharacter(char.id);
        this.renderUI();
      });

      grid.appendChild(card);
    });
  }

  renderThemeGrid() {
    const grid = document.querySelector('.theme-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(THEMES).forEach(theme => {
      const card = document.createElement('div');
      card.className = `card-item ${theme.id === this.selectedThemeId ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="card-icon">${theme.icon}</span>
        <span class="card-title">${theme.name}</span>
        <span class="card-desc">${theme.desc}</span>
      `;

      card.addEventListener('click', () => {
        this.selectedThemeId = theme.id;
        localStorage.setItem('subway_runner_theme', theme.id);
        this.engine.themeManager.setTheme(theme.id);
        this.renderUI();
      });

      grid.appendChild(card);
    });
  }

  setupControls() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        const pane = document.getElementById(`tab-${tabId}`);
        if (pane) pane.classList.add('active');
      });
    });

    if (this.btnStart) this.btnStart.addEventListener('click', () => this.startGame());
    if (this.btnRestartGo) this.btnRestartGo.addEventListener('click', () => this.startGame());
    if (this.btnRestartPause) this.btnRestartPause.addEventListener('click', () => this.startGame());

    if (this.btnMenuGo) {
      this.btnMenuGo.addEventListener('click', () => {
        this.gameOverOverlay.classList.add('hidden');
        this.menuOverlay.classList.remove('hidden');
        this.renderUI();
      });
    }

    if (this.btnMenuPause) {
      this.btnMenuPause.addEventListener('click', () => {
        this.pauseOverlay.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.menuOverlay.classList.remove('hidden');
        this.renderUI();
      });
    }

    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => {
        this.engine.pauseGame();
        this.pauseOverlay.classList.remove('hidden');
      });
    }

    if (this.btnResume) {
      this.btnResume.addEventListener('click', () => {
        this.pauseOverlay.classList.add('hidden');
        this.engine.resumeGame();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.engine.isGameActive || this.engine.isPaused) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.engine.triggerLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.engine.triggerRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.engine.triggerJump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.engine.triggerSlide();
          break;
        case ' ':
          this.engine.triggerHoverboard();
          break;
        case 'Escape':
        case 'p':
        case 'P':
          if (this.btnPause) this.btnPause.click();
          break;
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!this.engine.isGameActive || this.engine.isPaused) return;
      if (e.changedTouches.length === 0) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const elapsedTime = Date.now() - touchStartTime;

      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && elapsedTime < 250) {
        this.engine.triggerHoverboard();
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 30) this.engine.triggerRight();
        else if (deltaX < -30) this.engine.triggerLeft();
      } else {
        if (deltaY < -30) this.engine.triggerJump();
        else if (deltaY > 30) this.engine.triggerSlide();
      }
    }, { passive: true });
  }

  startGame() {
    this.menuOverlay.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.totalRuns++;
    localStorage.setItem('subway_runner_runs', this.totalRuns.toString());

    this.engine.startNewGame();
  }

  onHUDUpdate(data) {
    if (this.scoreDisplay) this.scoreDisplay.textContent = data.score.toString().padStart(6, '0');
    if (this.coinDisplay) this.coinDisplay.textContent = data.coins.toString();
    if (this.multiplierVal) this.multiplierVal.textContent = `${data.multiplier}X SCORE`;
    if (this.speedFill) this.speedFill.style.width = `${data.speedPercent}%`;
  }

  onPowerupsUpdate(powerups) {
    if (!this.powerupBar) return;
    this.powerupBar.innerHTML = '';
    powerups.forEach(p => {
      const item = document.createElement('div');
      item.className = 'powerup-item';
      const pct = Math.max(0, (p.remaining / p.total) * 100);

      item.innerHTML = `
        <span class="powerup-icon">${p.icon}</span>
        <div class="powerup-bar-bg">
          <div class="powerup-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      this.powerupBar.appendChild(item);
    });
  }

  onGameOver(stats) {
    this.hud.classList.add('hidden');
    this.gameOverOverlay.classList.remove('hidden');

    const char = Object.values(CHARACTERS).find(c => c.id === this.selectedCharId);
    const runnerName = char ? char.name : 'RUNNER';

    if (this.goTitle) this.goTitle.textContent = `BEAR CAUGHT ${runnerName}!`;
    if (this.finalScoreVal) this.finalScoreVal.textContent = stats.score.toLocaleString();
    if (this.finalCoinsVal) this.finalCoinsVal.textContent = `+${stats.coins.toLocaleString()}`;
    if (this.finalDistVal) this.finalDistVal.textContent = `${stats.distance} m`;

    this.totalCoins += stats.coins;
    localStorage.setItem('subway_runner_coins', this.totalCoins.toString());

    if (stats.score > this.highScore) {
      this.highScore = stats.score;
      localStorage.setItem('subway_runner_highscore', this.highScore.toString());
    }

    this.renderUI();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

/**
 * VASKOI BIOPHARMA — SCROLL-DRIVEN SEQUENCE CANVAS ENGINE
 * High-performance 150-frame sequence controller with DPR scaling and HUD synchronization
 */

class SequenceCanvasController {
  constructor(options = {}) {
    this.section = document.getElementById(options.sectionId || 'sequence-track');
    this.canvas = document.getElementById(options.canvasId || 'sequence-canvas');
    this.progressText = document.getElementById(options.progressTextId || 'hud-progress-counter');
    this.stageLayers = document.querySelectorAll('.sequence-hud-stage-layer');

    if (!this.section || !this.canvas) {
      console.warn('SequenceCanvasController: Canvas or section container missing.');
      return;
    }

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.totalFrames = options.totalFrames || 150;
    this.frames = new Array(this.totalFrames);
    this.loadedFrames = 0;

    // Smooth physics values
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.lastDrawnFrame = -1;
    this.isRendering = false;

    // High-res stage fallbacks
    this.stageImages = [];
    this.initStageFallbacks();

    // Setup canvas resolution and frame pipeline
    this.setupResizeHandler();
    this.preloadFrames();
    this.bindEvents();
    this.startRenderLoop();
  }

  // Load the 3 high-res stage images as instant backups with off-thread decoding
  initStageFallbacks() {
    const stagePaths = [
      'assets/images/stage1.png',
      'assets/images/stage2.png',
      'assets/images/stage3.png'
    ];

    stagePaths.forEach((src, idx) => {
      const img = new Image();
      img.src = src;
      const onReady = () => {
        this.stageImages[idx] = img;
        if (this.loadedFrames === 0 && idx === 0) {
          this.drawImageCover(img);
        }
      };
      if ('decode' in img) {
        img.decode().then(onReady).catch(onReady);
      } else {
        img.onload = onReady;
      }
    });
  }

  // Preload all 150 AVIF frames with prioritization
  preloadFrames() {
    // Priority order: Key stage milestones first, then full sequence
    const priorityIndices = [0, 25, 50, 75, 100, 125, 149];
    
    // Load priority milestone frames first
    priorityIndices.forEach(index => this.loadSingleFrame(index));

    // Load rest of the frames smoothly
    for (let i = 0; i < this.totalFrames; i++) {
      if (!priorityIndices.includes(i)) {
        this.loadSingleFrame(i);
      }
    }
  }

  loadSingleFrame(index) {
    if (this.frames[index]) return;

    const padNum = String(index).padStart(5, '0');
    const img = new Image();
    img.src = `assets/sequence/${padNum}.avif`;
    
    const onLoaded = () => {
      this.frames[index] = img;
      this.loadedFrames++;

      // Draw initial frame as soon as frame 0 lands
      if (index === 0 && this.lastDrawnFrame === -1) {
        this.drawImageCover(img);
        this.lastDrawnFrame = 0;
      }
    };

    if ('decode' in img) {
      img.decode().then(onLoaded).catch(() => {
        // Fallback on standard load if decode rejects
        img.onload = onLoaded;
      });
    } else {
      img.onload = onLoaded;
    }

    img.onerror = () => {
      // If frame fails, map to nearest stage image
      const stageIdx = Math.min(2, Math.floor((index / this.totalFrames) * 3));
      this.frames[index] = this.stageImages[stageIdx] || null;
    };
  }

  setupResizeHandler() {
    const resize = () => {
      const isMobile = window.innerWidth <= 768;
      // Cap at 1 on mobile to slash GPU memory bandwidth by 4x; cap at 1.5 on desktop
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = this.canvas.getBoundingClientRect();

      this.canvasWidth = rect.width;
      this.canvasHeight = rect.height;

      this.canvas.width = Math.floor(rect.width * dpr);
      this.canvas.height = Math.floor(rect.height * dpr);

      this.ctx.scale(dpr, dpr);

      // Redraw current active frame after resize
      this.forceRedraw();
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();
  }

  // Compute scroll percentage through the 300vh section
  computeScrollProgress() {
    const rect = this.section.getBoundingClientRect();
    const windowH = window.innerHeight;
    const scrollDistance = rect.height - windowH;

    if (scrollDistance <= 0) return 0;

    // Progress 0 when section enters, 1 when section finishes
    const rawProgress = -rect.top / scrollDistance;
    return Math.max(0, Math.min(1, rawProgress));
  }

  bindEvents() {
    const onScroll = () => {
      this.targetProgress = this.computeScrollProgress();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Interactive Stage Layers: Clicking any pill navigates to that stage
    this.stageLayers.forEach((layer, idx) => {
      layer.addEventListener('click', () => {
        const milestones = [0.08, 0.50, 0.92];
        const targetPercent = milestones[idx] || 0;
        const rect = this.section.getBoundingClientRect();
        const scrollDist = this.section.offsetHeight - window.innerHeight;
        const targetScrollY = window.scrollY + rect.top + (scrollDist * targetPercent);

        if (window.vaskoiLenis) {
          window.vaskoiLenis.scrollTo(targetScrollY, { duration: 1.2 });
        } else {
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        }
      });
    });
  }

  startRenderLoop() {
    const isMobile = window.innerWidth <= 768;
    // Fast responsive lerp on mobile touch (0.32) eliminates scrubbing drag; 0.16 on desktop
    const lerpFactor = isMobile ? 0.32 : 0.16;

    const tick = () => {
      const delta = (this.targetProgress - this.currentProgress);

      if (Math.abs(delta) < 0.0006) {
        this.currentProgress = this.targetProgress;
      } else {
        this.currentProgress += delta * lerpFactor;
      }

      const frameIndex = Math.min(
        this.totalFrames - 1,
        Math.max(0, Math.floor(this.currentProgress * this.totalFrames))
      );

      if (frameIndex !== this.lastDrawnFrame) {
        this.renderFrame(frameIndex);
      }
      this.updateHUD(this.currentProgress, frameIndex);

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  renderFrame(index) {
    let imgToDraw = this.frames[index];

    // Fallback: If specific sequence frame not yet decoded, find closest neighbor
    if (!imgToDraw || !imgToDraw.complete) {
      for (let offset = 1; offset < 10; offset++) {
        if (this.frames[index - offset]?.complete) {
          imgToDraw = this.frames[index - offset];
          break;
        }
        if (this.frames[index + offset]?.complete) {
          imgToDraw = this.frames[index + offset];
          break;
        }
      }
    }

    // Ultimate fallback: high-res stage images
    if (!imgToDraw || !imgToDraw.complete) {
      const stageIdx = Math.min(2, Math.floor((index / this.totalFrames) * 3));
      imgToDraw = this.stageImages[stageIdx];
    }

    if (imgToDraw && imgToDraw.complete) {
      this.drawImageCover(imgToDraw);
      this.lastDrawnFrame = index;
    }
  }

  // Draw image preserving aspect ratio with cover scaling
  drawImageCover(img) {
    if (!img || !img.width || !img.height) return;

    const canvasW = this.canvasWidth;
    const canvasH = this.canvasHeight;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    const imgRatio = imgW / imgH;
    const canvasRatio = canvasW / canvasH;

    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = canvasW;
      renderH = canvasW / imgRatio;
      offsetX = 0;
      offsetY = (canvasH - renderH) / 2;
    } else {
      renderW = canvasH * imgRatio;
      renderH = canvasH;
      offsetX = (canvasW - renderW) / 2;
      offsetY = 0;
    }

    // Direct drawImage over the full canvas without redundant full-screen fillRect
    this.ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  forceRedraw() {
    if (this.lastDrawnFrame >= 0) {
      this.renderFrame(this.lastDrawnFrame);
    }
  }

  // Synchronize HUD stage layers and progress text with state-change gating
  updateHUD(progress, frameIndex) {
    // Determine active stage: Stage 1 (0-33%), Stage 2 (33-66%), Stage 3 (66-100%)
    const activeStage = Math.min(2, Math.floor(progress * 3));

    // Gate DOM updates: only touch DOM when stage actually changes!
    if (activeStage === this.lastActiveStage) return;
    this.lastActiveStage = activeStage;

    this.stageLayers.forEach((layer, idx) => {
      if (idx === activeStage) {
        layer.classList.add('active');
      } else {
        layer.classList.remove('active');
      }
    });

    if (this.progressText) {
      const stageLabels = ['STAGE 01 / 03', 'STAGE 02 / 03', 'STAGE 03 / 03'];
      this.progressText.textContent = stageLabels[activeStage];
    }
  }
}

// Instantiate controller once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sequenceController = new SequenceCanvasController({
    sectionId: 'sequence-track',
    canvasId: 'sequence-canvas',
    progressTextId: 'hud-progress-counter',
    totalFrames: 150
  });
});

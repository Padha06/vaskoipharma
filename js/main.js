/**
 * VASKOI BIOPHARMA — MAIN APPLICATION CONTROLLER
 * Smooth momentum scrolling, interactive accordion, metric animations & demo drawer
 */

(function () {
  'use strict';

  // 1. Lenis Smooth Momentum Scroll Initialization
  function initSmoothScroll() {
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        infinite: false,
      });

      window.vaskoiLenis = lenis;

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Support anchor link clicks through Lenis
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
          const targetId = this.getAttribute('href');
          if (targetId && targetId !== '#') {
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
              e.preventDefault();
              lenis.scrollTo(targetEl, { offset: -60, duration: 1.2 });
            }
          }
        });
      });
    }
  }

  // 2. Header Scroll State
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // 3. Hero Mouse Tilt / Camera Parallax
  function initHeroParallax() {
    const hero = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    if (!hero || !heroContent) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 14; // max tilt degrees
      targetY = -y * 14;
    });

    hero.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
    });

    function tiltLoop() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      heroContent.style.transform = `perspective(1200px) rotateY(${currentX}deg) rotateX(${currentY}deg)`;
      requestAnimationFrame(tiltLoop);
    }
    requestAnimationFrame(tiltLoop);
  }

  // 4. Interactive Technology Accordion
  function initAccordion() {
    const items = document.querySelectorAll('.accordion-item');
    if (!items.length) return;

    items.forEach((item) => {
      const header = item.querySelector('.accordion-header');
      if (!header) return;

      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close other items
        items.forEach((other) => {
          if (other !== item) other.classList.remove('active');
        });

        // Toggle clicked
        if (isActive) {
          item.classList.remove('active');
        } else {
          item.classList.add('active');
        }
      });
    });
  }

  // 5. Metric Number Counter Animation
  function initMetricCounters() {
    const metricElements = document.querySelectorAll('.metric-number[data-target]');
    if (!metricElements.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-target')) || 0;
          const suffix = el.getAttribute('data-suffix') || '';
          const prefix = el.getAttribute('data-prefix') || '';
          const duration = 1800; // ms
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out expo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentVal = Math.floor(easeProgress * target);

            el.textContent = `${prefix}${currentVal}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = `${prefix}${target}${suffix}`;
            }
          }

          requestAnimationFrame(updateCounter);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.25 });

    metricElements.forEach((el) => observer.observe(el));
  }

  // 6. Interactive Demo Request Modal
  function initDemoModal() {
    const modal = document.getElementById('demo-modal');
    const openBtns = document.querySelectorAll('.open-demo-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const demoForm = document.getElementById('demo-request-form');
    const formFeedback = document.getElementById('form-feedback');

    if (!modal) return;

    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeModal = () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (demoForm) {
      demoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = demoForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'TRANSMITTING INQUIRY...';
        }

        setTimeout(() => {
          if (formFeedback) {
            formFeedback.style.display = 'block';
            demoForm.style.display = 'none';
          }
        }, 800);
      });
    }
  }

  // 7. Mobile Bottom Floating Dock Active State Tracking
  function initMobileBottomDock() {
    const dockItems = document.querySelectorAll('.mobile-dock-item');
    if (!dockItems.length) return;

    const sectionIds = ['technology', 'sequence-track', 'capabilities', 'benchmarks'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    function updateActiveDock() {
      const scrollY = window.scrollY + (window.innerHeight * 0.4);

      let currentSectionId = '';
      sections.forEach(sec => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        if (scrollY >= top && scrollY < top + height) {
          currentSectionId = sec.id;
        }
      });

      dockItems.forEach(item => {
        const target = item.getAttribute('data-target');
        if (target === currentSectionId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveDock, { passive: true });
    updateActiveDock();
  }

  // Initialize all subsystems
  document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initHeaderScroll();
    initHeroParallax();
    initAccordion();
    initMetricCounters();
    initDemoModal();
    initMobileBottomDock();
  });

})();

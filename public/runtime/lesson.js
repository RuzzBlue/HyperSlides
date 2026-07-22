/* HyperClass lesson runtime interactions */

(function () {
  function initCarousels() {
    document.querySelectorAll('[data-hc-carousel]').forEach((root) => {
      const track = root.querySelector('.hc-carousel-track');
      if (!track) return;
      const slides = Array.from(track.children);
      if (!slides.length) return;
      let i = 0;
      const dots = root.querySelector('.hc-carousel-dots');
      if (dots) {
        dots.innerHTML = '';
        slides.forEach((_, idx) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.addEventListener('click', () => go(idx));
          dots.appendChild(b);
        });
      }
      const go = (n) => {
        i = (n + slides.length) % slides.length;
        track.style.transform = `translateX(-${i * 100}%)`;
        if (dots) {
          Array.from(dots.children).forEach((d, idx) => {
            d.classList.toggle('active', idx === i);
          });
        }
      };
      root.querySelector('[data-hc-prev]')?.addEventListener('click', () => go(i - 1));
      root.querySelector('[data-hc-next]')?.addEventListener('click', () => go(i + 1));
      go(0);
    });
  }

  function initSteps() {
    document.querySelectorAll('[data-hc-steps]').forEach((root) => {
      const steps = Array.from(root.querySelectorAll('.hc-step'));
      if (!steps.length) return;
      let i = 0;
      let nav = root.querySelector('.hc-steps-nav');
      if (!nav) {
        nav = document.createElement('div');
        nav.className = 'hc-steps-nav';
        nav.innerHTML =
          '<button type="button" data-prev>Back</button><span data-label></span><button type="button" data-next>Next</button>';
        root.appendChild(nav);
      }
      const label = nav.querySelector('[data-label]');
      const render = () => {
        steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
        if (label) label.textContent = `Step ${i + 1} / ${steps.length}`;
      };
      nav.querySelector('[data-prev]')?.addEventListener('click', () => {
        i = Math.max(0, i - 1);
        render();
      });
      nav.querySelector('[data-next]')?.addEventListener('click', () => {
        i = Math.min(steps.length - 1, i + 1);
        render();
      });
      render();
    });
  }

  function initCharts() {
    if (typeof Chart === 'undefined') return;
    document.querySelectorAll('canvas.hc-chart[data-chart]').forEach((canvas) => {
      try {
        const cfg = JSON.parse(canvas.getAttribute('data-chart') || '{}');
        const wrap = document.createElement('div');
        wrap.className = 'hc-chart-wrap';
        canvas.parentNode?.insertBefore(wrap, canvas);
        wrap.appendChild(canvas);
        // eslint-disable-next-line no-new
        new Chart(canvas, cfg);
      } catch (e) {
        console.warn('HyperClass chart parse failed', e);
      }
    });
  }

  function initMermaid() {
    if (typeof mermaid === 'undefined') return;
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
    mermaid.run({ querySelector: '.mermaid' });
  }

  function initPrism() {
    if (typeof Prism !== 'undefined') Prism.highlightAll();
  }

  function boot() {
    initCarousels();
    initSteps();
    initCharts();
    initMermaid();
    initPrism();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

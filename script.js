(() => {
  // =========================
  // MOBILE NAVIGATION
  // =========================
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');

      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation' : 'Open navigation'
      );
      menuButton.textContent = isOpen ? '✕' : '☰';
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        menuButton.textContent = '☰';
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        menuButton.textContent = '☰';
        menuButton.focus();
      }
    });
  }

  // =========================
  // COPYRIGHT YEAR
  // =========================
  const yearElement = document.querySelector('#year');

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // =========================
  // EMAIL COPY BUTTON + TOAST
  // =========================
  const copyButton = document.querySelector('#copy-email');
  const toast = document.querySelector('.toast');
  let toastTimeout;

  function showToast(message) {
    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const email = copyButton.dataset.email?.trim();

      if (!email || email.includes('YOUR_EMAIL')) {
        showToast(
          'Please add your real email address in index.html first.'
        );
        return;
      }

      try {
        await navigator.clipboard.writeText(email);
        showToast('Email address copied successfully!');
      } catch {
        showToast(`Your email address is: ${email}`);
      }
    });
  }

  // Update the email contact link
  const emailLink = document.querySelector(
    'a[href^="mailto:YOUR_EMAIL@example.com"]'
  );

  if (emailLink && copyButton) {
    const email = copyButton.dataset.email?.trim();

    if (email && !email.includes('YOUR_EMAIL')) {
      emailLink.href =
        `mailto:${email}?subject=${encodeURIComponent(
          'Project Inquiry for Ezekiel'
        )}`;
    }
  }

  // =========================
  // SERVICES SLIDESHOW (seamless infinite horizontal loop)
  // =========================
  const track = document.querySelector('#services-track');
  const viewport = document.querySelector('.services-viewport');
  const dotsContainer = document.querySelector('#services-dots');
  const titleLabel = document.querySelector('#service-title');

  if (track && viewport) {
    const originals = Array.from(track.querySelectorAll('.service-card'));
    const total = originals.length;

    // 1 = autoplay moves forward (new cards arrive from the right).
    // -1 = autoplay moves backward (new cards arrive from the left).
    const AUTOPLAY_DIRECTION = 1;
    const autoplayDelay = 4000;
    const slideSpeed = 650; // keep in sync with --slide-speed in styles.css
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (total > 0) {
      originals.forEach((card, i) => {
        card.dataset.index = i;
      });

      let perView = 1;        // cards visible at once (responsive)
      let position = 0;       // index inside the track, including clones
      let isAnimating = false;
      let autoPlayTimer;
      let fallbackTimer;
      let resizeTimer;
      let touchStartX = 0;
      let touchStartY = 0;

      const getPerView = () => {
        const width = window.innerWidth;
        const count = width > 900 ? 3 : width > 640 ? 2 : 1;
        return Math.min(count, total);
      };

      // Real service index (0 to total - 1), ignoring clones
      const realIndex = () =>
        (((position - perView) % total) + total) % total;

      // Service shown in the spotlight (middle slot)
      const centerOffset = () => Math.floor(perView / 2);
      const centerIndex = () => (realIndex() + centerOffset()) % total;

      // Distance to move the track for one card
      const stepSize = () => {
        const gap =
          parseFloat(getComputedStyle(track).columnGap) || 0;
        return track.children[0].getBoundingClientRect().width + gap;
      };

      function setPosition(animate) {
        track.style.transition =
          animate && !reducedMotion ? '' : 'none';
        track.style.transform =
          `translate3d(${-position * stepSize()}px, 0, 0)`;

        if (!animate) {
          void track.offsetWidth; // apply instantly before re-enabling transition
          track.style.transition = '';
        }
      }

      // Clone cards at both ends so the loop never shows a gap
      function buildTrack() {
        track.querySelectorAll('[data-clone]').forEach(clone =>
          clone.remove()
        );

        perView = getPerView();
        track.style.setProperty('--per-view', perView);

        const makeClone = card => {
          const clone = card.cloneNode(true);
          clone.dataset.clone = 'true';
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('inert', '');
          return clone;
        };

        originals
          .slice(-perView)
          .reverse()
          .forEach(card => track.prepend(makeClone(card)));

        originals
          .slice(0, perView)
          .forEach(card => track.append(makeClone(card)));
      }

      function updateUI() {
        const index = realIndex();
        const spotlight = centerIndex();

        if (titleLabel) {
          const heading = originals[spotlight].querySelector('h2, h3, h4');
          titleLabel.textContent = heading
            ? heading.textContent.trim()
            : `Service ${spotlight + 1}`;
        }

        if (dotsContainer) {
          Array.from(dotsContainer.children).forEach((dot, i) => {
            dot.setAttribute('aria-current', i === spotlight ? 'true' : 'false');
          });
        }

        // Spotlight the card in the middle slot (and its loop clone)
        Array.from(track.children).forEach(card => {
          card.classList.toggle(
            'is-center',
            Number(card.dataset.index) === spotlight
          );
        });

        // Only the cards currently on screen are exposed to screen readers
        originals.forEach((card, i) => {
          const offset = (i - index + total) % total;
          card.setAttribute('aria-hidden', offset < perView ? 'false' : 'true');
        });
      }

      // After sliding onto a clone, silently jump to the matching real card
      function finishMove() {
        clearTimeout(fallbackTimer);

        if (position >= total + perView) {
          position -= total;
          setPosition(false);
        } else if (position < perView) {
          position += total;
          setPosition(false);
        }

        isAnimating = false;
      }

      function move(direction, restartAutoplay = true) {
        if (isAnimating) {
          return;
        }

        isAnimating = true;
        position += direction;
        setPosition(true);
        updateUI();

        if (reducedMotion) {
          finishMove();
        } else {
          // Safety net in case transitionend doesn't fire
          fallbackTimer = setTimeout(finishMove, slideSpeed + 150);
        }

        if (restartAutoplay) {
          startAutoPlay();
        }
      }

      function goToIndex(index) {
        if (isAnimating || index === centerIndex()) {
          return;
        }

        isAnimating = true;
        position = perView + index - centerOffset();
        setPosition(true);
        updateUI();

        if (reducedMotion) {
          finishMove();
        } else {
          fallbackTimer = setTimeout(finishMove, slideSpeed + 150);
        }

        startAutoPlay();
      }

      function stopAutoPlay() {
        if (autoPlayTimer) {
          clearInterval(autoPlayTimer);
          autoPlayTimer = undefined;
        }
      }

      function startAutoPlay() {
        stopAutoPlay();

        if (reducedMotion || total < 2) {
          return;
        }

        autoPlayTimer = setInterval(() => {
          move(AUTOPLAY_DIRECTION, false);
        }, autoplayDelay);
      }

      // Dots
      if (dotsContainer) {
        dotsContainer.innerHTML = '';

        originals.forEach((card, index) => {
          const dot = document.createElement('button');

          dot.type = 'button';
          dot.setAttribute('aria-label', `Go to service ${index + 1}`);
          dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
          dot.addEventListener('click', () => goToIndex(index));

          dotsContainer.appendChild(dot);
        });
      }

      // Snap to the real card once the slide animation ends
      track.addEventListener('transitionend', event => {
        if (event.target === track && event.propertyName === 'transform') {
          finishMove();
        }
      });

      // Pause while hovering or while keyboard focus is inside
      viewport.addEventListener('mouseenter', stopAutoPlay);
      viewport.addEventListener('mouseleave', startAutoPlay);
      viewport.addEventListener('focusin', stopAutoPlay);
      viewport.addEventListener('focusout', event => {
        if (!viewport.contains(event.relatedTarget)) {
          startAutoPlay();
        }
      });

      // Pause when the tab is in the background
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      });

      // Mobile swipe
      viewport.addEventListener(
        'touchstart',
        event => {
          const touch = event.changedTouches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        },
        { passive: true }
      );

      viewport.addEventListener(
        'touchend',
        event => {
          const touch = event.changedTouches[0];
          const deltaX = touch.clientX - touchStartX;
          const deltaY = touch.clientY - touchStartY;

          // Ignore vertical page scrolling
          if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
            move(deltaX > 0 ? -1 : 1);
          }
        },
        { passive: true }
      );

      // Rebuild when the number of visible cards changes; otherwise re-align
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const index = realIndex();

          if (getPerView() !== perView) {
            buildTrack();
            position = perView + index;
          }

          isAnimating = false;
          setPosition(false);
          updateUI();
        }, 120);
      });

      // Initialise
      buildTrack();
      position = perView;
      setPosition(false);
      updateUI();
      startAutoPlay();
    }
  }
})();
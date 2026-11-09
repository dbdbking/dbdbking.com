/* Local replacement for Cargo's layout, slideshow and fullscreen controls. */
(() => {
  'use strict';

  const all = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const slideshows = [];
  const footer = document.querySelector('.project_footer_thumbnails');
  const footerThumbs = footer ? all('.project_thumb', footer) : [];
  const footerActive = footerThumbs.findIndex(thumb => thumb.classList.contains('footer_active'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lightbox = null;
  let frame = 0;

  function dimensions(element) {
    const measured = element.matches('img,video,iframe,object,embed')
      ? element : element.querySelector('img,video,iframe,object,embed');
    const source = measured || element;
    return {
      width: Number(source.getAttribute('width')) || source.naturalWidth || source.videoWidth || 570,
      height: Number(source.getAttribute('height')) || source.naturalHeight || source.videoHeight || 321
    };
  }

  function updateLayout() {
    const container = document.querySelector('.container');
    if (container) {
      const columns = Math.max(2, Math.ceil(container.clientWidth / 180));
      all('#thumbnails .project_thumb').forEach(thumb => {
        thumb.style.width = `${100 / columns}%`;
      });
    }

    const header = document.querySelector('.site_header');
    const navigation = header && header.querySelector('.navigation');
    const logo = header && (header.querySelector('.header_image') || header.querySelector('.header_text'));
    if (header && navigation && logo) {
      header.classList.toggle('collapse', header.clientWidth < navigation.offsetWidth + logo.offsetWidth);
    }

    if (footer && footerThumbs.length) {
      const range = innerWidth <= 640 ? 2 : innerWidth < 840 ? 3 : 4;
      const count = Math.min(footerThumbs.length, range * 2 + 1);
      const current = footerActive >= 0 ? footerActive : 0;
      const selected = [];
      if (footerThumbs.length <= range * 2 + 1) {
        selected.push(...footerThumbs);
      } else {
        for (let offset = -range; offset <= range; offset++) {
          selected.push(footerThumbs[(current + offset + footerThumbs.length) % footerThumbs.length]);
        }
      }
      footerThumbs.forEach(thumb => { thumb.hidden = !selected.includes(thumb); });
      selected.forEach(thumb => {
        thumb.style.width = `${100 / (range * 2 + 1)}%`;
        footer.appendChild(thumb);
      });
      const wrapper = footer.closest('.project_footer_thumbnails_container');
      if (wrapper) wrapper.hidden = count <= 1;
    }

    all('.project_media iframe, .project_media object, .project_media embed, .project_content iframe, .project_content object, .project_content embed').forEach(media => {
      if (media.closest('.slideshow_container')) return;
      const size = dimensions(media);
      const width = Math.min(size.width, media.parentElement.clientWidth || size.width);
      media.style.width = `${width}px`;
      media.style.height = `${width * size.height / size.width}px`;
    });

    slideshows.forEach(show => {
      const available = show.root.parentElement.clientWidth || 570;
      const sizes = show.slides.map(dimensions);
      const width = Math.min(available, Math.max(...sizes.map(size => size.width)));
      const height = Math.max(...sizes.map(size => size.height * Math.min(1, width / size.width)));
      show.root.style.width = `${width}px`;
      show.stage.style.width = `${width}px`;
      show.stage.style.height = `${height}px`;
      show.slides.forEach((slide, index) => {
        const size = sizes[index];
        const scale = Math.min(1, width / size.width);
        const slideWidth = size.width * scale;
        const slideHeight = size.height * scale;
        slide.style.width = `${slideWidth}px`;
        slide.style.height = `${slideHeight}px`;
        slide.style.left = `${(width - slideWidth) / 2}px`;
        slide.style.top = `${(height - slideHeight) / 2}px`;
      });
    });
  }

  function scheduleLayout() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; updateLayout(); });
  }

  function showSlide(show, index) {
    show.index = (index + show.slides.length) % show.slides.length;
    show.slides.forEach((slide, position) => {
      const active = position === show.index;
      slide.classList.toggle('offline-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      if (slide.matches('img')) slide.tabIndex = active ? 0 : -1;
      if (!active && slide.matches('video, audio')) slide.pause();
    });
    if (show.position) show.position.textContent = `${show.index + 1} of ${show.slides.length}`;
    show.lastChange = Date.now();
  }

  function createButton(label, text, className, callback) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.textContent = text;
    button.addEventListener('click', callback);
    return button;
  }

  function closeLightbox() {
    if (!lightbox) return;
    const previous = lightbox;
    lightbox = null;
    previous.root.remove();
    document.body.style.overflow = previous.overflow;
    const focusTarget = previous.show ? previous.show.slides[previous.show.index] : previous.trigger;
    focusTarget.focus({ preventScroll: true });
    slideshows.forEach(show => { show.lastChange = Date.now(); });
  }

  function updateLightbox(index) {
    if (!lightbox) return;
    lightbox.index = (index + lightbox.images.length) % lightbox.images.length;
    const source = lightbox.images[lightbox.index];
    lightbox.image.alt = source.alt || document.querySelector('.project_title')?.textContent.trim() || 'Project image';
    lightbox.image.src = source.getAttribute('src_o') || source.getAttribute('data-hi-res') || source.src;
    lightbox.image.classList.remove('offline-zoomed');
    lightbox.zoom.setAttribute('aria-pressed', 'false');
    lightbox.counter.textContent = `${lightbox.index + 1} / ${lightbox.images.length}`;
    if (lightbox.show) {
      const slideIndex = lightbox.show.slides.indexOf(source);
      if (slideIndex >= 0) showSlide(lightbox.show, slideIndex);
    }
  }

  function openLightbox(source, show) {
    if (lightbox) return;
    const images = show ? show.slides.filter(slide => slide.matches('img'))
      : all('.project_media img, .project_content img').filter(image => !image.closest('.slideshow'));
    if (!images.includes(source)) images.push(source);
    const root = document.createElement('div');
    root.className = 'offline-lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Project images');
    const imageArea = document.createElement('div');
    imageArea.className = 'offline-lightbox-image-area';
    const image = document.createElement('img');
    image.className = 'offline-lightbox-image';
    imageArea.appendChild(image);
    const controls = document.createElement('div');
    controls.className = 'offline-lightbox-controls';
    const previous = createButton('Previous image', '‹', '', () => updateLightbox(lightbox.index - 1));
    const next = createButton('Next image', '›', '', () => updateLightbox(lightbox.index + 1));
    const close = createButton('Close fullscreen (Escape)', '×', '', closeLightbox);
    const counter = document.createElement('span');
    counter.className = 'offline-lightbox-counter';
    counter.setAttribute('aria-live', 'polite');
    const zoom = createButton('Toggle original image size', '+', '', () => {
      const active = image.classList.toggle('offline-zoomed');
      zoom.setAttribute('aria-pressed', String(active));
    });
    zoom.setAttribute('aria-pressed', 'false');
    previous.hidden = next.hidden = images.length < 2;
    controls.append(previous, next, close, zoom, counter);
    root.append(imageArea, controls);
    root.addEventListener('click', event => { if (event.target === imageArea) closeLightbox(); });
    image.addEventListener('click', () => zoom.click());
    lightbox = { root, image, images, index: images.indexOf(source), counter, zoom, show, trigger: source, overflow: document.body.style.overflow };
    document.body.style.overflow = 'hidden';
    document.body.appendChild(root);
    updateLightbox(lightbox.index);
    close.focus();
  }

  all('.slideshow').forEach(root => {
    const stage = root.querySelector('.slideshow_container');
    const slides = stage ? Array.from(stage.children) : [];
    if (!slides.length) return;
    const show = { root, stage, slides, index: 0, lastChange: Date.now(), position: root.querySelector('.slideshow_position') };
    slideshows.push(show);
    root.classList.add('offline-slideshow-ready');
    [['.slideshow_prev', -1, 'Previous slide'], ['.slideshow_next', 1, 'Next slide']].forEach(([selector, step, label]) => {
      const control = root.querySelector(selector);
      if (!control) return;
      control.setAttribute('aria-label', label);
      control.addEventListener('click', event => { event.preventDefault(); showSlide(show, show.index + step); });
    });
    slides.filter(slide => slide.matches('img')).forEach(slide => {
      slide.setAttribute('role', 'button');
      slide.setAttribute('aria-label', 'View image fullscreen');
      slide.addEventListener('click', () => openLightbox(slide, show));
      slide.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(slide, show); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          showSlide(show, show.index + (event.key === 'ArrowRight' ? 1 : -1));
          show.slides[show.index].focus();
        }
      });
    });
    showSlide(show, 0);
  });

  all('.project_media img, .project_content img').filter(image => !image.closest('.slideshow') && !image.closest('a')).forEach(image => {
    image.tabIndex = 0;
    image.classList.add('offline-lightbox-trigger');
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', 'View image fullscreen');
    image.addEventListener('click', () => openLightbox(image, null));
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(image, null); }
    });
  });

  document.addEventListener('keydown', event => {
    if (lightbox) {
      if (event.key === 'Escape') { event.preventDefault(); closeLightbox(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        updateLightbox(lightbox.index + (event.key === 'ArrowRight' ? 1 : -1));
      }
      if (event.key === 'Tab') {
        const buttons = all('button', lightbox.root).filter(button => !button.hidden);
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const link = document.querySelector(`.project_nav .${event.key === 'ArrowLeft' ? 'previous' : 'next'}`);
      if (link && link.getAttribute('href') !== '#') { event.preventDefault(); link.click(); }
    }
  });

  if (!reduceMotion && slideshows.length) setInterval(() => {
    if (document.hidden || lightbox) return;
    slideshows.forEach(show => {
      if (show.slides.length > 1 && Date.now() - show.lastChange >= 5000 && !show.root.matches(':focus-within')) showSlide(show, show.index + 1);
    });
  }, 250);

  all('img,video').forEach(media => {
    media.addEventListener('load', scheduleLayout);
    media.addEventListener('loadedmetadata', scheduleLayout);
  });
  window.addEventListener('resize', scheduleLayout, { passive: true });
  updateLayout();
})();

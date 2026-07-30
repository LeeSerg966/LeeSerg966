/* ==========================================================================
   Kesvaro theme — storefront behaviour
   Vanilla JS, no dependencies. Every custom element degrades gracefully:
   without JS the forms still post to Shopify normally.
   ========================================================================== */

(function () {
  'use strict';

  var settings = window.themeSettings || {};
  var strings = window.themeStrings || {};
  var routes = settings.routes || {};

  /* ---------------------------------------------------------------- helpers */

  function formatMoney(cents) {
    var format = settings.moneyFormat || '${{amount}}';
    var value = (cents / 100).toFixed(2);

    if (format.indexOf('amount_with_comma_separator') !== -1) {
      value = value.replace('.', ',');
      value = value.replace(/\B(?=(\d{3})+(?!\d)(?![^,]*,))/g, '.');
    } else {
      value = value.replace(/\B(?=(\d{3})+(?!\d)(?![^.]*\.))/g, ',');
    }

    return format.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function toast(message) {
    var el = document.getElementById('ThemeToast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });
    clearTimeout(el.dataset.timer);
    el.dataset.timer = setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () {
        el.hidden = true;
      }, 300);
    }, 3200);
  }

  function fetchJSON(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.description || data.message || 'Request failed');
        }
        return data;
      });
    });
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  /* ------------------------------------------------------------ cart events */

  var cartSubscribers = [];

  function onCartUpdate(fn) {
    cartSubscribers.push(fn);
  }

  function publishCart(cart) {
    cartSubscribers.forEach(function (fn) {
      try {
        fn(cart);
      } catch (error) {
        console.error(error);
      }
    });
  }

  function refreshCartCount(cart) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
  }

  onCartUpdate(refreshCartCount);

  function addToCart(payload) {
    return fetchJSON(routes.cartAdd || '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (item) {
      return getCart().then(function (cart) {
        publishCart(cart);
        return item;
      });
    });
  }

  function changeCart(payload) {
    return fetchJSON(routes.cartChange || '/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (cart) {
      publishCart(cart);
      return cart;
    });
  }

  function getCart() {
    return fetchJSON((routes.cart || '/cart') + '.js');
  }

  /* -------------------------------------------------------------- panels */

  var openPanels = [];

  function openPanel(panel) {
    if (!panel) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    openPanels.push(panel);

    var focusTarget = panel.querySelector('[data-panel-focus]') || panel.querySelector('button, a, input');
    if (focusTarget) setTimeout(function () { focusTarget.focus(); }, 60);
  }

  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    openPanels = openPanels.filter(function (item) { return item !== panel; });
    if (!openPanels.length) document.body.classList.remove('overflow-hidden');
  }

  function closeAllPanels() {
    openPanels.slice().forEach(closePanel);
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-panel-open]');
    if (opener) {
      event.preventDefault();
      openPanel(document.getElementById(opener.getAttribute('data-panel-open')));
      return;
    }

    if (event.target.closest('[data-panel-close]') || event.target.classList.contains('panel__overlay')) {
      var panel = event.target.closest('.panel');
      if (panel) {
        event.preventDefault();
        closePanel(panel);
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAllPanels();
  });

  /* ------------------------------------------------------------- cart drawer */

  var cartDrawer = document.getElementById('CartDrawer');

  function renderCartDrawer() {
    if (!cartDrawer) return Promise.resolve();
    return fetch(routes.cart + '?section_id=cart-drawer')
      .then(function (response) { return response.text(); })
      .then(function (html) {
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var fresh = parsed.querySelector('[data-cart-drawer-body]');
        var target = cartDrawer.querySelector('[data-cart-drawer-body]');
        if (fresh && target) target.innerHTML = fresh.innerHTML;
      });
  }

  onCartUpdate(function () {
    if (cartDrawer) renderCartDrawer();
  });

  /* --------------------------------------------------- add-to-cart forms */

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-product-form]');
    if (!form) return;
    if (!settings.cartDrawer) return; // let the browser post normally

    event.preventDefault();

    var button = form.querySelector('[type="submit"]');
    var formData = new FormData(form);
    var payload = {
      items: [
        {
          id: Number(formData.get('id')),
          quantity: Number(formData.get('quantity') || 1)
        }
      ]
    };

    // Carry over any line item properties (properties[Engraving] etc.)
    var properties = {};
    formData.forEach(function (value, key) {
      var match = key.match(/^properties\[(.+)\]$/);
      if (match && value) properties[match[1]] = value;
    });
    if (Object.keys(properties).length) payload.items[0].properties = properties;

    if (button) {
      button.classList.add('loading');
      button.setAttribute('aria-disabled', 'true');
    }

    addToCart(payload)
      .then(function () {
        if (cartDrawer) {
          openPanel(cartDrawer);
        } else {
          toast(strings.added || 'Added');
        }
      })
      .catch(function (error) {
        toast(error.message);
      })
      .finally(function () {
        if (button) {
          button.classList.remove('loading');
          button.removeAttribute('aria-disabled');
        }
      });
  });

  /* --------------------------------------------------- cart quantity + remove */

  document.addEventListener('click', function (event) {
    var removeBtn = event.target.closest('[data-cart-remove]');
    if (removeBtn) {
      event.preventDefault();
      changeCart({ line: Number(removeBtn.getAttribute('data-cart-remove')), quantity: 0 }).catch(function (error) {
        toast(error.message);
      });
      return;
    }

    var stepper = event.target.closest('[data-quantity-change]');
    if (!stepper) return;

    var wrapper = stepper.closest('[data-quantity]');
    var input = wrapper.querySelector('input');
    var step = stepper.getAttribute('data-quantity-change') === 'up' ? 1 : -1;
    var min = Number(input.getAttribute('min') || 0);
    var next = Math.max(min, Number(input.value) + step);

    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-cart-line]');
    if (!input) return;

    changeCart({ line: Number(input.getAttribute('data-cart-line')), quantity: Number(input.value) }).catch(function (error) {
      toast(error.message);
    });
  });

  /* --------------------------------------------------------- variant picker */

  function ProductForm(root) {
    var variantsScript = root.querySelector('[data-variants]');
    if (!variantsScript) return;

    var variants = JSON.parse(variantsScript.textContent);
    var idInput = root.querySelector('[name="id"]');
    var priceTarget = root.querySelector('[data-price-target]');
    var submit = root.querySelector('[data-submit]');
    var submitText = submit ? submit.querySelector('.btn__text') : null;
    var stock = root.querySelector('[data-stock]');
    var sku = root.querySelector('[data-sku]');
    var mediaList = document.querySelector('[data-product-media]');

    function selectedOptions() {
      return Array.prototype.map.call(root.querySelectorAll('[data-option-index]'), function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    function findVariant(options) {
      return variants.find(function (variant) {
        return options.every(function (value, index) {
          if (value === null) return true;
          return variant.options[index] === value;
        });
      });
    }

    function updateAvailability(options) {
      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var index = Number(group.getAttribute('data-option-index'));
        group.querySelectorAll('input').forEach(function (input) {
          var probe = options.slice();
          probe[index] = input.value;
          var match = variants.find(function (variant) {
            return probe.every(function (value, i) {
              if (value === null || i > index) return true;
              return variant.options[i] === value;
            });
          });
          input.disabled = !match || !match.available;
        });
      });
    }

    function updateMedia(variant) {
      if (!mediaList || !variant || !variant.featured_media) return;
      var target = mediaList.querySelector('[data-media-id="' + variant.featured_media.id + '"]');
      if (!target) return;
      mediaList.prepend(target);
      if (window.matchMedia('(max-width: 989px)').matches) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function update() {
      var options = selectedOptions();
      var variant = findVariant(options);

      updateAvailability(options);

      if (!variant) {
        if (submit) {
          submit.disabled = true;
          if (submitText) submitText.textContent = strings.unavailable || 'Unavailable';
        }
        return;
      }

      if (idInput) idInput.value = variant.id;

      if (priceTarget && variant.price_html) {
        priceTarget.innerHTML = variant.price_html;
      } else if (priceTarget) {
        priceTarget.textContent = formatMoney(variant.price);
      }

      if (sku) sku.textContent = variant.sku || '';

      if (submit) {
        submit.disabled = !variant.available;
        if (submitText) {
          submitText.textContent = variant.available ? strings.addToCart : strings.soldOut;
        }
      }

      if (stock) {
        stock.className = 'stock-indicator';
        if (!variant.available) {
          stock.classList.add('stock-indicator--out');
          stock.textContent = stock.getAttribute('data-text-out');
        } else if (variant.inventory_management && variant.inventory_quantity > 0 && variant.inventory_quantity <= 10) {
          stock.classList.add('stock-indicator--low');
          stock.textContent = (stock.getAttribute('data-text-low') || '').replace('{{ count }}', variant.inventory_quantity);
        } else {
          stock.textContent = stock.getAttribute('data-text-in');
        }
      }

      updateMedia(variant);

      if (variant.url && window.history.replaceState) {
        window.history.replaceState({}, '', variant.url);
      }
    }

    root.addEventListener('change', function (event) {
      if (event.target.closest('[data-option-index]')) update();
    });

    update();
  }

  document.querySelectorAll('[data-product-root]').forEach(ProductForm);

  /* --------------------------------------------------------- quick add cards */

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-quick-add]');
    if (!button) return;

    event.preventDefault();
    var variantId = button.getAttribute('data-quick-add');
    button.classList.add('loading');

    addToCart({ items: [{ id: Number(variantId), quantity: 1 }] })
      .then(function () {
        if (cartDrawer) {
          openPanel(cartDrawer);
        } else {
          toast(strings.added || 'Added');
        }
      })
      .catch(function (error) { toast(error.message); })
      .finally(function () { button.classList.remove('loading'); });
  });

  /* ------------------------------------------------------- predictive search */

  var searchForm = document.querySelector('[data-predictive-search]');
  if (searchForm && routes.predictiveSearch) {
    var input = searchForm.querySelector('input[type="search"]');
    var results = document.querySelector('[data-search-results]');

    var run = debounce(function () {
      var term = input.value.trim();
      if (term.length < 2) {
        results.innerHTML = '';
        return;
      }

      fetch(routes.predictiveSearch + '?q=' + encodeURIComponent(term) + '&resources[type]=product&resources[limit]=6&section_id=predictive-search')
        .then(function (response) { return response.text(); })
        .then(function (html) {
          var parsed = new DOMParser().parseFromString(html, 'text/html');
          var fresh = parsed.querySelector('[data-search-results]');
          if (fresh) results.innerHTML = fresh.innerHTML;
        })
        .catch(function () { results.innerHTML = ''; });
    }, 250);

    if (input && results) input.addEventListener('input', run);
  }

  /* ------------------------------------------------------------ sticky header */

  var header = document.querySelector('.header-wrapper');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------- announcement slider */

  document.querySelectorAll('[data-announcement]').forEach(function (root) {
    var slides = root.querySelectorAll('.announcement__slide');
    if (slides.length < 2) return;
    var index = 0;
    setInterval(function () {
      slides[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
    }, Number(root.getAttribute('data-announcement')) || 5000);
  });

  /* ------------------------------------------------------------ sort / filters */

  document.querySelectorAll('[data-auto-submit]').forEach(function (el) {
    el.addEventListener('change', function () {
      var form = el.closest('form');
      if (form) form.submit();
    });
  });

  /* ----------------------------------------------------------- address forms */

  document.querySelectorAll('[data-address-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.getAttribute('data-address-toggle'));
      if (target) target.hidden = !target.hidden;
    });
  });

  document.querySelectorAll('[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.getAttribute('data-confirm'))) event.preventDefault();
    });
  });

  /* ---------------------------------------------------------------- share */

  document.querySelectorAll('[data-share]').forEach(function (button) {
    button.addEventListener('click', function () {
      var url = button.getAttribute('data-share');
      if (navigator.share) {
        navigator.share({ url: url, title: document.title }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          toast(button.getAttribute('data-share-copied') || 'Link copied');
        });
      }
    });
  });

  // Keep the count fresh when the page is restored from bfcache.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) getCart().then(publishCart).catch(function () {});
  });
})();

/* ==========================================================================
   Media: click-to-load video + image lightbox
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------ deferred media */

  if (!customElements.get('deferred-media')) {
    customElements.define(
      'deferred-media',
      class DeferredMedia extends HTMLElement {
        connectedCallback() {
          var button = this.querySelector('[data-deferred-play]');
          if (button) button.addEventListener('click', this.load.bind(this));
        }

        load() {
          if (this.dataset.loaded) return;

          var template = this.querySelector('template');
          if (!template) return;

          var content = template.content.firstElementChild.cloneNode(true);
          var poster = this.querySelector('[data-deferred-play]');

          this.appendChild(content);
          if (poster) poster.remove();
          this.dataset.loaded = 'true';

          var media = this.querySelector('video, iframe');
          if (media && media.tagName === 'VIDEO') {
            media.play().catch(function () {});
          }
          if (media) media.focus();
        }
      }
    );
  }

  /* ------------------------------------------------------------ lightbox */

  var lightbox = null;

  function buildLightbox() {
    if (lightbox) return lightbox;

    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.hidden = false;
    lightbox.innerHTML =
      '<button type="button" class="lightbox__close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
      '</button><img alt=""><span class="lightbox__caption"></span>';

    document.body.appendChild(lightbox);

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox || event.target.closest('.lightbox__close')) close();
    });

    return lightbox;
  }

  function open(src, caption) {
    var el = buildLightbox();
    var img = el.querySelector('img');
    var captionEl = el.querySelector('.lightbox__caption');

    img.src = src;
    img.alt = caption || '';
    captionEl.textContent = caption || '';

    el.classList.add('is-open');
    document.body.classList.add('overflow-hidden');
    el.querySelector('.lightbox__close').focus();
  }

  function close() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    if (!document.querySelector('.panel.is-open')) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-lightbox]');
    if (!trigger) return;

    event.preventDefault();
    open(trigger.getAttribute('data-lightbox'), trigger.getAttribute('data-lightbox-caption'));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') close();
  });
})();

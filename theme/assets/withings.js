/* Scroll-reveal + shop configurator for the U-Scan Nutrio theme.
   Ported from the Reveal component + ShopConfigurator client logic. */
(function () {
  function initReveal() {
    var els = document.querySelectorAll(".wi-reveal");
    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || !window.innerHeight || reduceMotion) {
      els.forEach(function (el) { el.classList.add("is-shown"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            var delay = e.target.getAttribute("data-reveal-delay");
            if (delay) e.target.style.animationDelay = delay + "ms";
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      /* Reveal ~500px BEFORE the box enters view so the 0.7s fade finishes
         off-screen — the user sees a settled image, not a fade + late image pop. */
      { threshold: 0, rootMargin: "0px 0px 500px 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  function initConfigurator() {
    document.querySelectorAll("[data-wi-configurator]").forEach(function (root) {
      var priceEl = root.querySelector("[data-wi-price]");
      var freqEl = root.querySelector("[data-wi-freq]");
      var cartEl = root.querySelector("[data-wi-cartridge]");
      var totalEl = root.querySelector("[data-wi-total]");
      var nameEl = root.querySelector("[data-wi-package-name]");
      var addBtn = root.querySelector("[data-wi-add]");
      var gallery = root.querySelector("[data-wi-main-img]");
      var lightbox = root.querySelector("[data-wi-lightbox]");
      var lightboxImg = lightbox ? lightbox.querySelector("[data-wi-lightbox-img]") : null;

      function openLightbox() {
        if (!lightbox || !lightboxImg || !gallery) return;
        lightboxImg.setAttribute("src", gallery.getAttribute("src"));
        lightbox.classList.add("is-open");
      }
      function closeLightbox() {
        if (lightbox) lightbox.classList.remove("is-open");
      }

      if (gallery && lightbox) {
        gallery.addEventListener("click", openLightbox);
        lightbox.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") closeLightbox();
        });
      }

      root.querySelectorAll("[data-wi-package]").forEach(function (input) {
        input.addEventListener("change", function () {
          var el = input.closest("[data-price]");
          if (!el) return;
          var price = el.getAttribute("data-price");
          if (priceEl) priceEl.textContent = price;
          if (totalEl) totalEl.textContent = price;
          if (freqEl) freqEl.textContent = el.getAttribute("data-freq") || "";
          if (cartEl) cartEl.textContent = el.getAttribute("data-cartridge") || "";
          if (nameEl) nameEl.textContent = el.getAttribute("data-name") || "";
        });
      });

      root.querySelectorAll("[data-wi-thumb]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (gallery) gallery.setAttribute("src", btn.getAttribute("data-src"));
          root.querySelectorAll("[data-wi-thumb]").forEach(function (b) {
            b.classList.toggle("border-ink", b === btn);
            b.classList.toggle("border-border-soft", b !== btn);
          });
        });
      });

      if (addBtn) {
        addBtn.addEventListener("click", function () {
          var label = addBtn.getAttribute("data-added-label") || "Added to cart";
          var original = addBtn.textContent;
          addBtn.textContent = label + " ✓";
          setTimeout(function () { addBtn.textContent = original; }, 2000);
        });
      }
    });
  }

  function initInViewVideos() {
    var vids = document.querySelectorAll(".js-inview-video");
    if (!vids.length) return;
    /* Some of these videos carry no autoplay attribute (see below), so this call is the only
       thing that starts them. If the browser refuses to play without a gesture (e.g. iOS Low
       Power Mode), show the native controls so the visitor can start the clip; with the
       attribute Safari offers its own start button. */
    function play(v) {
      var p = v.play();
      if (!p || !p.catch) return;
      p.catch(function (err) {
        if (!v.autoplay && err && err.name === "NotAllowedError") v.controls = true;
      });
    }
    if (!("IntersectionObserver" in window)) {
      vids.forEach(function (v) { play(v); });
      return;
    }
    var vio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            play(v);
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    /* Videos without the autoplay attribute are preload="none", so they download nothing on
       page load. Without a poster they also have no real size until their metadata arrives,
       so fetch just that from well ahead (2000px) to let the box settle before it scrolls
       into view; vio's play() loads the rest. */
    var warm = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.preload = "metadata";
          warm.unobserve(e.target);
        });
      },
      { rootMargin: "2000px 0px" }
    );
    vids.forEach(function (v) {
      vio.observe(v);
      if (!v.autoplay) warm.observe(v);
    });
  }

  function initImageFade() {
    var imgs = document.querySelectorAll('img[loading="lazy"]');
    if (!imgs.length) return;
    var style = document.createElement("style");
    style.textContent =
      "img.wi-fade{opacity:0;transition:opacity .45s ease}img.wi-fade.wi-loaded{opacity:1}";
    document.head.appendChild(style);
    imgs.forEach(function (img) {
      if (img.classList.contains("wi-fade")) return;
      img.classList.add("wi-fade");
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("wi-loaded");
      } else {
        img.addEventListener("load", function () { img.classList.add("wi-loaded"); }, { once: true });
        img.addEventListener("error", function () { img.classList.add("wi-loaded"); }, { once: true });
      }
    });
  }

  function init() { initReveal(); initConfigurator(); initInViewVideos(); initImageFade(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

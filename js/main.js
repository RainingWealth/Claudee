/* ============================================================
   Rayvern Chng — Main JavaScript
   Mobile nav, scroll animations, testimonial carousel, FAQ, form validation
   ============================================================ */

(function () {
  'use strict';

  // --- Navigation: Sticky + Glassmorphism on Scroll ---
  const nav = document.getElementById('mainNav');
  if (nav) {
    let lastScroll = 0;
    window.addEventListener('scroll', function () {
      const currentScroll = window.pageYOffset;
      if (currentScroll > 60) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // --- Mobile Navigation Toggle ---
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');

  function openMobileMenu() {
    mobileMenu.classList.add('mobile-menu--open');
    mobileOverlay.classList.add('mobile-menu__overlay--visible');
    navToggle.classList.add('nav__toggle--open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('mobile-menu--open');
    mobileOverlay.classList.remove('mobile-menu__overlay--visible');
    navToggle.classList.remove('nav__toggle--open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (navToggle && mobileMenu && mobileOverlay) {
    navToggle.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.contains('mobile-menu--open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileOverlay.addEventListener('click', closeMobileMenu);

    // Close on link click
    var mobileLinks = mobileMenu.querySelectorAll('.mobile-menu__link');
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('mobile-menu--open')) {
        closeMobileMenu();
      }
    });
  }

  // --- Scroll Reveal Animations (Intersection Observer) ---
  var revealElements = document.querySelectorAll('.reveal, .reveal--left, .reveal--right, .reveal--scale, .reveal--fade');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: show all elements immediately
    revealElements.forEach(function (el) {
      el.classList.add('reveal--visible');
    });
  }

  // --- Testimonial Carousel ---
  var testimonialTrack = document.getElementById('testimonialTrack');
  var testimonialDots = document.querySelectorAll('.testimonial-dot');

  if (testimonialTrack && testimonialDots.length > 0) {
    var currentSlide = 0;
    var totalSlides = testimonialDots.length;
    var autoplayInterval;

    function goToSlide(index) {
      currentSlide = index;
      testimonialTrack.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';

      testimonialDots.forEach(function (dot, i) {
        dot.classList.toggle('testimonial-dot--active', i === currentSlide);
        dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
      });
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % totalSlides);
    }

    // Dot navigation
    testimonialDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var slideIndex = parseInt(this.getAttribute('data-slide'), 10);
        goToSlide(slideIndex);
        resetAutoplay();
      });
    });

    // Autoplay
    function startAutoplay() {
      autoplayInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoplay() {
      clearInterval(autoplayInterval);
      startAutoplay();
    }

    startAutoplay();

    // Pause on hover
    var carouselEl = document.getElementById('testimonialCarousel');
    if (carouselEl) {
      carouselEl.addEventListener('mouseenter', function () {
        clearInterval(autoplayInterval);
      });
      carouselEl.addEventListener('mouseleave', startAutoplay);
    }
  }

  // --- FAQ Accordion ---
  var faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');

    if (question && answer) {
      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('faq-item--open');

        // Close all other items
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('faq-item--open');
            var otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) {
              otherAnswer.style.maxHeight = null;
              otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle current item
        if (isOpen) {
          item.classList.remove('faq-item--open');
          answer.style.maxHeight = null;
          question.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('faq-item--open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          question.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // --- Contact Form Validation ---
  var contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var isValid = true;
      var formGroups = contactForm.querySelectorAll('.form-group[data-required]');

      formGroups.forEach(function (group) {
        var input = group.querySelector('.form-input, .form-textarea, .form-select');
        if (input) {
          var value = input.value.trim();
          if (!value) {
            group.classList.add('form-group--error');
            isValid = false;
          } else {
            group.classList.remove('form-group--error');
          }

          // Email validation
          if (input.type === 'email' && value) {
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
              group.classList.add('form-group--error');
              isValid = false;
            }
          }
        }
      });

      if (isValid) {
        // Show success state
        var submitBtn = contactForm.querySelector('.btn[type="submit"]');
        if (submitBtn) {
          var originalText = submitBtn.textContent;
          submitBtn.textContent = 'Message Sent!';
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.7';

          setTimeout(function () {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
            contactForm.reset();
          }, 3000);
        }
      }
    });

    // Clear errors on input
    var formInputs = contactForm.querySelectorAll('.form-input, .form-textarea, .form-select');
    formInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        var group = this.closest('.form-group');
        if (group) {
          group.classList.remove('form-group--error');
        }
      });
    });
  }

  // --- Active Nav Link Highlighting ---
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var navLinks = document.querySelectorAll('.nav__link');

  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('nav__link--active');
    } else {
      link.classList.remove('nav__link--active');
    }
  });

})();

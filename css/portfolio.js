/* ==========================================================================
   Portfolio — animations & interactions
   Lenis (smooth scroll) + GSAP + ScrollTrigger
   Gracefully degrades when libs are missing or prefers-reduced-motion is set.
   ========================================================================== */

(function () {
    'use strict';

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('DOMContentLoaded', function () {
        setFooterYear();
        initNav();

        // Wait a frame so deferred library scripts have a chance to register globals.
        window.requestAnimationFrame(function () {
            initSmoothScroll();
            initAnimations();
        });
    });

    /* ------------------------------------------------------------------ */

    function setFooterYear() {
        var y = document.getElementById('year');
        if (y) y.textContent = new Date().getFullYear();
    }

    /* ---------- Nav: scrolled state + mobile toggle + active link ---------- */

    function initNav() {
        var nav = document.getElementById('nav');
        var toggle = document.getElementById('navToggle');
        var links = document.querySelector('.nav-links');
        var navAnchors = document.querySelectorAll('.nav-links a[data-nav]');

        if (!nav) return;

        var onScroll = function () {
            if (window.scrollY > 12) nav.classList.add('is-scrolled');
            else nav.classList.remove('is-scrolled');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        if (toggle && links) {
            toggle.addEventListener('click', function () {
                var open = links.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            links.addEventListener('click', function (e) {
                if (e.target.tagName === 'A' && links.classList.contains('is-open')) {
                    links.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Active section highlighting via IntersectionObserver (works even without ScrollTrigger).
        var idToLink = {};
        navAnchors.forEach(function (a) {
            var id = (a.getAttribute('href') || '').replace('#', '');
            if (id) idToLink[id] = a;
        });

        var sectionIds = Object.keys(idToLink);
        if (!sectionIds.length || !('IntersectionObserver' in window)) return;

        var setActive = function (id) {
            navAnchors.forEach(function (a) { a.classList.remove('is-active'); });
            if (idToLink[id]) idToLink[id].classList.add('is-active');
        };

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        sectionIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) io.observe(el);
        });
    }

    /* ---------- Lenis smooth scroll ---------- */

    var lenisInstance = null;

    function initSmoothScroll() {
        if (reduceMotion || typeof window.Lenis === 'undefined') return;

        try {
            lenisInstance = new window.Lenis({
                duration: 1.1,
                easing: function (t) { return 1 - Math.pow(1 - t, 3); },
                smoothWheel: true,
                smoothTouch: false
            });

            function raf(time) {
                lenisInstance.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);

            // Anchor-link smooth scrolling via Lenis
            document.querySelectorAll('a[href^="#"]').forEach(function (a) {
                a.addEventListener('click', function (e) {
                    var href = a.getAttribute('href');
                    if (!href || href === '#') return;
                    var target = document.querySelector(href);
                    if (!target) return;
                    e.preventDefault();
                    lenisInstance.scrollTo(target, { offset: -72 });
                });
            });
        } catch (err) {
            // Fail silently; native scroll still works.
            lenisInstance = null;
        }
    }

    /* ---------- Animations: GSAP + ScrollTrigger, with graceful fallback ---------- */

    function initAnimations() {
        var hasGSAP = typeof window.gsap !== 'undefined';
        var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

        // Fallback: simple IntersectionObserver-driven reveal (still nice on all browsers).
        if (!hasGSAP || reduceMotion) {
            return initFallbackReveal();
        }

        var gsap = window.gsap;
        if (hasST) gsap.registerPlugin(window.ScrollTrigger);

        // Keep ScrollTrigger in sync with Lenis
        if (hasST && lenisInstance) {
            lenisInstance.on('scroll', window.ScrollTrigger.update);
            gsap.ticker.add(function (time) { lenisInstance.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
        }

        // ---------------- Hero entrance timeline ----------------
        // Promote hero [data-reveal] elements to their final "revealed" state BEFORE
        // creating the GSAP timeline. Otherwise `gsap.from()` would read the CSS
        // `[data-reveal] { opacity: 0 }` as the end state and leave them invisible.
        document.querySelectorAll('.hero [data-reveal]').forEach(function (el) {
            el.classList.add('is-revealed');
        });

        var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // Wrap each line's text in a single inner span so we can animate it with
        // translateY (the parent .hero-title-line has overflow:hidden for a mask-reveal).
        // We use a single inner span (not per-char) so gradient text clipping stays intact.
        var splitLines = document.querySelectorAll('.hero [data-split]');
        splitLines.forEach(function (line) {
            var text = line.textContent;
            line.textContent = '';
            var inner = document.createElement('span');
            inner.className = 'line-inner';
            inner.textContent = text;
            inner.style.display = 'inline-block';
            inner.style.willChange = 'transform';
            // Inherit gradient clipping settings (important for .hero-title-gradient)
            inner.style.background = 'inherit';
            inner.style.webkitBackgroundClip = 'inherit';
            inner.style.backgroundClip = 'inherit';
            inner.style.color = 'inherit';
            line.appendChild(inner);
        });

        heroTl
            .fromTo('.hero-portrait',
                { opacity: 0, scale: 0.9, x: 30 },
                { opacity: 1, scale: 1, x: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform' },
                0)
            .fromTo('.hero-eyebrow',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, clearProps: 'transform' },
                0)
            .fromTo('.hero [data-split] .line-inner',
                { yPercent: 110 },
                { yPercent: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' },
                '-=0.2')
            .fromTo('.hero-tagline',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, clearProps: 'transform' },
                '-=0.55')
            .fromTo('.scroll-cue',
                { opacity: 0 },
                { opacity: 1, duration: 0.6 },
                '-=0.3');

        // ---------------- Generic reveals ----------------
        if (hasST) {
            document.querySelectorAll('[data-reveal]').forEach(function (el) {
                // Skip hero descendants — handled by timeline above
                if (el.closest('.hero')) {
                    el.classList.add('is-revealed'); // ensure visible after hero tl
                    return;
                }
                gsap.fromTo(el,
                    { opacity: 0, y: 28 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: el,
                            start: 'top 85%',
                            toggleActions: 'play none none none'
                        },
                        onComplete: function () { el.classList.add('is-revealed'); }
                    }
                );
            });

            // Story cards: stagger the 4 inner blocks
            document.querySelectorAll('.story').forEach(function (story) {
                var blocks = story.querySelectorAll('.story-block');
                gsap.fromTo(story,
                    { opacity: 0, y: 40 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: story,
                            start: 'top 82%',
                            toggleActions: 'play none none none'
                        },
                        onComplete: function () { story.classList.add('is-revealed'); }
                    }
                );

                if (blocks.length) {
                    gsap.fromTo(blocks,
                        { opacity: 0, y: 18 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.55,
                            ease: 'power2.out',
                            stagger: 0.12,
                            scrollTrigger: {
                                trigger: story,
                                start: 'top 75%',
                                toggleActions: 'play none none none'
                            }
                        }
                    );
                }
            });

            // Beyond-work stories: slide text + visual from alternating sides
            document.querySelectorAll('.beyond-story').forEach(function (story) {
                var reverse = story.classList.contains('beyond-story-reverse');
                var text = story.querySelector('.beyond-text');
                var visual = story.querySelector('.beyond-visual');
                if (text) {
                    gsap.fromTo(text,
                        { opacity: 0, x: reverse ? 40 : -40 },
                        {
                            opacity: 1,
                            x: 0,
                            duration: 0.9,
                            ease: 'power3.out',
                            scrollTrigger: { trigger: story, start: 'top 80%' }
                        }
                    );
                }
                if (visual) {
                    gsap.fromTo(visual,
                        { opacity: 0, x: reverse ? -40 : 40, scale: 0.95 },
                        {
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            duration: 0.9,
                            ease: 'power3.out',
                            scrollTrigger: { trigger: story, start: 'top 80%' }
                        }
                    );
                }
            });

            // Section titles: subtle slide-in
            document.querySelectorAll('.section-title').forEach(function (el) {
                gsap.fromTo(el,
                    { opacity: 0, y: 24 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 85%' }
                    }
                );
            });

            // Counter tweens
            document.querySelectorAll('.metric').forEach(function (el) {
                var target = parseFloat(el.getAttribute('data-metric'));
                var suffix = el.getAttribute('data-suffix') || '';
                if (isNaN(target)) return;

                var isFloat = target % 1 !== 0;
                var obj = { v: 0 };
                gsap.to(obj, {
                    v: target,
                    duration: 1.4,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 90%',
                        toggleActions: 'play none none none'
                    },
                    onUpdate: function () {
                        var val = isFloat ? obj.v.toFixed(1) : Math.round(obj.v);
                        el.textContent = val + suffix;
                    },
                    onComplete: function () {
                        var val = isFloat ? target.toFixed(1) : target;
                        el.textContent = val + suffix;
                    }
                });
            });

            // Skill bars + score counters
            document.querySelectorAll('.skill').forEach(function (skill) {
                var fill = skill.querySelector('.skill-fill');
                var score = skill.querySelector('.skill-score');
                if (!fill) return;
                var target = parseFloat(fill.getAttribute('data-skill')) || 0;
                target = Math.max(0, Math.min(100, target));

                var obj = { v: 0 };
                gsap.to(obj, {
                    v: target,
                    duration: 1.2,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: skill,
                        start: 'top 88%',
                        toggleActions: 'play none none none'
                    },
                    onUpdate: function () {
                        fill.style.width = obj.v.toFixed(1) + '%';
                        if (score) score.textContent = Math.round(obj.v);
                    },
                    onComplete: function () {
                        fill.style.width = target + '%';
                        if (score) score.textContent = target;
                    }
                });
            });

            // Subtle background-glow parallax
            gsap.to('.bg-glow-1', {
                yPercent: -18,
                xPercent: -6,
                ease: 'none',
                scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom top', scrub: true }
            });
            gsap.to('.bg-glow-2', {
                yPercent: 12,
                xPercent: 4,
                ease: 'none',
                scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom top', scrub: true }
            });

            // Refresh on font load so measurements are accurate
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
            }
        } else {
            // GSAP present but no ScrollTrigger — use IO fallback for the rest.
            initFallbackReveal();
        }
    }

    /* ---------- Fallback reveal (no GSAP / reduced motion) ---------- */

    function initFallbackReveal() {
        var targets = document.querySelectorAll('[data-reveal], .story');
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('is-revealed'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

        targets.forEach(function (el) { io.observe(el); });

        // Counters: simple end-state write if reduced motion, otherwise small IO animation.
        document.querySelectorAll('.metric').forEach(function (el) {
            var target = parseFloat(el.getAttribute('data-metric'));
            var suffix = el.getAttribute('data-suffix') || '';
            if (isNaN(target)) return;
            if (reduceMotion) {
                var isFloat = target % 1 !== 0;
                el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
                return;
            }
            var ioc = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    animateNumber(entry.target, target, suffix);
                    ioc.unobserve(entry.target);
                });
            }, { threshold: 0.25 });
            ioc.observe(el);
        });

        // Skill bars: set immediately if reduced motion, else animate via IO + CSS transition
        document.querySelectorAll('.skill').forEach(function (skill) {
            var fill = skill.querySelector('.skill-fill');
            var score = skill.querySelector('.skill-score');
            if (!fill) return;
            var target = parseFloat(fill.getAttribute('data-skill')) || 0;
            target = Math.max(0, Math.min(100, target));

            if (reduceMotion) {
                fill.style.width = target + '%';
                if (score) score.textContent = target;
                return;
            }

            if (!('IntersectionObserver' in window)) {
                fill.style.width = target + '%';
                if (score) score.textContent = target;
                return;
            }

            var ios = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    fill.style.width = target + '%';
                    if (score) animateNumber(score, target, '');
                    ios.unobserve(entry.target);
                });
            }, { threshold: 0.2 });
            ios.observe(skill);
        });
    }

    function animateNumber(el, target, suffix) {
        var isFloat = target % 1 !== 0;
        var duration = 1200;
        var start = performance.now();
        function step(now) {
            var p = Math.min(1, (now - start) / duration);
            // easeOutCubic
            var e = 1 - Math.pow(1 - p, 3);
            var v = target * e;
            el.textContent = (isFloat ? v.toFixed(1) : Math.round(v)) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
        }
        requestAnimationFrame(step);
    }
})();

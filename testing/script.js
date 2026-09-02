// ============================================
// SETUP
// ============================================
gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
    // Respect the user's OS setting: show everything in its final
    // state immediately, skip all scroll-driven motion entirely.
    gsap.set('.hero-headline .word, .hero-sub', { opacity: 1, y: 0, rotateX: 0, scale: 1 });
} else {
    initHeroPin();
    initLineupHorizontalScroll();
    initStackingCards();
    initScrollVelocitySkew();
}

// ============================================
// 1. PINNED HERO — WORD-BY-WORD REVEAL
// ============================================
function initHeroPin() {
    const words = gsap.utils.toArray('.hero-headline .word');

    gsap.set(words, { opacity: 0, rotateX: 90, scale: 0.6, transformOrigin: 'center bottom' });

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: '+=120%',
            scrub: 1,
            pin: true,
            anticipatePin: 1
        }
    });

    tl.to(words, {
        opacity: 1,
        rotateX: 0,
        scale: 1,
        stagger: 0.25,
        ease: 'power3.out'
    })
    .to('.hero-sub', {
        opacity: 1,
        y: 0,
        ease: 'power2.out'
    }, '-=0.4')
    // Continue scrolling past the reveal: headline scales up + fades,
    // background zooms in slightly for a parallax exit.
    .to('.hero-headline', {
        scale: 1.35,
        opacity: 0,
        ease: 'power1.in'
    }, '+=0.3')
    .to('.hero-sub', {
        opacity: 0,
        y: -20,
        ease: 'power1.in'
    }, '<')
    .to('.hero-bg', {
        scale: 1.25,
        ease: 'power1.in'
    }, '<');
}

// ============================================
// 2. LINEUP — PIN + HORIZONTAL SCRUB SCROLL
// ============================================
function initLineupHorizontalScroll() {
    // On small screens the section becomes a normal touch-scrollable
    // row instead (see mobile CSS) — skip the pin/scrub trick there,
    // since pinning + horizontal scrub feels awkward on touch devices.
    ScrollTrigger.matchMedia({
        '(min-width: 769px)': function () {
            const track = document.querySelector('.lineup-track');
            const section = document.querySelector('.lineup-pin');

            function getScrollDistance() {
                return -(track.scrollWidth - window.innerWidth + 100);
            }

            gsap.to(track, {
                x: getScrollDistance,
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${Math.abs(getScrollDistance())}`,
                    scrub: 1,
                    pin: true,
                    invalidateOnRefresh: true,
                    anticipatePin: 1
                }
            });
        }
    });
}

// ============================================
// 3. EVENT HIGHLIGHTS — STACKING CARDS
// ============================================
function initStackingCards() {
    const cards = gsap.utils.toArray('.stack-card');

    cards.forEach(function (card, i) {
        const nextCard = cards[i + 1];
        if (!nextCard) return;

        // As the NEXT card scrolls up to cover this one, scale this
        // one down and dim it slightly — the classic "stack" depth cue.
        gsap.to(card, {
            scale: 0.92,
            filter: 'brightness(0.55)',
            ease: 'none',
            scrollTrigger: {
                trigger: nextCard,
                start: 'top bottom',
                end: 'top top',
                scrub: true
            }
        });
    });

    // Staggered entrance for the whole stack section title
    gsap.from('.highlights-section .section-title', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: '.highlights-section',
            start: 'top 75%'
        }
    });
}

// ============================================
// 4. SCROLL-VELOCITY SKEW
// GSAP's documented "skew on scroll velocity" pattern, applied to
// any element with the .skew-el class (DJ cards + highlight cards).
// ============================================
function initScrollVelocitySkew() {
    const skewTargets = document.querySelectorAll('.skew-el');
    if (!skewTargets.length) return;

    const proxy = { skew: 0 };
    const clamp = gsap.utils.clamp(-6, 6);
    const skewSetter = gsap.quickSetter(skewTargets, 'skewY', 'deg');

    gsap.set(skewTargets, { transformOrigin: 'center center', force3D: true });

    ScrollTrigger.create({
        onUpdate: function (self) {
            const skew = clamp(self.getVelocity() / -300);
            if (Math.abs(skew) > Math.abs(proxy.skew)) {
                proxy.skew = skew;
                gsap.to(proxy, {
                    skew: 0,
                    duration: 0.8,
                    ease: 'power3',
                    overwrite: true,
                    onUpdate: function () {
                        skewSetter(proxy.skew);
                    }
                });
            }
        }
    });
}

// ============================================
// RSVP FORM — DEMO ONLY (no backend wired up)
// ============================================
document.getElementById('rsvpForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('🎉 This is a demo form — nothing was actually submitted.');
});

class NavigationButtons {
    constructor() {
        this.mapLink = document.getElementById('map-link');
        this.toTopButton = document.getElementById('to-top');
        this.hideTimeout = null;
        this.rotationAngle = 0;
        this.animationFrame = null;

        this.init();
    }

    init() {
        this.renderCompass();
        this.renderToTopButton();
        this.setupEventListeners();
        this.updateCompassDirection();
        this.animateLighthouse();
    }

    renderCompass() {
        const compassSVG = `
            <svg viewBox="0 0 70 70" width="70" height="70" xmlns="http://www.w3.org/2000/svg">
                <!-- Metallic border -->
                <circle cx="35" cy="35" r="34" fill="#e0cfa0" stroke="#a88c4a" stroke-width="1"/>
                <circle cx="35" cy="35" r="32" fill="#f8f5e3" stroke="#bfa76a" stroke-width="0.7"/>
                <!-- Compass rose (background, de-emphasized) -->
                <g stroke="#d6c9a3" stroke-width="0.5" opacity="0.35">
                    <polygon points="35,11 37,35 35,59 33,35" fill="#e6d3a3"/>
                    <polygon points="11,35 35,37 59,35 35,33" fill="#e6d3a3"/>
                    <polygon points="35,16 38,35 35,54 32,35" fill="#c2b280"/>
                    <polygon points="16,35 35,38 54,35 35,32" fill="#c2b280"/>
                </g>
                <!-- Degree marks -->
                <g stroke="#a88c4a" stroke-width="0.5">
                    ${Array.from({length: 36}).map((_,i)=>{
                        const angle = (i*10-90)*Math.PI/180;
                        const x1 = 35 + Math.cos(angle)*30;
                        const y1 = 35 + Math.sin(angle)*30;
                        const x2 = 35 + Math.cos(angle)*(i%3===0?27:29);
                        const y2 = 35 + Math.sin(angle)*(i%3===0?27:29);
                        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
                    }).join('')}
                </g>
                <!-- Cardinal and intercardinal directions -->
                <text x="35" y="15" text-anchor="middle" font-size="6" font-weight="bold" fill="#7c5a2b">N</text>
                <text x="35" y="65" text-anchor="middle" font-size="6" font-weight="bold" fill="#7c5a2b">S</text>
                <text x="61" y="38" text-anchor="middle" font-size="6" font-weight="bold" fill="#7c5a2b">E</text>
                <text x="15" y="38" text-anchor="middle" font-size="6" font-weight="bold" fill="#7c5a2b">W</text>
                <text x="54" y="20" text-anchor="middle" font-size="4" fill="#7c5a2b">NE</text>
                <text x="54" y="58" text-anchor="middle" font-size="4" fill="#7c5a2b">SE</text>
                <text x="20" y="58" text-anchor="middle" font-size="4" fill="#7c5a2b">SW</text>
                <text x="20" y="20" text-anchor="middle" font-size="4" fill="#7c5a2b">NW</text>
                <!-- Main Dynamic Arrow (needle, visually prominent, larger and contrasting) -->
                <g class="compass-arrow" style="transform-origin: 35px 35px;">
                    <!-- Red (north) side -->
                    <polygon points="35,13 39,35 35,57 35,35" fill="#d32f2f"/>
                    <!-- Blue (south) side -->
                    <polygon points="35,13 35,35 31,35 35,57" fill="#1976d2"/>
                    <circle cx="35" cy="35" r="3" fill="#bfa76a" stroke="#7c5a2b" stroke-width="0.7"/>
                    <text x="35" y="22" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#fff" stroke="#7c5a2b" stroke-width="0.3">N</text>
                    <text x="35" y="54" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#fff" stroke="#7c5a2b" stroke-width="0.3">S</text>
                </g>
            </svg>
        `;
        this.mapLink.innerHTML = compassSVG;
        this.startCompassArrowAnimation();
    }

    startCompassArrowAnimation() {
        const arrow = this.mapLink.querySelector('.compass-arrow');
        if (!arrow) return;
        let lastScroll = window.scrollY;
        let shakePhase = 0;
        const animate = () => {
            // Calculate scroll percentage
            const scrollPosition = window.scrollY;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercentage = documentHeight > 0 ? scrollPosition / documentHeight : 0;
            // Arrow points up at top, down at bottom
            const baseRotation = scrollPercentage * 180; // 0deg (up) to 180deg (down)
            // Add shaking (wobble)
            shakePhase += 0.15;
            const shake = Math.sin(shakePhase) * 4; // 4deg shake
            const totalRotation = baseRotation + shake;
            arrow.style.transform = `rotate(${totalRotation}deg)`;
            requestAnimationFrame(animate);
        };
        animate();
    }

    renderToTopButton() {
        const toTopSVG = `
            <svg viewBox="0 0 24 24">
                <defs>
                    <linearGradient id="light-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#f1c40f;stop-opacity:1"/>
                        <stop offset="100%" style="stop-color:#f39c12;stop-opacity:0.8"/>
                    </linearGradient>
                    <linearGradient id="light-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#f1c40f;stop-opacity:0.8"/>
                        <stop offset="100%" style="stop-color:#f1c40f;stop-opacity:0"/>
                    </linearGradient>
                    <linearGradient id="sea-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#3498db;stop-opacity:0.8"/>
                        <stop offset="100%" style="stop-color:#2980b9;stop-opacity:1"/>
                    </linearGradient>
                    <linearGradient id="tower-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#95a5a6"/>
                        <stop offset="50%" style="stop-color:#7f8c8d"/>
                        <stop offset="100%" style="stop-color:#95a5a6"/>
                    </linearGradient>
                </defs>
                <!-- Sea -->
                <path class="lighthouse-sea" d="M0 22 L24 22 L24 24 L0 24 Z"/>
                <!-- Lighthouse base platform -->
                <path class="lighthouse-base" d="M6 20 L18 20 L18 22 L6 22 Z"/>
                <!-- Lighthouse tower -->
                <path class="lighthouse-tower" d="M10 6 L14 6 L14 20 L10 20 Z"/>
                <!-- Tower windows -->
                <rect class="lighthouse-window" x="11" y="8" width="2" height="3" rx="0.5"/>
                <rect class="lighthouse-window" x="11" y="13" width="2" height="3" rx="0.5"/>
                <!-- Lighthouse top platform -->
                <path class="lighthouse-top-platform" d="M8 6 L16 6 L16 7 L8 7 Z"/>
                <!-- Lighthouse top -->
                <path class="lighthouse-top" d="M7 3 L17 3 L16 6 L8 6 Z"/>
                <!-- Stationary light -->
                <circle class="lighthouse-light" cx="12" cy="3" r="1" fill="url(#light-gradient)"/>
                <!-- Rotating beam -->
                <path class="lighthouse-light-beam" d="M12 3 L12 3 L12 3 L12 3 Z"/>
                <!-- Railings -->
                <path class="lighthouse-railing" d="M7 7 L17 7 M7 7 L7 8 M17 7 L17 8"/>
            </svg>
        `;

        this.toTopButton.innerHTML = toTopSVG;
    }

    animateLighthouse() {
        const beam = this.toTopButton.querySelector('.lighthouse-light-beam');
        if (!beam) return;

        const updateBeam = () => {
            // Convert angle to radians
            const angleRad = (this.rotationAngle * Math.PI) / 180;

            // Calculate beam dimensions based on angle
            const beamLength = 72; // Increased from 36 to 72 for longer beam
            const beamHeight = 8; // Increased from 4 to 8 for taller beam

            // Calculate beam position and size
            const startX = 12; // Light position X
            const startY = 3;  // Light position Y

            // Calculate end points of the beam
            const endX = startX + Math.cos(angleRad) * beamLength;
            const endY = startY + Math.sin(angleRad) * beamHeight;

            // Create beam path
            const beamPath = `M${startX} ${startY} L${endX} ${startY} L${endX} ${endY} L${startX} ${startY} Z`;

            // Update beam path
            beam.setAttribute('d', beamPath);

            // Update rotation angle
            this.rotationAngle = (this.rotationAngle + 1) % 360;

            // Continue animation
            this.animationFrame = requestAnimationFrame(updateBeam);
        };

        // Start animation
        this.animationFrame = requestAnimationFrame(updateBeam);
    }

    setupEventListeners() {
        this.mapLink.addEventListener('mouseenter', () => {
            this.mapLink.classList.add('hover');
        });

        this.mapLink.addEventListener('mouseleave', () => {
            this.mapLink.classList.remove('hover');
        });

        window.addEventListener('scroll', () => {
            this.updateCompassDirection();

            if (window.scrollY > 300) {
                this.toTopButton.classList.add('visible');
                clearTimeout(this.hideTimeout);
                this.hideTimeout = setTimeout(() => {
                    this.toTopButton.classList.remove('visible');
                }, 5000);
            } else {
                this.toTopButton.classList.remove('visible');
            }
        });

        this.toTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    updateCompassDirection() {
        const scrollPosition = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = scrollPosition / documentHeight;
        const rotation = scrollPercentage * 360;

        const compassArrow = this.mapLink.querySelector('.compass-arrow');
        if (compassArrow) {
            compassArrow.style.transform = `rotate(${rotation}deg)`;
        }
    }
}

// Initialize navigation buttons
document.addEventListener('DOMContentLoaded', () => {
    new NavigationButtons();
});

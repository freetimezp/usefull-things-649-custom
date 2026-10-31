const config = {
    imageCount: 12,
    imagePath: (i) => `./assets/images/img${i}.jpg`,

    gridSizeDesktop: 0.075,
    gridSizeMobile: 0.05,
    gridSpacing: 0.05,

    mobileBreakpoint: 1000,
    cursorReach: 0.35,
    maxImageScale: 3.5,
    driftSpeed: 75,
    followSpeed: 5,
    revealDuration: 0.5,
};

const spotlightSection = document.querySelector(".spotlight");
const clusterCanvas = document.createElement("canvas");

clusterCanvas.className = "cluster-canvas";
spotlightSection.prepend(clusterCanvas);

const ctx = clusterCanvas.getContext("2d");

let imageBaseSize, spacing, gridStep, gridColumns, gridRows, cursorReach;

function calculateGridLayout() {
    const viewW = innerWidth;
    const viewH = innerHeight;

    imageBaseSize =
        viewW >= config.mobileBreakpoint
            ? viewH * config.gridSizeDesktop
            : viewH * config.gridSizeMobile;

    spacing = viewH * config.gridSpacing;
    gridStep = imageBaseSize + spacing;
    gridColumns = Math.ceil(viewW / gridStep) + 2;
    gridRows = Math.ceil(viewW / gridStep) + 2;

    cursorReach = Math.min(viewW, viewH) * config.cursorReach;
}

function resizeClusterCanvas() {
    const dpr = devicePixelRatio || 1;

    clusterCanvas.width = innerWidth * dpr;
    clusterCanvas.height = innerHeight * dpr;
    clusterCanvas.style.width = innerWidth + "px";
    clusterCanvas.style.height = innerHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    calculateGridLayout();
}

window.addEventListener("resize", resizeClusterCanvas);
resizeClusterCanvas();

const loadedImages = [];

for (let i = 1; i <= config.imageCount; i++) {
    const img = new Image();

    img.src = config.imagePath(i);
    img.onload = () => {
        loadedImages.push(img);
    };
}

function imageAtGridPosition(col, row) {
    if (!loadedImages.length) return null;

    const index = Math.abs((col * 11 + row * 7) % loadedImages.length);

    return loadedImages[index];
}

const mousePosition = { x: innerWidth / 2, y: innerHeight / 2 };
const focalPoint = { x: mousePosition.x, y: mousePosition.y };

window.addEventListener(
    "mousemove",
    (e) => {
        mousePosition.x = e.clientX;
        mousePosition.y = e.clientY;
    },
    { passive: true },
);

function wrapAround(value, min, max) {
    const range = max - min;

    return ((((value - min) % range) + range) % range) + min;
}

function cursorInfluence(distanceFromCursor, maxDistance) {
    if (distanceFromCursor >= maxDistance) return 0;

    const normalized = distanceFromCursor / maxDistance;
    const falloff = 1 - normalized * normalized;

    return falloff * falloff;
}

const clusterReveal = { intensity: 0 };

function drawCluster(elapsed, deltaMs) {
    const viewW = innerWidth;
    const viewH = innerHeight;
    const dt = deltaMs / 1000;

    focalPoint.x += (mousePosition.x - focalPoint.x) * dt * config.followSpeed;
    focalPoint.y += (mousePosition.y - focalPoint.y) * dt * config.followSpeed;

    ctx.clearRect(0, 0, viewW, viewH);

    if (!loadedImages.length) return;

    const driftX = elapsed * config.driftSpeed;
    const driftY = elapsed * -config.driftSpeed;

    const wrapMinX = -gridStep;
    const wrapMaxX = viewW + gridStep;
    const wrapMinY = -gridStep;
    const wrapMaxY = viewH + gridStep;

    for (let row = -1; row < gridRows; row++) {
        for (let col = -1; col < gridColumns; col++) {
            const cellX = wrapAround(
                col * gridStep + driftX,
                wrapMinX,
                wrapMaxX,
            );

            const cellY = wrapAround(
                row * gridStep + driftY,
                wrapMinY,
                wrapMaxY,
            );

            const image = imageAtGridPosition(col, row);
            if (!image) continue;

            const aspectRatio = image.naturalWidth / image.naturalHeight;

            const imageWidth =
                aspectRatio >= 1 ? imageBaseSize : imageBaseSize * aspectRatio;
            const imageHeight =
                aspectRatio >= 1 ? imageBaseSize / aspectRatio : imageBaseSize;

            const cellCenterX = cellX + imageBaseSize / 2;
            const cellCenterY = cellY + imageBaseSize / 2;

            const distanceX = cellCenterX - focalPoint.x;
            const distanceY = cellCenterY - focalPoint.y;

            const distanceFromCursor = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY,
            );

            if (distanceFromCursor > cursorReach) continue;

            const imageScale =
                cursorInfluence(distanceFromCursor, cursorReach) *
                config.maxImageScale *
                clusterReveal.intensity;

            if (imageScale < 0.02) continue;

            const scaledWidth = imageWidth * imageScale;
            const scaledHeight = imageHeight * imageScale;

            ctx.drawImage(
                image,
                cellX + (imageBaseSize - scaledWidth) / 2,
                cellY + (imageBaseSize - scaledHeight) / 2,
                scaledWidth,
                scaledHeight,
            );
        }
    }
}

gsap.ticker.add(drawCluster);
gsap.to(clusterReveal, {
    intensity: 1,
    duration: config.revealDuration,
    ease: "power2.inOut",
});

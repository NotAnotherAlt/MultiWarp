const createRendererDrawScheduler = (renderer, initiallyEnabled) => {
    const originalDraw = renderer.draw;
    const hadOwnDraw = Object.prototype.hasOwnProperty.call(renderer, 'draw');
    let enabled = initiallyEnabled;
    let animationFrame = null;

    const draw = function (...args) {
        if (!enabled) {
            return originalDraw.apply(renderer, args);
        }
        if (animationFrame !== null) return;
        animationFrame = requestAnimationFrame(() => {
            animationFrame = null;
            originalDraw.call(renderer);
        });
    };

    renderer.draw = draw;

    return {
        setEnabled (nextEnabled) {
            if (enabled === nextEnabled) return;
            enabled = nextEnabled;
            if (!enabled && animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
                originalDraw.call(renderer);
            }
        },
        dispose () {
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            if (renderer.draw === draw) {
                if (hadOwnDraw) {
                    renderer.draw = originalDraw;
                } else {
                    delete renderer.draw;
                }
            }
        }
    };
};

export default createRendererDrawScheduler;

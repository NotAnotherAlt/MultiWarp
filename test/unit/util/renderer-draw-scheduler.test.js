import createRendererDrawScheduler from '../../../src/lib/renderer-draw-scheduler';

describe('renderer draw scheduler', () => {
    let callbacks;
    let originalRequestAnimationFrame;
    let originalCancelAnimationFrame;

    beforeEach(() => {
        callbacks = new Map();
        originalRequestAnimationFrame = global.requestAnimationFrame;
        originalCancelAnimationFrame = global.cancelAnimationFrame;
        global.requestAnimationFrame = jest.fn(callback => {
            const id = callbacks.size + 1;
            callbacks.set(id, callback);
            return id;
        });
        global.cancelAnimationFrame = jest.fn(id => callbacks.delete(id));
    });

    afterEach(() => {
        global.requestAnimationFrame = originalRequestAnimationFrame;
        global.cancelAnimationFrame = originalCancelAnimationFrame;
    });

    test('coalesces enabled draws to one animation frame', () => {
        const draw = jest.fn();
        const renderer = {draw};
        const scheduler = createRendererDrawScheduler(renderer, true);

        renderer.draw();
        renderer.draw();
        expect(draw).not.toHaveBeenCalled();
        expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);

        callbacks.get(1)();
        expect(draw).toHaveBeenCalledTimes(1);
        scheduler.dispose();
    });

    test('draws immediately when disabled and flushes a pending draw', () => {
        const draw = jest.fn();
        const renderer = {draw};
        const scheduler = createRendererDrawScheduler(renderer, true);

        renderer.draw();
        scheduler.setEnabled(false);
        expect(global.cancelAnimationFrame).toHaveBeenCalledWith(1);
        expect(draw).toHaveBeenCalledTimes(1);

        renderer.draw();
        expect(draw).toHaveBeenCalledTimes(2);
        scheduler.dispose();
    });

    test('restores the original draw method on disposal', () => {
        const originalDraw = jest.fn();
        const renderer = {draw: originalDraw};
        const scheduler = createRendererDrawScheduler(renderer, true);

        scheduler.dispose();
        expect(renderer.draw).toBe(originalDraw);
    });
});

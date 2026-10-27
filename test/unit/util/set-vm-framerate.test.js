import setVMFramerate from '../../../src/lib/set-vm-framerate';

describe('setVMFramerate', () => {
    test('uses the VM API for supported framerates', () => {
        const vm = {
            setFramerate: jest.fn(),
            runtime: {
                frameLoop: {
                    setFramerate: jest.fn()
                },
                emit: jest.fn()
            }
        };

        setVMFramerate(vm, 250);

        expect(vm.setFramerate).toHaveBeenCalledWith(250);
        expect(vm.runtime.frameLoop.setFramerate).not.toHaveBeenCalled();
        expect(vm.runtime.emit).not.toHaveBeenCalled();
    });

    test('allows up to 300 FPS through the VM frame loop', () => {
        const vm = {
            setFramerate: jest.fn(),
            runtime: {
                frameLoop: {
                    setFramerate: jest.fn()
                },
                emit: jest.fn()
            }
        };

        setVMFramerate(vm, 300);

        expect(vm.setFramerate).not.toHaveBeenCalled();
        expect(vm.runtime.frameLoop.setFramerate).toHaveBeenCalledWith(300);
        expect(vm.runtime.emit).toHaveBeenCalledWith('FRAMERATE_CHANGED', 300);
    });
});

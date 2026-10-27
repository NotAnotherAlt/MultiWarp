const VM_FRAMERATE_LIMIT = 250;

const setVMFramerate = (vm, framerate) => {
    if (framerate <= VM_FRAMERATE_LIMIT) {
        vm.setFramerate(framerate);
        return;
    }

    vm.runtime.frameLoop.setFramerate(framerate);
    vm.runtime.emit('FRAMERATE_CHANGED', framerate);
};

export default setVMFramerate;

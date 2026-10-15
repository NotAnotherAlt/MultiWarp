export default async function ({ addon }) {
  const vm = addon.tab.traps.vm;
  let previousCompilerOptions = {...vm.runtime.compilerOptions};
  const disableCompiler = () => vm.setCompilerOptions({
    ...vm.runtime.compilerOptions,
    enabled: false
  });
  const restoreCompilerOptions = () => vm.setCompilerOptions(previousCompilerOptions);
  disableCompiler();
  addon.self.addEventListener('disabled', restoreCompilerOptions);
  addon.self.addEventListener('reenabled', () => {
    previousCompilerOptions = {...vm.runtime.compilerOptions};
    disableCompiler();
  });
}

export default async function ({ addon }) {
  const setCloudEnabled = enabled => addon.tab.redux.dispatch({
    type: 'tw/SET_CLOUD',
    cloud: enabled
  });
  let previousCloudSetting = addon.tab.redux.state.scratchGui.tw.cloud;
  setCloudEnabled(false);
  addon.self.addEventListener('disabled', () => setCloudEnabled(previousCloudSetting));
  addon.self.addEventListener('reenabled', () => {
    previousCloudSetting = addon.tab.redux.state.scratchGui.tw.cloud;
    setCloudEnabled(false);
  });
}

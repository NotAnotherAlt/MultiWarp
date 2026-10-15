export default async function ({ addon, console }) {
  await addon.tab.traps.getBlockly();

  let controlsRect;
  let previousIsHovered = false;
  const workspaces = new Map();
  const speeds = {
    none: "0s",
    short: "0.2s",
    default: "0.3s",
    long: "0.5s",
  };

  const customZoomAreaElement = document.createElement("div");
  customZoomAreaElement.className = "sa-custom-zoom-area";

  function update() {
    document.removeEventListener("mousemove", onMouseMove);

    if (addon.self.disabled || addon.tab.editorMode !== "editor") return;

    const workspace = Blockly.getMainWorkspace();
    if (!workspaces.has(workspace)) {
      workspaces.set(workspace, {...workspace.options.zoomOptions});
    }
    workspace.options.zoomOptions.maxScale = addon.settings.get("maxZoom") / 100;
    workspace.options.zoomOptions.minScale = addon.settings.get("minZoom") / 100;
    workspace.options.zoomOptions.startScale = addon.settings.get("startZoom") / 100;
    workspace.options.zoomOptions.scaleSpeed = 1 + 0.2 * (addon.settings.get("zoomSpeed") / 100);

    const svgGroup = getZoomControls();
    const autohide = addon.settings.get("autohide");
    if (svgGroup) svgGroup.classList.toggle("sa-custom-zoom-hidden", autohide);
    if (autohide) {
      const injectionDiv = document.querySelector(".injectionDiv");
      if (injectionDiv) injectionDiv.appendChild(customZoomAreaElement);
      updateRect();
      document.addEventListener("mousemove", onMouseMove);
    }
  }

  function disable() {
    document.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("resize", onResize);
    for (const [workspace, zoomOptions] of workspaces) {
      Object.assign(workspace.options.zoomOptions, zoomOptions);
      const svgGroup = workspace.zoomControls_ && workspace.zoomControls_.svgGroup_;
      if (svgGroup) {
        svgGroup.classList.remove("sa-custom-zoom-hidden");
        svgGroup.style.removeProperty("--sa-custom-zoom-speed");
      }
    }
    customZoomAreaElement.remove();
  }

  function getZoomControls() {
    const zoomControls = Blockly.getMainWorkspace().zoomControls_;
    if (zoomControls) return zoomControls.svgGroup_;
    return null;
  }

  function onMouseMove(e) {
    const isHovered =
      e.x > controlsRect.left && e.x < controlsRect.right && e.y > controlsRect.top && e.y < controlsRect.bottom;
    if (isHovered !== previousIsHovered) {
      previousIsHovered = isHovered;
      const svgGroup = getZoomControls();
      if (svgGroup) {
        svgGroup.style.setProperty("--sa-custom-zoom-speed", speeds[addon.settings.get("speed")]);
        svgGroup.classList.toggle("sa-custom-zoom-hidden", !isHovered);
      }
    }
  }

  function updateRect() {
    controlsRect = customZoomAreaElement.getBoundingClientRect();
  }

  function onResize() {
    if (addon.tab.editorMode === "editor" && addon.settings.get("autohide")) {
      updateRect();
    }
  }

  if (document.querySelector('[class^="backpack_backpack-container"]')) {
    window.dispatchEvent(new Event("resize"));
  }
  addon.settings.addEventListener("change", update);
  window.addEventListener("resize", onResize);
  addon.self.addEventListener("disabled", disable);
  addon.self.addEventListener("reenabled", () => {
    window.addEventListener("resize", onResize);
    update();
  });
  while (true) {
    await addon.tab.waitForElement(".blocklyZoom", {
      markAsSeen: true,
      reduxEvents: [
        "scratch-gui/mode/SET_PLAYER",
        "scratch-gui/locales/SELECT_LOCALE",
        "scratch-gui/theme/SET_THEME",
        "fontsLoaded/SET_FONTS_LOADED",
      ],
      reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
    });
    update();
  }
}

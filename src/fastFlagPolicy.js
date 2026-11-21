// Roblox's published Player allowlist, checked 2026-09-05.
// https://devforum.roblox.com/t/3966569
// Keep unsupported imported entries in the preset for editing/export, but do
// not write them as supposed performance improvements to the Player client.
const PLAYER_FLAGS = new Set([
  'DFIntCSGLevelOfDetailSwitchingDistance',
  'DFIntCSGLevelOfDetailSwitchingDistanceL12',
  'DFIntCSGLevelOfDetailSwitchingDistanceL23',
  'DFIntCSGLevelOfDetailSwitchingDistanceL34',
  'FFlagHandleAltEnterFullscreenManually',
  'DFFlagTextureQualityOverrideEnabled',
  'DFIntTextureQualityOverride',
  'FIntDebugForceMSAASamples',
  'DFFlagDisableDPIScale',
  'FFlagDebugGraphicsPreferD3D11',
  'FFlagDebugSkyGray',
  'DFFlagDebugPauseVoxelizer',
  'DFIntDebugFRMQualityLevelOverride',
  'FIntFRMMaxGrassDistance',
  'FIntFRMMinGrassDistance',
  'FFlagDebugGraphicsPreferVulkan',
  'FFlagDebugGraphicsPreferOpenGL',
  'FIntGrassMovementReducedMotionFactor'
]);

function supportedPlayerFlags(flags) {
  return Object.fromEntries(Object.entries(flags || {}).filter(([key]) => PLAYER_FLAGS.has(key)));
}

module.exports = { PLAYER_FLAGS, supportedPlayerFlags };

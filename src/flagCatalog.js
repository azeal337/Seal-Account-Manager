// Curated local Player library. Allowlist checked against Roblox on 2026-09-13.
const SealFlagCatalog = (() => {
  const flag = (name, title, category, description, choices, extra = {}) => ({ name, title, category, description, choices, ...extra });
  const bool = ['True', 'False'];
  const entries = [
    ...['', 'L12', 'L23', 'L34'].map((suffix, index) => flag(`DFIntCSGLevelOfDetailSwitchingDistance${suffix}`, `Geometry detail distance ${index + 1}`, 'Geometry', 'Controls a CSG detail transition distance. Smaller values favor simpler distant geometry; does not simplify every mesh in a game.', ['0', '25', '50', '100', '200', '400', '800'])),
    flag('DFFlagTextureQualityOverrideEnabled', 'Enable texture override', 'Textures', 'Enables the texture quality value below. Use both together.', bool),
    flag('DFIntTextureQualityOverride', 'Texture quality', 'Textures', '0 is lowest detail; 3 is highest. Lower quality can reduce texture memory use. Adds the enable flag automatically.', ['0', '1', '2', '3']),
    flag('FIntDebugForceMSAASamples', 'Anti-aliasing samples', 'Rendering', '1× minimizes MSAA work; higher values smooth edges and can cost GPU time.', ['1', '2', '4']),
    flag('FIntFRMMinGrassDistance', 'Grass minimum distance', 'Geometry', 'Grass distance lower bound. Set both grass distances to 0 to request no grass.', ['0', '50', '100']),
    flag('FIntFRMMaxGrassDistance', 'Grass maximum distance', 'Geometry', 'Grass distance upper bound. This does not remove game-created plants or trees.', ['0', '50', '100', '200', '400']),
    flag('FIntGrassMovementReducedMotionFactor', 'Grass movement reduction', 'Appearance', 'Reduces grass animation. This is primarily an appearance preference, not a measured FPS boost.', ['50', '100', '0']),
    flag('FFlagDebugSkyGray', 'Gray sky', 'Appearance', 'Requests a plain gray sky. Visual preference; no FPS improvement is promised.', bool),
    flag('DFFlagDisableDPIScale', 'Native resolution', 'Display', 'Disables DPI scaling. A sharper image can increase GPU load on a high-resolution display.', bool),
    flag('FFlagHandleAltEnterFullscreenManually', 'Fullscreen handling', 'Display', 'False requests the alternate Alt+Enter fullscreen behavior. Results depend on the client and Windows.', ['False', 'True']),
    ...[['D3D11', 'Direct3D 11'], ['Vulkan', 'Vulkan'], ['OpenGL', 'OpenGL']].map(([key, title]) => flag(`FFlagDebugGraphicsPrefer${key}`, `Prefer ${title}`, 'Rendering', 'Renderer preference, not a guaranteed speedup. Device/client support varies; selecting this replaces other renderer preferences.', bool, { experimental: true, exclusive: 'renderer' })),
    flag('DFFlagDebugPauseVoxelizer', 'Pause voxel lighting', 'Rendering', 'Experimental debugging control that can leave lighting stale or incorrect. Test in a separate preset.', bool, { experimental: true }),
    flag('DFIntDebugFRMQualityLevelOverride', 'Graphics quality override', 'Rendering', 'Managed by the graphics quality control on each account. Set it there to avoid conflicting overrides.', ['1'], { managed: true })
  ];
  function compile(selected) {
    const flags = {};
    for (const entry of entries) {
      if (entry.managed || !Object.hasOwn(selected, entry.name)) continue;
      const value = String(selected[entry.name]);
      if (!entry.choices.includes(value)) throw new Error(`Choose a listed value for ${entry.title}.`);
      flags[entry.name] = value;
    }
    if (Object.hasOwn(flags, 'DFIntTextureQualityOverride')) flags.DFFlagTextureQualityOverrideEnabled = 'True';
    const renderers = entries.filter(entry => entry.exclusive === 'renderer' && flags[entry.name] === 'True');
    if (renderers.length > 1) throw new Error('Select one renderer preference.');
    if (Number(flags.FIntFRMMinGrassDistance || 0) > Number(flags.FIntFRMMaxGrassDistance ?? Infinity)) throw new Error('Grass minimum cannot exceed grass maximum.');
    return flags;
  }
  const starters = {
    'Light textures': { DFFlagTextureQualityOverrideEnabled: 'True', DFIntTextureQualityOverride: '0', FIntDebugForceMSAASamples: '1' },
    'Low-detail alts': { DFFlagTextureQualityOverrideEnabled: 'True', DFIntTextureQualityOverride: '0', FIntDebugForceMSAASamples: '1', FIntFRMMinGrassDistance: '0', FIntFRMMaxGrassDistance: '0', DFIntCSGLevelOfDetailSwitchingDistance: '0', DFIntCSGLevelOfDetailSwitchingDistanceL12: '0', DFIntCSGLevelOfDetailSwitchingDistanceL23: '0', DFIntCSGLevelOfDetailSwitchingDistanceL34: '0' },
    'Sharper edges': { FIntDebugForceMSAASamples: '4' }
  };
  return { entries, compile, starters, checkedAt: '2026-09-13' };
})();
if (typeof module !== 'undefined') module.exports = SealFlagCatalog;

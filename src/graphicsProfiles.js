// Presets request supported controls; actual gains depend on the scene/GPU.
const SealGraphicsProfiles = (() => {
  const profiles = {
    fps: { name: 'Seal FPS', description: 'Low texture memory, minimal edge smoothing, shorter CSG detail distance, and no terrain grass.', graphics: 'Pair with graphics quality 1 for the lowest detail.', flags: { DFFlagTextureQualityOverrideEnabled:'True', DFIntTextureQualityOverride:'0', FIntDebugForceMSAASamples:'1', FIntFRMMinGrassDistance:'0', FIntFRMMaxGrassDistance:'0', DFIntCSGLevelOfDetailSwitchingDistance:'0', DFIntCSGLevelOfDetailSwitchingDistanceL12:'0', DFIntCSGLevelOfDetailSwitchingDistanceL23:'0', DFIntCSGLevelOfDetailSwitchingDistanceL34:'0' } },
    balanced: { name:'Seal Balanced', description:'Medium texture detail and 2× edge smoothing. Leaves grass and geometry distances to the game.', graphics:'Start around graphics quality 5 and adjust for your game.', flags:{DFFlagTextureQualityOverrideEnabled:'True',DFIntTextureQualityOverride:'2',FIntDebugForceMSAASamples:'2'} },
    quality: { name:'Seal High Fidelity', description:'Highest texture override, 4× edge smoothing, and native DPI resolution. Uses more GPU time and memory.', graphics:'Pair with graphics quality 10. Extra detail beyond normal maximum is not guaranteed.', flags:{DFFlagTextureQualityOverrideEnabled:'True',DFIntTextureQualityOverride:'3',FIntDebugForceMSAASamples:'4',DFFlagDisableDPIScale:'True'} }
  };
  const renderers={automatic:null,d3d11:'FFlagDebugGraphicsPreferD3D11',vulkan:'FFlagDebugGraphicsPreferVulkan',opengl:'FFlagDebugGraphicsPreferOpenGL'};
  function build(id,renderer='automatic'){
    if(!Object.hasOwn(profiles,id)||!Object.hasOwn(renderers,renderer))throw Error('Choose a graphics profile and renderer.');
    const flags={...profiles[id].flags};
    if(renderers[renderer])flags[renderers[renderer]]='True';
    return {name:profiles[id].name+(renderer==='automatic'?'':' · '+renderer.toUpperCase()),flags};
  }
  return {profiles,build};
})();
if(typeof module!=='undefined')module.exports=SealGraphicsProfiles;

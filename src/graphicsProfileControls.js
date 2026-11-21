(() => {
  const root=document.getElementById('graphicsProfiles');
  const renderer=document.getElementById('graphicsRenderer');
  const status=document.getElementById('graphicsProfileStatus');
  const hint=document.getElementById('graphicsRendererHint');
  renderer.onchange=()=>{hint.textContent=renderer.value==='automatic'?'Roblox chooses the renderer. Best starting point.':'Experimental preference. Compare the same game and scene; if launching fails, recreate the preset with Automatic. A preference may be ignored by Roblox.';};
  renderer.onchange();
  for(const [id,profile] of Object.entries(SealGraphicsProfiles.profiles)){
    const card=document.createElement('article');card.className='flag-library-card';
    const title=document.createElement('strong');title.textContent=profile.name;
    const description=document.createElement('p');description.textContent=profile.description;
    const note=document.createElement('small');note.textContent=profile.graphics;
    const button=document.createElement('button');button.className='btn btn-primary';button.type='button';button.textContent='Create preset';button.dataset.graphicsProfile=id;
    button.onclick=async()=>{
      button.disabled=true;
      try{
        const built=SealGraphicsProfiles.build(id,renderer.value);
        openPerformancePresetEditor();
        await analyzePerformancePresetJson(JSON.stringify(built.flags),built.name);
        setPresetEditorMode('guided');
        status.textContent='Review and save the preset, then choose it on your account. It takes effect on the next launch. Account graphics quality and FPS cap stay under your control.';
        document.getElementById('performancePresetEditor').scrollIntoView({block:'nearest'});
      }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    };
    card.append(title,description,note,button);root.append(card);
  }
})();

(() => {
  const keep=document.getElementById('keepRunningInput'),startup=document.getElementById('startAtLoginInput'),status=document.getElementById('backgroundStatus'),close=document.getElementById('closeAppBtn');
  function render(state) {
    keep.checked=state.keepRunning;startup.checked=state.startAtLogin;
    status.textContent=state.startupError || (state.startupRegistered?'Windows startup enabled. SAM will launch hidden at sign-in.':state.startAtLogin?(state.startupAvailable?'Preparing Windows background startup…':'Background startup is configured when you open the packaged SAM app.'):'Windows startup is off.');
    if(close){close.title=state.keepRunning?'Close to tray — tracking continues':'Quit SAM';close.setAttribute('aria-label',state.keepRunning?'Close to tray':'Quit SAM');}
  }
  async function load(){try{render(await window.api.getBackgroundSettings());}catch(error){status.textContent=error.message;}}
  for(const input of [keep,startup])input.addEventListener('change',async()=>{
    keep.disabled=startup.disabled=true;
    try{render(await window.api.saveBackgroundSettings({[input===keep?'keepRunning':'startAtLogin']:input.checked}));}
    catch(error){await load();status.textContent='Could not save background settings: '+error.message;}
    finally{keep.disabled=startup.disabled=false;}
  });
  document.getElementById('quitSamBtn').addEventListener('click',()=>window.api.quitApp());
  window.api.onBackgroundState?.(render);load();
})();

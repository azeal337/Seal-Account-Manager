(()=>{
 const select=document.getElementById('externalPlayProfile'),status=document.getElementById('externalPlayStatus');
 async function load(){
  try{const [accounts,prefs]=await Promise.all([window.api.listAccounts(),window.api.getLaunchPreferences()]);select.replaceChildren(new Option('Last used in SAM','last'));for(const account of accounts)select.add(new Option(account.username,account.id));select.value=prefs.profile;}
  catch(error){status.textContent=error.message;}
 }
 select.addEventListener('change',async()=>{select.disabled=true;try{await window.api.saveLaunchPreferences(select.value);status.textContent='Settings saved. Play launches run quietly.';}catch(error){status.textContent=error.message;await load();}finally{select.disabled=false;}});
 document.getElementById('launcherNavBtn')?.addEventListener('click',load);document.getElementById('openLauncherSettingsBtn')?.addEventListener('click',load);load();
})();

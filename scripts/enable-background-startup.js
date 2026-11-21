// Run explicitly after packaging when the user has requested Windows startup.
// Never imported by tests or by the application.
const fs=require('fs'),path=require('path');const {app}=require('electron');
const {prepareStartupExecutable}=require('../src/startupRuntime');
const index=process.argv.indexOf('--apply'),executable=index>=0?process.argv[index+1]:'';
if(!executable||!path.isAbsolute(executable)||!fs.existsSync(executable))throw Error('Pass --apply with the verified portable executable.');
if(!process.env.SEAL_TEST_TMP_ROOT)throw Error('Run through the isolated parent Electron wrapper.');
app.setPath('userData',path.join(process.env.SEAL_TEST_TMP_ROOT,'startup-setup'));
app.setAppUserModelId('com.local.sealaccountmanager');
app.whenReady().then(async()=>{
 try{
  const target=await prepareStartupExecutable({executable,portable:true,runtimeRoot:path.join(process.env.LOCALAPPDATA,'Seal Account Manager','Startup'),version:require('../package.json').version});
  const options={name:'com.local.sealaccountmanager',path:'"'+target+'"',args:['--background']};
  app.setLoginItemSettings({...options,openAtLogin:true,enabled:true});
  const actual=app.getLoginItemSettings(options);
  if(!actual.openAtLogin||actual.executableWillLaunchAtLogin===false)throw Error('Windows did not enable background startup.');
  // Remove only the earlier development registration created in this task.
  app.setLoginItemSettings({name:'Seal Account Manager',openAtLogin:false});
  const result={startupRegistered:true,path:target,args:options.args,scope:'current user'};
  console.log(JSON.stringify(result));app.quit();
 }catch(error){console.error(error.message);app.exit(1);}
});

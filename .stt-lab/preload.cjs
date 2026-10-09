const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('electronAPI',{onLabTurn:cb=>ipcRenderer.on('lab-turn',(_,x)=>cb(x)),reportSttUiTiming:x=>ipcRenderer.send('lab-paint',x)});

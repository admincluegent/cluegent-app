console.log('electron require type', typeof require('electron'));
console.log('electron keys', Object.keys(require('electron')).slice(0,10));
console.log('app exists', !!require('electron').app);

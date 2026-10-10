const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
test('Settings Close dismisses settings without quitting or deleting the signed-in account',()=>{
 const source=ts.createSourceFile('SettingsOverlay.tsx',fs.readFileSync('src/components/SettingsOverlay.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 const visit=node=>{
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='button'&&node.children.some(child=>ts.isJsxText(child)&&child.text.trim()==='Close')){
   const attr=node.openingElement.attributes.properties.find(p=>p.name?.getText(source)==='onClick');handler=attr.initializer.expression.getText(source);
  }
  ts.forEachChild(node,visit);
 };
 visit(source);assert(handler);
 let closes=0;
 const ctx={profile:{uid:'user'},onClose:()=>closes++,window:{electronAPI:{quitApp:()=>assert.fail('Close settings must not quit')}},setDeleteAccountConfirmOpen:()=>assert.fail('Quit must not open deletion'),deleteAccount:()=>assert.fail('Quit must not delete account')};
 vm.runInNewContext(ts.transpileModule(`globalThis.quit = ${handler}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);ctx.quit();assert.equal(closes,1);
});

test('Delete account section opens confirmation without deleting immediately',()=>{
 const source=ts.createSourceFile('SettingsOverlay.tsx',fs.readFileSync('src/components/SettingsOverlay.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 const visit=node=>{
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='button'&&node.children.some(child=>ts.isJsxText(child)&&child.text.trim()==='Delete account')){
   const attr=node.openingElement.attributes.properties.find(p=>p.name?.getText(source)==='onClick');handler=attr.initializer.expression.getText(source);
  }
  ts.forEachChild(node,visit);
 };
 visit(source);assert(handler);
 let confirmed=false;
 const ctx={setDeleteAccountError:()=>{},setIsDeleteAccountConfirmOpen:value=>confirmed=value,deleteAccount:()=>assert.fail('Must confirm first'),window:{electronAPI:{quitApp:()=>assert.fail('Must confirm first')}}};
 vm.runInNewContext(ts.transpileModule(`globalThis.openDelete = ${handler}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);ctx.openDelete();assert.equal(confirmed,true);
});

function deletionFixture(fail=false){
 const source=ts.createSourceFile('SettingsOverlay.tsx',fs.readFileSync('src/components/SettingsOverlay.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='handleDeleteAccountAndSignOut')handler=node.initializer.getText(source);ts.forEachChild(node,visit)};visit(source);assert(handler);
 const calls=[];let error;
 const ctx={Error,setIsDeletingAccount(){},setDeleteAccountError:value=>error=value,setIsDeleteAccountConfirmOpen:value=>calls.push(`confirm:${value}`),onClose:()=>calls.push('close-settings'),
  deleteAccount:async()=>{calls.push('delete');if(fail)throw new Error('Deletion failed');},localStorage:{clear:()=>calls.push('clear')},logoutUser:async()=>calls.push('logout'),
  window:{electronAPI:{endMeeting:async()=>calls.push('stop-session'),setFirebaseAuthToken:async value=>calls.push(`token:${value}`),setWindowMode:async value=>calls.push(`window:${value}`),quitApp:()=>assert.fail('Deletion must keep the app open')}}};
 vm.runInNewContext(ts.transpileModule(`globalThis.remove = ${handler}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);
 return {remove:ctx.remove,calls,error:()=>error};
}
test('successful account deletion stops audio, clears auth and returns to login without quitting',async()=>{
 const f=deletionFixture();await f.remove();assert.deepEqual(f.calls,['delete','stop-session','clear','token:null','window:launcher','confirm:false','close-settings','logout']);
});
test('failed account deletion keeps the user signed in and reports the error',async()=>{
 const f=deletionFixture(true);await f.remove();assert.deepEqual(f.calls,['delete']);assert.equal(f.error(),'Deletion failed');
});

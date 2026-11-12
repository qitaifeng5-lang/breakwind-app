// Page content is a real section in the workspace. Only short selectors use a native dialog.
export function createPageHost(){
 history.scrollRestoration='manual';
 const original=document.querySelector('#editor'),editor=document.createElement('section'),shell=document.createElement('dialog');editor.id='editor';editor.hidden=true;editor.setAttribute('aria-labelledby','dialog-title');original.replaceWith(editor);shell.id='modal-shell';shell.setAttribute('aria-labelledby','dialog-title');document.body.append(shell);let scroll=0,syncing=false;
 Object.defineProperty(editor,'originScroll',{get:()=>scroll});
 Object.defineProperty(editor,'open',{get:()=>editor.hasAttribute('open')});
 editor.syncPage=()=>{syncing=true;const page=['page','live'].includes(editor.dataset.variant);if(page){if(!document.documentElement.dataset.page)scroll=window.scrollY;if(shell.open)shell.close();document.querySelector('.workspace').append(editor);document.documentElement.dataset.page='true';editor.setAttribute('role','region');}
 else{delete document.documentElement.dataset.page;shell.append(editor);editor.removeAttribute('role');if(!shell.open)shell.showModal();}syncing=false;};
 editor.showModal=()=>{editor.hidden=false;editor.setAttribute('open','');editor.syncPage();};
 editor.close=()=>{if(!editor.open)return;editor.removeAttribute('open');editor.hidden=true;syncing=true;if(shell.open)shell.close();syncing=false;delete document.documentElement.dataset.page;window.scrollTo({top:scroll,behavior:'instant'});editor.dispatchEvent(new Event('close'));};
 shell.addEventListener('cancel',event=>{event.preventDefault();const cancel=new Event('cancel',{cancelable:true});if(editor.dispatchEvent(cancel))editor.close();});
 shell.addEventListener('close',()=>{if(!syncing&&!shell.open&&editor.open&&!['page','live'].includes(editor.dataset.variant))editor.close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&editor.open&&document.documentElement.dataset.page){event.preventDefault();const cancel=new Event('cancel',{cancelable:true});if(editor.dispatchEvent(cancel))editor.close();}});
 return editor;
}

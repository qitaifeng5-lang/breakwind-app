import {workoutDetail,phaseCard} from './workout-detail.js';
import {offset} from './model.js';
import {parseCoachText,occupied,assessSchedule,moveCoachPlan,recurringFor,blockNames} from './coach-plan.js';
export function createCoachUI({rememberReading,state,commit,modal,editor,escape:e,btn,render,day,paused,notify}) {
  let draft=null,library=false;
  const draftKey=(document.querySelector('meta[name=breakwind-preview]')?'breakwind.preview':'breakwind')+'.coach-import-draft';
  editor.addEventListener('page-draft-save',()=>{if(draft)localStorage.setItem(draftKey,JSON.stringify(draft));});
  editor.addEventListener('page-draft-discard',()=>localStorage.removeItem(draftKey));
  const field=(label,name,type='text',value='',extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+e(value)+'" '+extra+'></label>';
  const errors='<p class="form-error" role="alert" hidden></p>';
  const fail=message=>{const node=editor.querySelector('.form-error');node.hidden=false;node.textContent=message;};
  editor.addEventListener('close',()=>{draft=null;});
  const reviewView=review=>!review?'':'<details><summary>日程复核'+(review.loadReview.length||review.information.length||review.executionRestrictions.length?' · 待核对':'')+'</summary>'+[['时间冲突',review.conflicts],['信息待补',review.information],['负荷待核对',review.loadReview],['执行限制',review.executionRestrictions]].filter(([,items])=>items.length).map(([label,items])=>'<p><strong>'+label+'</strong><br>'+items.map(e).join('<br>')+'</p>').join('')+'<p>保存时间安排不代表获准执行训练。</p></details>';
  const rows=()=>state().plans.filter(p=>p.coachIssued&&!p.cancelled&&!p.completed&&p.executionStatus!=='reference-only').sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  function view(){
    const plans=rows();
    const references=state().plans.filter(p=>p.coachIssued&&p.executionStatus==='reference-only');
    const tools=(references.length?'<details><summary>历史参考（不执行）</summary>'+references.map(p=>btn(p.name,'coach-detail:'+p.id,'','quiet')).join('')+'</details>':'')+btn('录入／粘贴课表','coach-import','','quiet')+btn('时间安排','coach-settings','','quiet');
    if(!plans.length||library)return '<div class="training-tools">'+tools+(plans.length?btn('我的课表','coach-mine','','quiet'):'')+'</div>';
    return '<section class="panel"><div class="panel-head"><h2>我的课表</h2>'+btn('课程库','coach-library','','quiet')+'</div>'+plans.map(p=>'<button class="meal-entry" data-action="coach-detail:'+e(p.id)+'"><span>'+e(p.name)+'</span><small>'+e(p.date+' '+(p.start||'时间待定')+(p.end?'–'+p.end+'（估计）':'')+(p.scheduleReview&&(p.scheduleReview.loadReview.length||p.scheduleReview.information.length||p.scheduleReview.executionRestrictions.length)?' · 待核对':''))+'</small></button>').join('')+tools+'</section>';
  }
  function importForm(){try{draft=JSON.parse(localStorage.getItem(draftKey));}catch{draft=null;}if(draft?.parsed){preview();return;}draft=null;modal('录入单节教练课表','<form class="fields" style="grid-template-columns:1fr" id="coach-import-form">'+field('课次名称','name','text','','required maxlength="100"')+field('执行日期','date','date',day(),'required')+'<label>资料来源<select name="source"><option value="user-transcription">用户录入（未核实教练来源）</option><option value="coach-issued">本人确认是教练下发原文</option><option value="historical">历史资料，仅作参考</option></select></label><label>粘贴原文或按四段手动录入<textarea name="original" rows="8" maxlength="20000" required placeholder="热身：…&#10;主训练：…&#10;趟间恢复：…&#10;组间恢复：…&#10;冷身：…"></textarea></label><p>仅保存在此浏览器。不会上传或用作公共课程。解析后确认才保存。</p><button class="btn primary">预览</button></form>','page');}
  function preview(){
    const phases=blockNames.map(n=>phaseCard(n,'<p class="coach-reading">'+e(draft.parsed.blocks[n]||'待补')+'</p><details class="phase-edit"><summary>编辑'+n+'</summary><label>'+n+'<textarea name="'+n+'" rows="3">'+e(draft.parsed.blocks[n])+'</textarea></label></details>').replace('phase-card','phase-card coach-read-block')).join('');
    const timing='<details><summary>时间与安排（可选）</summary><div class="fields">'+field('开始（包含准备）','start','time')+field('课次预计分钟（含热身、全部恢复、冷身；未知可留空）','estimatedMinutes','number','','min="1" max="720"')+field('准备分钟','preparationMinutes','number',state().coachSchedule?.preparationMinutes||0,'min="0" max="120"')+field('缓冲分钟','bufferMinutes','number',state().coachSchedule?.bufferMinutes||0,'min="0" max="120"')+'<label>本课强度<select name="quality"><option value="unknown">待核对</option><option value="true">质量课</option><option value="false">有氧／恢复</option></select></label><label>替换本日固定训练时段<select name="recurringKey"><option value="">独立安排</option>'+recurringFor(state(),draft.date).filter(r=>r.kind==='training').map(r=>'<option value="'+e(r.id)+'">'+e(r.name+' '+r.start+'–'+r.end)+'</option>').join('')+'</select></label></div></details>';
    modal('核对课表','<form id="coach-confirm-form">'+workoutDetail({title:draft.name,subtitle:'核对原文后保存，内容仅保留在此浏览器。',summary:[['执行日期',draft.date],['来源','本人录入 · 待核对']],phases,notes:timing,sources:'<details><summary>原文（私人）</summary><pre>'+e(draft.parsed.original)+'</pre></details>',status:'<p role="status">'+e(draft.parsed.unresolved.join('；')||'请逐段核对原文，解析不代表专业审核')+'</p>',actions:errors+'<div class="page-primary detail-actions"><button class="btn primary">确认保存</button></div>'})+'</form>','page');editor.dataset.dirty='true';
  }
  function detail(id){const p=state().plans.find(p=>p.id===id);if(!p?.coachIssued)return;
    const status=(paused()?'<p>已知伤痛：暂停执行，先进行专业评估。</p>':'<p>'+(state().cycleProfile?.age==='未满18岁'?'青少年课表需教练确认适龄与当下恢复。':'')+'这是计划安排，不代表实际完成。实际运动请单独记录。</p>')+(p.executionStatus==='reference-only'?'<p>历史参考，不作为当前执行方案。</p>':'');
    modal('训练详情',workoutDetail({title:p.name,subtitle:p.date+' · '+(p.start||'时间待补'),summary:[['来源','本人确认转录'],['类型','教练课表'],['状态',p.durationStatus||'时长待估']],phases:blockNames.map(n=>phaseCard(n,'<p class="coach-reading">'+e(p.coachIssued.blocks[n]||'待补')+'</p>')).join(''),notes:reviewView(p.scheduleReview),sources:'<details><summary>查看原文与来源</summary><p>'+e(p.coachIssued.source)+' · 用户确认转录，非平台审核</p><pre>'+e(p.coachIssued.original)+'</pre></details>',stats:[['预计占用',p.estimatedMinutes?p.estimatedMinutes+' 分钟（估算）':'待补'],['实际完成','尚未记录']],status,actions:p.executionStatus==='reference-only'?'':'<div class="page-primary detail-actions">'+btn('取消本次','coach-cancel:'+id,'','quiet')+btn('改期／改时','coach-move:'+id,'','primary')+'</div>'}),'page');rememberReading({kind:'coach',id});
  }
  function settings(){modal('复用时间安排','<form class="fields" style="grid-template-columns:1fr" id="coach-settings-form">'+field('名称','name','text','俱乐部训练','required')+'<label>类型<select name="kind"><option value="training">固定训练时段</option><option value="busy">上学／工作</option></select></label><label>每周<select name="weekday">'+['日','一','二','三','四','五','六'].map((n,i)=>'<option value="'+i+'">周'+n+'</option>').join('')+'</select></label>'+field('开始','start','time','','required')+field('结束','end','time','','required')+field('默认准备分钟','preparationMinutes','number',state().coachSchedule?.preparationMinutes||0,'min="0" max="120"')+field('默认缓冲分钟','bufferMinutes','number',state().coachSchedule?.bufferMinutes||0,'min="0" max="120"')+errors+'<button class="btn primary">保存固定安排</button></form><ul>'+ (state().coachSchedule?.rules||[]).map(r=>'<li>'+e(r.name+' 周'+'日一二三四五六'[r.weekday]+' '+r.start+'–'+r.end)+btn('删除','coach-rule-remove:'+r.id,'','quiet')+'</li>').join('')+'</ul><details><summary>本周例外</summary>'+Array.from({length:7},(_,i)=>recurringFor(state(),offset(day(),i))).flat().map(r=>'<p>'+e(r.date+' '+r.name+' '+r.start)+btn('调整本次','coach-exception:'+r.id,'','quiet')+btn('取消本次','coach-exception-cancel:'+r.id,'','quiet')+'</p>'+reviewView(r.scheduleReview)).join('')+'</details>','page');}
  editor.addEventListener('input',event=>{const block=event.target.closest('.coach-read-block');if(block)block.querySelector('.coach-reading').textContent=event.target.value||'待补';});
  editor.addEventListener('submit',event=>{
    const form=event.target;if(!form.id.startsWith('coach-'))return;event.preventDefault();const values=Object.fromEntries(new FormData(form));
    if(form.id==='coach-import-form'){draft={...values,parsed:parseCoachText(values.original)};preview();}
    if(form.id==='coach-confirm-form'){
      if(!draft)return;
      const id=crypto.randomUUID(),blocks=Object.fromEntries(blockNames.map(n=>[n,values[n]]));
      const plan=occupied({id,date:draft.date,name:draft.name,type:'教练课表',...values,quality:values.quality==='false'?false:values.quality==='true'?true:null,coachIssued:{original:draft.parsed.original,blocks,source:draft.source,confirmedAt:new Date().toISOString()},executionStatus:draft.source==='historical'?'reference-only':'planned'});
      // A dated coach plan is this week's exception to the club slot, not a second session.
      const slot=recurringFor(state(),plan.date).find(r=>r.kind==='training'&&r.start===plan.start);if(slot)plan.recurringKey=slot.id;
      const review=assessSchedule(state(),plan,{today:day()});if(!review.canSave)return fail(review.conflicts.join('；'));plan.scheduleReview=review;
      if(commit(s=>{s.plans.push(plan);})){draft=null;localStorage.removeItem(draftKey);library=false;editor.close();render();if(review.loadReview.length||review.information.length||review.executionRestrictions.length)notify('已保存安排，日程复核和执行限制仍保留。');}
    }
    if(form.id==='coach-exception-form'){
      if(values.end<=values.start)return fail('结束必须晚于开始');
      const slot=Array.from({length:7},(_,i)=>recurringFor(state(),offset(day(),i))).flat().find(r=>r.id===values.planId);if(!slot)return fail('时段已变更，请重新打开');
      const candidate={...slot,...values,id:values.planId,estimatedMinutes:(Number(values.end.slice(0,2))*60+Number(values.end.slice(3)))-(Number(values.start.slice(0,2))*60+Number(values.start.slice(3))),quality:null};
      const review=assessSchedule(state(),candidate,{today:day(),previous:slot});if(!review.canSave)return fail(review.conflicts.join('；'));
      if(commit(s=>{s.coachSchedule.exceptions={...s.coachSchedule.exceptions,[values.planId]:{date:values.date,start:values.start,end:values.end,scheduleReview:review}};})){editor.close();render();}
    }
    if(form.id==='coach-settings-form'){
      if(values.end<=values.start)return fail('结束必须晚于开始；跨日安排请分开录入。');
      if(commit(s=>{s.coachSchedule={...s.coachSchedule,preparationMinutes:Number(values.preparationMinutes),bufferMinutes:Number(values.bufferMinutes),rules:[...(s.coachSchedule?.rules||[]),{...values,id:crypto.randomUUID()}]};})){editor.close();render();}
    }
    if(form.id==='coach-move-form'){
      let result;const copy=structuredClone(state());result=moveCoachPlan(copy,values.planId,values,{today:day()});if(result.warnings)return fail(result.warnings.join('；'));
      if(commit(s=>{const latest=moveCoachPlan(s,values.planId,values,{today:day()});if(!latest.plan)throw new Error('日程已变更，请重试');result=latest;})){editor.close();render();if(result.review.loadReview.length||result.review.information.length||result.review.executionRestrictions.length){notify('时间已保存；负荷与执行限制仍待核对。');}}
    }
  });
  return {view,showLibrary:()=>library||!rows().length,detail,actions:{
    'coach-exception-cancel':([id])=>{if(commit(s=>{s.coachSchedule.exceptions={...s.coachSchedule.exceptions,[id]:{cancelled:true}};})){settings();render();}},
    'coach-exception':([id])=>{const r=Array.from({length:7},(_,i)=>recurringFor(state(),offset(day(),i))).flat().find(r=>r.id===id);if(!r)return;modal('调整本次时段','<form class="fields" style="grid-template-columns:1fr" id="coach-exception-form"><input type="hidden" name="planId" value="'+e(id)+'">'+field('日期','date','date',r.date,'required')+field('开始','start','time',r.start,'required')+field('结束','end','time',r.end,'required')+errors+'<button class="btn primary">检查并保存</button></form>','page');},
    'coach-import':importForm,'coach-settings':settings,'coach-library':()=>{library=true;render();},'coach-mine':()=>{library=false;render();},
    'coach-detail':([id])=>detail(id),
    'coach-cancel':([id])=>{if(commit(s=>{const p=s.plans.find(p=>p.id===id);if(p?.coachIssued&&!p.completed)p.cancelled=true;})){editor.close();render();}},
    'coach-rule-remove':([id])=>{if(commit(s=>{s.coachSchedule.rules=s.coachSchedule.rules.filter(r=>r.id!==id);})){settings();render();}},
    'coach-move':([id])=>{const p=state().plans.find(p=>p.id===id);if(!p||p.completed)return;modal('调整本次安排','<form class="fields" style="grid-template-columns:1fr" id="coach-move-form"><input type="hidden" name="planId" value="'+e(id)+'">'+field('日期','date','date',p.date,'required')+field('开始','start','time',p.start,'required')+field('完整课次预计分钟','estimatedMinutes','number',p.estimatedMinutes,'min="1" max="720"')+errors+'<button class="btn primary">检查并保存</button></form>','page');}
  }};
}

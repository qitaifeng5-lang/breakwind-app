import {buildProgram,saveProgram,previewProgramWeek,arrangeProgramWeek,programReview,advanceProgram,proposeProgramChange,confirmProgramChange,moveProgramPlan} from './program.js';
import {membershipStatus,applyTestTransaction,vipProduct} from './membership.js';
import {coursePhases,pbSeconds} from './pb-library.js';
import {offset} from './model.js';
import {courseReadiness} from './engine.js';
export function createProgramUI({state,commit,modal,editor,escape:e,btn,render,day,notify,openCourse}) {
  let draft=null,selectedId=null,selectedWeek=0,proposal=null;
  const mode='experience'; // Explicit local experience, never a payment credential.
  const field=(label,name,type,value,extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+e(value||'')+'" '+extra+'></label>';
  const error='<p class="form-error" role="alert" hidden></p>';
  const fail=message=>{const n=editor.querySelector('.form-error');if(n){n.hidden=false;n.textContent=message;}else notify(message);};
  const current=()=>state().programs?.find(p=>p.programId===selectedId)||state().programs?.at(-1);
  const run=work=>{try{return work();}catch(err){fail(err.message);return false;}};
  function view(){const p=state().programs?.at(-1);return p?'<section class="panel"><div class="panel-head"><h2>第'+(p.cursor+1)+'周 · '+e(coursePhases[p.weeks[p.cursor].phase])+'</h2>'+btn('长期计划','program-open','','quiet')+'</div><p>'+e(p.weeks[p.cursor].purpose)+'</p><small>本地体验 · '+p.length+'周候选 · '+e(p.status==='paused'?'已暂停':'独立审核未完成')+'</small></section>':btn('长期训练 · 体验','program-new','','quiet');}
  function newForm(){modal('长期训练 · 本地体验','<form id="program-create" class="fields" style="grid-template-columns:1fr"><label>专项<select name="event">'+['800 m','1500 m'].map(v=>'<option value="'+v+'"'+(state().groupPlan?.event===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label><p>成人竞技均衡型候选。复用已保存PB与固定时间；不从PB推算可承受负荷。</p><label>周期<select name="length"><option>8</option><option selected>12</option><option>16</option></select></label>'+field('开始日期','startDate','date',day(),'required')+'<details><summary>适用范围</summary><p>已有六课周、两种质量刺激和相近训练经验。青少年与其他组长期内容尚未编排；原免费单课、周草案和教练课表保持可用。</p></details>'+error+'<button class="btn primary">预览整个周期</button></form>','sheet');}
  function overview(p,isDraft=false){
    modal(isDraft?'周期预览':'长期计划','<p>'+e(p.event+' · '+p.length+'周 · '+p.timezone)+'</p><p>编排候选 · 来源按课次核对 · 独立审核未完成</p><ol class="week-outline">'+p.weeks.map((w,i)=>'<li>'+btn('第'+w.number+'周 · '+coursePhases[w.phase]+' · '+w.purpose,'program-week:'+i,'','quiet')+'</li>').join('')+'</ol><details><summary>适用范围与阶段依据</summary><p>'+e(p.limitation)+'</p><p>重复熟悉剂量用于巩固；间歇、专项组合与恢复周有明确位置，不按日历自动加量。未选择备赛，因此不自动设置比赛减量周。</p></details>'+'<details><summary>未来时区核对</summary><p>保存时区：'+e(p.timezone)+'；当前时区：'+e(Intl.DateTimeFormat().resolvedOptions().timeZone)+'</p>'+(p.programId?btn('确认未来使用当前时区','program-timezone','','quiet'):'')+'</details>'+error+(isDraft?btn('保存体验周期','program-save','','primary'):btn('新周期','program-new','','quiet'))+btn('VIP 测试状态','program-vip','','quiet'),'sheet');
  }
  function weekView(index){
    selectedWeek=Number(index);const p=draft||current(),w=p?.weeks[selectedWeek];if(!w)return;const preview=p.programId?previewProgramWeek(state(),p,selectedWeek,{today:day()}):null;
    modal('第'+w.number+'周 · '+coursePhases[w.phase],'<p>'+e(w.purpose)+'</p>'+(preview?'<p>已安排 '+preview.review.planned+' / '+w.courses.filter(c=>c.id!=='rest').length+' 课 · 未安排项见核对</p>':'')+'<small>'+e(w.start+' 至 '+w.end)+' · '+e(w.transition)+'</small><ol class="week-outline">'+w.courses.map((c,i)=>'<li>'+btn(offset(w.start,i)+' · '+c.name,'program-course:'+i,'','quiet')+(p.programId?state().plans.filter(r=>r.programId===p.programId&&r.programWeek===selectedWeek&&r.programDay===i&&!r.cancelled).map(r=>'<small>'+e(r.start||'时间待定')+'</small><details><summary>时间与例外</summary>'+btn('改期／改时','program-move:'+r.id,'','quiet')+btn('取消本次','program-cancel:'+r.id,'','quiet')+'</details>').join(''):'')+'</li>').join('')+'</ol>'+(preview?'<details><summary>安排核对 · '+preview.added.length+'课可加入</summary>'+preview.held.map(h=>'<p>'+e(h.date+' · '+h.reason)+'</p>').join('')+'<p>不覆盖教练课表，不补排过去课次。加入日程不等于执行许可。</p></details>':'')+error+(p.programId?btn('安排这一周','program-arrange','','primary')+btn('阶段复盘／推进','program-review','','quiet')+btn('调整未来一周','program-adjust','','quiet')+btn(p.status==='paused'?'恢复周期（先核对）':'暂停周期','program-pause','','quiet')+btn('导出本人周期','program-export','','quiet'):'')+btn('返回周期','program-overview','','quiet'),'sheet');
  }
  function vip(){const s=membershipStatus(state().membershipTest),labels={active:'体验有效',expired:'体验已到期',revoked:'已撤销',pending:'待确认',cancelled:'已取消',failed:'模拟失败',none:'未启用',unavailable:'未启用'};
    modal('破风 VIP · 本地体验','<p>目标价 ¥'+(vipProduct.targetPriceMinor/100).toFixed(2)+'/月 · 尚未核验商店价格</p><p role="status">'+e(labels[s.status])+' · 不收款</p><p>长期周期、未来调整和阶段复盘。已有免费单课、周安排、记录、导入、教练课表和导出不变。</p><p>周期长度与月费无关；续费不重置进度。到期保留已生成课表、记录和进行中的训练。</p>'+btn('启用本地体验','program-test:success','','primary')+'<details><summary>模拟状态验收（不是购买）</summary>'+[['pending','待确认'],['cancel','取消'],['failure','失败'],['renew','续费'],['cancel-renew','取消续费'],['expire','到期'],['revoke','撤销'],['restore','恢复购买']].map(([k,v])=>btn('模拟'+v,'program-test:'+k,'','quiet')).join('')+'<p>仅本地模拟，不连接StoreKit或安卓商店；正式权益需要账户、服务端交易验证和渠道通知。本地状态不能作为生产凭证。</p></details>'+error+(draft?btn('返回周期预览','program-overview','','quiet'):''),'sheet');
  }
  editor.addEventListener('submit',event=>{
    const f=event.target;if(!f.id.startsWith('program-'))return;event.preventDefault();const v=Object.fromEntries(new FormData(f));
    run(()=>{
      if(f.id==='program-create'){draft=buildProgram({event:v.event,pb:state().groupPlan?.event===v.event?pbSeconds(state().groupPlan.pb):null,length:Number(v.length),startDate:v.startDate});overview(draft,true);}
      if(f.id==='program-move-form'){
        const trial=moveProgramPlan(structuredClone(state()),v.planId,v,{today:day()});if(!trial.plan)return fail(trial.review.conflicts.join('；'));
        if(commit(s=>{const r=moveProgramPlan(s,v.planId,v,{today:day()});if(!r.plan)throw Error('日程已变化');})){render();weekView(selectedWeek);}
      }
    });
  });
  return {view,actions:{
    'program-new':()=>{draft=null;newForm();},
    'program-open':()=>{draft=null;const p=current();if(p){selectedId=p.programId;selectedWeek=p.cursor;weekView(p.cursor);}else newForm();},
    'program-overview':()=>overview(draft||current(),Boolean(draft)),
    'program-week':([i])=>run(()=>weekView(i)),
    'program-course':([i])=>{const p=draft||current(),w=p.weeks[selectedWeek],c=w.courses[Number(i)],scheduled=state().plans.find(r=>r.programId===p.programId&&r.programWeek===selectedWeek&&r.programDay===Number(i)&&!r.cancelled);openCourse(scheduled?{...scheduled.course,planId:scheduled.id}:c,Math.round((Date.parse(scheduled?.date||offset(w.start,Number(i)))-Date.parse(day()))/86400000));},
    'program-save':()=>run(()=>{if(!draft)return;const id=crypto.randomUUID();saveProgram(structuredClone(state()),draft,{mode,id});if(commit(s=>saveProgram(s,draft,{mode,id}))){selectedId=id;draft=null;render();weekView(0);}}),
    'program-arrange':()=>run(()=>{const p=current();if(commit(s=>arrangeProgramWeek(s,p.programId,selectedWeek,{today:day(),build:document.querySelector('meta[name=breakwind-preview]')?.content||'local'}))){render();weekView(selectedWeek);}}),
    'program-vip':vip,
    'program-test':([type])=>run(()=>{const s=state().membershipTest,now=Date.now(),event={mode,id:crypto.randomUUID(),sequence:(s?.sequence||0)+1,type,expiresAt:type==='restore'?(s?.expiresAt||now):Math.max(now,s?.expiresAt||0)+30*86400000,restoredStatus:['revoked','expired'].includes(s?.status)?s.status:s?.status==='active'?'active':'expired'};if(commit(d=>{d.membershipTest=applyTestTransaction(d.membershipTest,event);})){render();vip();}}),
    'program-review':()=>{const p=current(),r=programReview(state(),p,p.cursor,day());modal('阶段复盘','<p>第'+(p.cursor+1)+'周 · 已安排'+r.planned+'课 · 关联完成'+r.completed+'课 · 取消'+r.cancelled+'课 · 过期未完成'+r.missed.length+'课</p><p>'+e(r.note)+'</p><p>确认恢复正常且仍适合下一阶段后推进。不会自动加入课次或补课。</p>'+error+btn('确认复盘并推进','program-next','','primary'),'sheet');},
    'program-next':()=>run(()=>{const id=current().programId;advanceProgram(structuredClone(state()),id,{today:day(),confirmed:true});if(commit(s=>advanceProgram(s,id,{today:day(),confirmed:true}))){render();weekView(current().cursor);}}),
    'program-adjust':()=>modal('调整未来一周','<p>仅生成调整预览，确认后生效。保持或恢复，不根据PB升级剂量。</p>'+btn('根据实际记录预览调整','program-propose:auto','','primary')+btn('恢复不足／漏课：改为恢复周','program-propose:recover','','quiet')+btn('继续巩固熟悉结构','program-propose:hold','','quiet')+error,'sheet'),
    'program-propose':([kind])=>run(()=>{proposal=proposeProgramChange(state(),current().programId,{kind,today:day()});modal('确认未来调整','<p>'+e(proposal.reason)+'</p><p>第'+(proposal.index+1)+'周：'+e(proposal.before.purpose)+'</p><ol>'+proposal.courses.map(c=>'<li>'+e(c.name)+'</li>').join('')+'</ol><p>历史不变，未来旧快照保留为取消；教练课不修改。关闭即取消。</p>'+error+btn('确认调整','program-confirm','','primary'),'sheet');}),
    'program-confirm':()=>run(()=>{if(!proposal)return;confirmProgramChange(structuredClone(state()),proposal,{mode});if(commit(s=>confirmProgramChange(s,proposal,{mode}))){const i=proposal.index;proposal=null;render();weekView(i);}}),
    'program-pause':()=>{const p=current();if(p.status==='paused'&&['paused','recovery'].includes(courseReadiness(state(),{adapted:true,quality:false},day(),day()).status))return notify('已知伤痛或恢复问题仍需处理；周期保持暂停');if(commit(s=>{const q=s.programs.find(x=>x.programId===p.programId);q.status=q.status==='paused'?'active':'paused';q.revisionHistory.push({action:q.status,at:new Date().toISOString()});})){render();weekView(selectedWeek);}},
    'program-move':([id])=>{const p=state().plans.find(x=>x.id===id);if(!p||p.completed)return notify('已完成历史不修改');modal('调整本次安排','<form id="program-move-form" class="fields" style="grid-template-columns:1fr"><input type="hidden" name="planId" value="'+e(id)+'">'+field('日期','date','date',p.date,'required')+field('开始时间','start','time',p.start)+error+'<button class="btn primary">检查并保存</button></form>','sheet');},
    'program-cancel':([id])=>{if(commit(s=>{const p=s.plans.find(x=>x.id===id);if(p&&!p.completed&&!p.coachIssued)p.cancelled=true;})){render();weekView(selectedWeek);}},
    'program-timezone':()=>{const p=current();if(commit(s=>{const q=s.programs.find(x=>x.programId===p.programId);q.revisionHistory.push({action:'confirm-future-timezone',before:q.timezone,after:Intl.DateTimeFormat().resolvedOptions().timeZone,at:new Date().toISOString()});q.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;}))overview(current());},
    'program-export':()=>{const p=current(),payload={program:p,plans:state().plans.filter(x=>x.programId===p.programId)};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='breakwind-program-'+p.programId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }};
}

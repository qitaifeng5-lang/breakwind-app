import {phaseCard} from './workout-detail.js';
import {templateSpecification,referenceEvents,referenceLabel,paceLabels,targetBases,recoveryModes,recentPerformance,targetFor,compileWorkout,workoutTotals,newSession,stepElapsed,pauseSession,advanceSession,stopSession,sessionRecord,courseIdentity} from './workout.js';

const seconds=n=>Number(n.toFixed(2))+' 秒';
const clock=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
const targetText=t=>t?.effort?t.effort:t? (t.targetSecondsRange[0]===t.targetSecondsRange[1]?seconds(t.targetSecondsRange[0]):t.targetSecondsRange.map(n=>Number(n.toFixed(2))).join('–')+' 秒'):'配速待校准';
export const recoveryLabel=r=>!r?'无':r.mode==='mixed'?r.steps.map(recoveryLabel).join(' → '):recoveryModes[r.mode]+' '+[r.durationSeconds?seconds(r.durationSeconds):'',r.distanceM?r.distanceM+'m':''].filter(Boolean).join(r.endRule==='both'?' 且 ':' 或 ');
export function createWorkoutPlayer(api) {
  const {editor,modal,btn,escape:esc}=api,storageKey=api.prefix+'.course-session.v1';
  let session,course,feedback=false,alerted=false;
  const stamp=c=>'<small class="course-version" data-course-identity="'+esc(courseIdentity(c))+'">'+esc((c.build||'local').slice(0,8)+' · '+c.event+' · '+c.id+' · '+(c.selectedGroup||'legacy')+' / '+(c.weekPhase||c.phase))+'</small>';
  try {session=JSON.parse(localStorage.getItem(storageKey));if(session?.status==='active')session.anchor=null;}catch{/* invalid draft is not executed */}
  if(session&&(!Array.isArray(session.steps)||!Array.isArray(session.logs)||session.index<0||session.index>session.steps.length))session=null;
  const persist=()=>{
    try {localStorage.setItem(storageKey,JSON.stringify(session?{...session,elapsed:stepElapsed(session,Date.now()),anchor:null}:null));return true;}
    catch{api.notify('无法保存中断草稿，请保持页面打开并及时保存记录');return false;}
  };
  const calibrationKey=c=>api.prefix+'.course-spec.'+c.event+'.'+c.id;
  function hydrate(c) {
    if(c.prescription&&!c.executionSpec&&!c.planId)return {...c,executionSpec:templateSpecification(c)};
    if(c.executionSpec||c.planId||c.catalogRevision)return c;
    try {const spec=JSON.parse(localStorage.getItem(calibrationKey(c)));if(spec){compileWorkout(spec);return {...c,executionSpec:spec};}}catch{/* leave calibration pending */}
    return c;
  }
  function detail(c) {
    course=hydrate(c);api.setCourse(course);
    const spec=course.executionSpec;
    const block=phaseCard;
    const phase=(items,fallback)=>items.map(s=>[s.distanceM?s.distanceM+'m':'',s.label||fallback].filter(Boolean).join(' · ')).map(esc).join(' + ');
    const main=spec? (spec.setCount>1?'<p class="workout-set-count">'+spec.setCount+' 大组</p>':'')+spec.repetitions.map((r,i)=>'<p class="execution-line">'+r.repsPerSet+'×'+(r.durationSeconds?(r.durationSeconds%60?r.durationSeconds+'秒':r.durationSeconds/60+'分钟'):r.distanceM+'m')+'｜'+paceLabels[r.target.targetBasis]+'｜'+esc(targetText(r.target).replaceAll(' 秒','秒'))+(r.durationSeconds?'':'/趟')+'</p>'+ (r.repsPerSet>1||i<spec.repetitions.length-1?'<small class="rep-rest">趟间 '+recoveryLabel(r.repRecovery)+'</small>':'')).join(''):
      (course.sets>1?'<p>'+course.sets+' 大组</p>':'')+course.segments.map(s=>'<p class="execution-line">'+s.repeats+'×'+s.distance+'m｜配速待校准</p>'+(s.recoverySeconds?'<small class="rep-rest">趟间 '+s.recoverySeconds+'秒 · 动作待确认</small>':'')).join('');
    return ''+
      block('热身','<p>'+(spec?phase(spec.warmup,'轻松慢跑、动态活动、跑姿准备'):esc(course.warmup||'轻松慢跑、动态活动、跑姿准备'))+'</p>')+
      block('主训练',main)+block('恢复说明','<p>趟间恢复见各段；只插在相应趟次之间。组间：'+(spec?(spec.setCount>1?recoveryLabel(spec.setRecovery):'无'):(course.sets>1?course.setRecovery+'秒 · 动作待确认':'无'))+'</p>')+
      block('冷身','<p>'+(spec?phase(spec.cooldown,'轻松慢跑、放松整理'):esc(course.cooldown||'轻松慢跑、放松整理'))+'</p>')+
      '';
  }
  function notes(){
    const spec=course?.executionSpec;
    return '<div class="execution-notes"><p>热身、冷身由本人确认结束。历史编排中的准备时长仅留作来源记录，不作为当前完成门槛。</p>'+ (course.prescription?'':btn('录入已有教练课表','workout-config','','secondary'))+(spec?totalsHTML(spec)+'<p>参数来源：'+esc(spec.parameterSource)+'</p>':'<p>模板提供完整编排；已有独立教练课表才使用录入入口。</p>')+'</div>';
  }

  function totalsHTML(spec) {
    const t=workoutTotals(spec);
    return '<dl class="workout-totals"><dt>主训练</dt><dd>'+(t.mainDistanceM===null?clock(t.mainDurationSeconds)+' · 距离未测量':t.mainDistanceM+'m')+' · '+t.repCount+' 趟</dd><dt>恢复</dt><dd>'+t.repRecoveries+' 次趟间 + '+t.setRecoveries+' 次组间 · '+(t.recoverySeconds===null?'按距离完成，时间未知':clock(t.recoverySeconds))+'</dd><dt>预计全程</dt><dd>'+(t.estimatedSecondsRange?[...new Set(t.estimatedSecondsRange.map(clock))].join('–'):'热身、冷身由本人结束；完整时长待估')+'（估算，含课程建议时长；不是完成门槛）</dd><dt>热身／冷身／慢跑恢复距离</dt><dd>按时间的部分未测量，不计入质量跑量</dd></dl>';
  }
  const number=(name,label,value,min=0,max=3600)=>'<label>'+label+'<input name="'+name+'" type="number" min="'+min+'" max="'+max+'" step="0.01" value="'+(value??'')+'" required inputmode="decimal"></label>';
  const choice=(name,label,values,value='')=>'<label>'+label+'<select name="'+name+'"><option value="">请选择</option>'+Object.entries(values).map(([id,text])=>'<option value="'+id+'"'+(id===value?' selected':'')+'>'+text+'</option>').join('')+'</select></label>';
  function recoveryFields(prefix,initial,required=true) {
    return '<fieldset class="recovery-input" data-prefix="'+prefix+'"><legend>'+ (prefix==='set'?'组间恢复':'趟间恢复')+'</legend>'+choice(prefix+'Mode','动作',{jog:'慢跑',walk:'步行',stand:'站立'},initial?.mode)+
      choice(prefix+'Rule','结束条件',{time:'按时间',distance:'按距离',both:'时间与距离都满足',either:'时间或距离先达到'},initial?.endRule||(initial?.distanceM?'distance':'time'))+
      '<label>秒<input name="'+prefix+'Time" type="number" min="0" max="3600" value="'+(initial?.durationSeconds??'')+'" inputmode="numeric"></label><label>米<input name="'+prefix+'Distance" type="number" min="0" max="5000" value="'+(initial?.distanceM??'')+'" inputmode="numeric"></label>'+
      (!required?'<small>最后一段后只使用组间恢复；最后一组直接转冷身。</small>':'')+'</fieldset>';
  }
  function configure() {
    if(!course)return;
    const previous=course.executionSpec;
    modal('录入已有教练课表','<form id="workout-calibrate" data-draft-id="'+esc(courseIdentity(course))+'"><p>独立转录入口：请按已有教练课表填写，不代表App推荐或核验教练身份。</p>'+number('sets','大组数',previous?.setCount||course.sets,1,20)+
      course.segments.map((s,i)=>{
        const r=previous?.repetitions[i],basis=r?.target.targetBasis;
        return '<fieldset class="execution-segment"><legend>'+s.distance+'m · 段 '+(i+1)+'</legend>'+number('reps'+i,'每大组趟数',r?.repsPerSet||s.repeats,1,30)+choice('basis'+i,'目标依据',targetBases,basis)+
          Object.keys(referenceEvents).map(b=>{const ref=r?.target.referencePerformance?.event===referenceEvents[b]?r.target.referencePerformance:recentPerformance(api.state().records,b,api.day());return '<div data-target="'+i+'-'+b+'" hidden>'+number('ref'+i+b,'当前已达 '+referenceLabel(b)+' 成绩（总秒）',ref?.seconds,1,1800)+'<label>成绩日期<input name="date'+i+b+'" type="date" value="'+(ref?.date||api.day())+'" max="'+api.day()+'"></label><small>仅使用近期已达成绩；不从另一专项或目标 PB 推算。</small></div>';}).join('')+
          '<div data-target="'+i+'-range" hidden>'+number('min'+i,'每趟目标下限（秒）',r?.target.targetSecondsRange[0],0.1)+number('max'+i,'每趟目标上限（秒）',r?.target.targetSecondsRange[1],0.1)+'<small>阈值须来自已有校准；这里不从短距离 PB 推算。</small></div>'+
          recoveryFields('rep'+i,r?.repRecovery||{durationSeconds:s.recoverySeconds},i<course.segments.length-1||s.repeats>1)+'</fieldset>';
      }).join('')+recoveryFields('set',previous?.setRecovery||{durationSeconds:course.setRecovery},false)+
      '<details><summary>热身与冷身建议时间（可选）</summary>'+number('warmup','热身建议分钟（不设门槛）',previous?.warmup[0].durationSeconds/60||'',0,60).replace(' required','')+number('cooldown','冷身建议分钟（不设门槛）',previous?.cooldown[0].durationSeconds/60||'',0,60).replace(' required','')+'</details>'+
      '<label>参数来源<input name="source" type="text" maxlength="120" placeholder="如：本周教练课表，日期" value="'+esc(previous?.parameterSource||'')+'" required></label><label class="ready-check"><input type="checkbox" name="confirm" required>这是已核对的当前能力与现有课表；不是目标 PB，也不代表 App 已专业审核。</label><p class="form-error" role="alert" hidden></p><div class="picker-actions">'+btn('取消','workout-back','','quiet')+'<button class="btn primary">保存执行规格</button></div></form>','page');
    updateFields();
  }
  function updateFields() {
    const form=editor.querySelector('#workout-calibrate');if(!form)return;
    for(let i=0;i<course.segments.length;i++) {
      const basis=form.elements['basis'+i].value;
      form.querySelectorAll('[data-target^="'+i+'-"]').forEach(node=>{
        node.hidden=node.dataset.target!==i+'-'+(Object.keys(referenceEvents).includes(basis)?basis:'range')||!basis;
        node.querySelectorAll('input').forEach(input=>input.disabled=node.hidden);
      });
      const need=i<course.segments.length-1||Number(form.elements['reps'+i].value)>1;
      form.querySelector('[data-prefix="rep'+i+'"]').hidden=!need;
    }
    form.querySelector('[data-prefix=set]').hidden=Number(form.elements.sets.value)<=1;
  }
  function readRecovery(form,prefix) {
    const mode=form.elements[prefix+'Mode'].value,rule=form.elements[prefix+'Rule'].value;
    return {mode,endRule:rule,durationSeconds:['time','both','either'].includes(rule)?Number(form.elements[prefix+'Time'].value)||null:null,
      distanceM:['distance','both','either'].includes(rule)?Number(form.elements[prefix+'Distance'].value)||null:null,provenance:'用户确认的现有课表'};
  }
  editor.addEventListener('change',updateFields);
  editor.addEventListener('submit',event=>{
    const form=event.target;if(form.id!=='workout-calibrate')return;event.preventDefault();
    try {
      if(!form.elements.confirm.checked)throw new Error('请先核对来源');
      const repetitions=course.segments.map((s,i)=>{
        const basis=form.elements['basis'+i].value;
        let ref=null;
        if(Object.keys(referenceEvents).includes(basis)) {
          const date=form.elements['date'+i+basis].value;
          if(date>api.day()||!date||Date.parse(api.day())-Date.parse(date)>90*86400000)throw new Error('参考成绩需在最近90天内；这是产品校准范围，不是能力失效判断');
          ref={event:referenceEvents[basis],seconds:Number(form.elements['ref'+i+basis].value),date,kind:'achieved',source:'用户确认的已达成绩'};
        }
        const target=targetFor(s.distance,basis,ref,[Number(form.elements['min'+i].value),Number(form.elements['max'+i].value)]);
        if(!target)throw new Error('每段需要对应的当前成绩或已校准秒数，不能用浏览 PB 代替');
        return {distanceM:s.distance,repsPerSet:Number(form.elements['reps'+i].value),target,repRecovery:readRecovery(form,'rep'+i)};
      });
      const preparation=(name,label)=>{
        const previous=course.executionSpec?.[name];
        const phases=previous?.length?structuredClone(previous):[{label}];
        if(form.elements[name].value!=='')phases[0].durationSeconds=Number(form.elements[name].value)*60;
        return phases;
      };
      const spec={version:1,origin:'coach-transcription',setCount:Number(form.elements.sets.value),repetitions,setRecovery:readRecovery(form,'set'),
        warmup:preparation('warmup','轻松慢跑、动态活动、跑姿准备'),
        cooldown:preparation('cooldown','轻松慢跑、放松整理；不适可直接停止'),
        objective:[...new Set(repetitions.map(r=>({'800':'800m比赛节奏熟悉','1500':'1500m比赛节奏稳定',mile:'英里节奏稳定',threshold:'已校准阈值强度控制',coach:'按转录教练目标执行'}[r.target.targetBasis])))].join('；'),
        parameterSource:form.elements.source.value.trim(),review:{status:'pending',label:'用户转录 · 待独立专业审核'},confirmedAt:new Date().toISOString()};
      compileWorkout(spec);workoutTotals(spec);
      if(!spec.parameterSource)throw new Error('请补充来源');
      if(course.planId&&!api.savePlanSpec(course.planId,spec))throw new Error('未保存日程规格，请重试');
      course={...course,executionSpec:spec};
      if(!course.planId)localStorage.setItem(calibrationKey(course),JSON.stringify(spec));
      api.setCourse(course);api.openCourse(course);
    } catch(error){const box=form.querySelector('.form-error');box.hidden=false;box.textContent=error.message;}
  });
  function start(c) {
    course=hydrate(c);
    if(session){view();return;}
    if(api.otherRunning())return api.notify('请先结束现有跑步记录');
    if(!api.ready(course).canSchedule)return api.notify(api.ready(course).reason);
    if(!course.executionSpec){if(course.executionEligible)templateReference();else configure();return;}
    if(course.executionSpec.repetitions.some(r=>{const date=r.target.referencePerformance?.date;return date&&Date.parse(api.day())-Date.parse(date)>90*86400000;})){api.notify('请核对当前成绩；旧参考超过产品校准范围，不代表能力降级');configure();return;}
    modal('开始分段记录','<p>'+esc(course.name)+(course.prescription?' · 按时长记录，距离未测量。':' · 场地手动圈，不用 GPS 判断200m终点。')+'</p><p>课程待独立审核。需已有同类训练经历，并已核对当前状态和本课参数。</p><p>'+esc(course.eligibility||'')+'</p>'+totalsHTML(course.executionSpec)+btn('确认并热身','workout-begin','','primary'),'page');
  }
  function templateReference() {
    const bases=course.targetBases||[course.targetBasis];
    const fields=[...new Set(bases)].map(b=>{const ref=recentPerformance(api.state().records,b,api.day()),suffix=bases.length>1?b:'';return number('seconds'+suffix,'当前已达 '+referenceLabel(b)+' 成绩（总秒）',ref?.seconds,1,3600)+'<label>成绩日期<input name="date'+suffix+'" type="date" value="'+(ref?.date||api.day())+'" max="'+api.day()+'" required></label>';}).join('');
    modal('核对当前能力','<form id="template-reference"><p>'+esc(course.eligibility)+'</p>'+fields+'<label class="ready-check"><input name="confirm" type="checkbox" required>我已成年，有上述同类负荷经验，当前无伤痛；此成绩为近期已达成绩。</label><p class="form-error" hidden></p><div class="picker-actions">'+btn('取消','workout-back','','quiet')+'<button class="btn primary">使用课程编排</button></div></form>','page');
  }
  editor.addEventListener('submit',event=>{
    const f=event.target;if(f.id!=='template-reference')return;event.preventDefault();
    try {
      const bases=course.targetBases||[course.targetBasis],references={};
      for(const basis of new Set(bases)){
        const suffix=bases.length>1?basis:'',date=f.elements['date'+suffix].value;
        if(!f.elements.confirm.checked||!date||date>api.day()||Date.parse(api.day())-Date.parse(date)>90*86400000)throw new Error('请确认近期已达成绩与同类训练经验；90天是产品校准范围，不代表能力降级');
        references[basis]={event:referenceEvents[basis],seconds:Number(f.elements['seconds'+suffix].value),date,kind:'achieved',source:'用户确认当前同项成绩'};
      }
      const spec=templateSpecification(course,references);
      if(course.planId&&!api.savePlanSpec(course.planId,spec))throw new Error('日程规格未保存');
      course={...course,executionSpec:spec};api.setCourse(course);api.openCourse(course);
    }catch(error){const box=f.querySelector('.form-error');box.hidden=false;box.textContent=error.message;}
  });
  function begin() {
    if(session||api.otherRunning()||!api.ready(course).canSchedule)return;
    session=newSession(course.executionSpec,course,Date.now(),crypto.randomUUID());
    if(!persist()){session=null;return;}api.refresh();view();
  }
  function tick() {
    if(!session||session.status!=='active')return;
    const step=session.steps[session.index],elapsed=stepElapsed(session,Date.now());
    const timer=editor.querySelector('#course-clock');if(timer)timer.textContent=clock(elapsed);
    const remaining=editor.querySelector('#course-remaining');
    const freePhase=['warmup','cooldown'].includes(step.kind);
    const duration=freePhase?null:step.durationSeconds||(step.target?.targetSecondsRange?.[1]);
    if(remaining)remaining.textContent=duration?elapsed>=duration?'参考时间已到，按实际完成情况确认':'距离参考时间 '+clock(duration-elapsed):freePhase?'按实际准备或整理情况确认，无固定时间门槛':'按场地距离手动确认';
    if(duration&&elapsed>=duration&&!alerted&&session.anchor!==null){alerted=true;if(feedback&&navigator.vibrate)navigator.vibrate([100,80,100]);}
  }
  setInterval(()=>{tick();if(session?.status==='active'&&session.anchor!==null)persist();},1000);
  function view() {
    if(!session)return;
    if(session.status!=='active')return summary();
    const step=session.steps[session.index];
    const title=step.kind==='work'?'第 '+step.set+' 大组 · 第 '+step.lap+'/'+step.lapsPerSet+' 趟':step.kind==='warmup'?'热身':step.kind==='cooldown'?'冷身':step.betweenSets?'组间恢复':'趟间恢复';
    modal(title,'<div class="course-live">'+stamp(session.course)+'<p>'+esc(step.kind==='work'?(step.durationSeconds?clock(step.durationSeconds):step.distanceM+'m')+' · '+targetText(step.target)+(step.durationSeconds?'':' /趟'):step.kind==='recovery'?recoveryLabel(step):step.label)+'</p>'+ (step.target?'<small>'+paceLabels[step.target.targetBasis]+'</small>':'')+
      '<div class="timer"><strong id="course-clock">'+clock(stepElapsed(session,Date.now()))+'</strong><span id="course-remaining" role="status"></span></div>'+
      (session.anchor===null?'<p>已暂停；离开前台或重开后不会自动补计时间。</p>':'')+
      (step.checks?step.checks.map((label,i)=>'<label class="ready-check"><input type="checkbox" data-warmup="'+i+'"'+(session.checks?.includes(i)?' checked':'')+'>'+label+'</label>').join(''):'')+
      (step.distanceM&&step.kind==='recovery'?'<p>按场地标记确认距离。'+(step.endRule==='either'?'时间或距离任一达到才确认。':step.endRule==='both'?'距离完成且时间达到后确认。':'走完／跑完设定距离后确认。')+'</p>':'')+
      '<p class="form-error" id="course-player-error" role="alert" hidden></p><div class="dialog-actions">'+btn(session.anchor===null?'继续计时':'暂停计时','workout-pause','','secondary')+btn(step.kind==='work'?'完成本趟':step.kind==='recovery'?'恢复完成':'完成本阶段','workout-next','','primary')+'</div><details><summary>提醒与提前结束</summary><p>提醒仅在网页前台运行。时间到不会代替你判定距离或恢复完成。</p>'+ (navigator.vibrate?'<label><input type="checkbox" id="course-vibrate"'+(feedback?' checked':'')+'>允许本次震动提醒</label>':'<p>此浏览器不支持震动；使用画面倒计时。</p>')+btn('提前结束','workout-stop','','quiet')+'</details>'+btn('疼痛／不适，立即停止','workout-pain','','quiet')+'</div>','live');tick();
  }
  function next() {
    if(!session||session.status!=='active')return;
    const step=session.steps[session.index],elapsed=stepElapsed(session,Date.now());
    let error='';
    if(session.anchor===null)error='请先继续计时';
    else if(!api.ready(session.course).canSchedule)error=api.ready(session.course).reason;
    else if(step.checks&&editor.querySelectorAll('[data-warmup]:checked').length!==step.checks.length)error='请完成热身检查；不适时可直接停止';
    else if(step.kind==='recovery'&&step.durationSeconds&&['time','both'].includes(step.endRule)&&elapsed<step.durationSeconds)error='恢复时间尚未到，可继续等待或提前结束记录';
    if(!error&&step.kind==='work'&&step.durationSeconds&&elapsed<step.durationSeconds)error='本段计时尚未完成；如需停止，请提前结束，不把未完成段算作完成';
    if(error){const box=editor.querySelector('#course-player-error');box.hidden=false;box.textContent=error;return;}
    advanceSession(session,Date.now());alerted=false;persist();view();
  }
  function summary(record=session) {
    const work=record.logs.filter(l=>l.step.kind==='work'&&l.reason==='completed');
    modal('分段训练记录',stamp(record.course)+'<p>'+esc(record.course.name)+' · '+(record.status==='complete'?'完整结束':'提前结束')+'</p><p>已完成 '+work.length+' 趟 · '+(record.spec.repetitions.some(r=>r.durationSeconds)?'按时间记录，距离未测量':work.reduce((n,l)=>n+l.step.distanceM,0)+'m 场地手动圈')+'</p><p>热身、恢复与冷身的未知距离未计入；不会把计划距离当作 GPS 测量。</p><ol class="course-log">'+record.logs.map(l=>'<li>'+esc(l.step.kind==='work'?(l.step.durationSeconds?clock(l.step.durationSeconds):l.step.distanceM+'m')+' · '+targetText(l.step.target):l.step.kind==='recovery'?recoveryLabel(l.step):l.step.label)+'<strong>'+(l.step.kind==='work'?seconds(l.actualSeconds):clock(l.actualSeconds))+' · '+(l.reason==='completed'?'已确认':'未完成')+'</strong></li>').join('')+'</ol>'+(record===session?btn('保存分段记录','workout-save','','primary'):btn('管理记录','edit:runs:'+record.id,'','quiet')),'page');
  }
  function save() {
    if(!session||session.status==='active')return;
    const date=new Date(session.startedAt),localDate=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const record=sessionRecord(session,localDate);
    if(!api.commit(data=>{
      if(!data.runs.some(r=>r.id===record.id))data.runs.push(record);
      if(record.pain)data.trainingHold=true;
      const plan=data.plans.find(p=>p.id===session.course.planId);
      if(plan&&session.status==='complete')plan.completed=true;
    }))return;
    session=null;persist();editor.close();api.refresh();api.notify('已保存分段记录');
  }
  editor.addEventListener('change',event=>{if(event.target.id==='course-vibrate')feedback=event.target.checked;if(event.target.matches('[data-warmup]')&&session){session.checks=[...editor.querySelectorAll('[data-warmup]:checked')].map(n=>Number(n.dataset.warmup));persist();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.status==='active'){pauseSession(session,Date.now());persist();}else if(!document.hidden&&session&&editor.querySelector('.course-live'))view();});
  window.addEventListener('pagehide',()=>{if(session?.status==='active'){pauseSession(session,Date.now());persist();}});
  return {detail,notes,hydrate,start,view,history:summary,hasSession:()=>Boolean(session),actions:{
    'workout-config':configure,'workout-back':()=>api.openCourse(course),'workout-begin':begin,'workout-resume':view,'workout-next':next,'workout-save':save,
    'workout-pause':()=>{if(!session)return;if(session.anchor===null){if(!api.ready(session.course).canSchedule)return api.notify(api.ready(session.course).reason);session.anchor=Date.now();}else pauseSession(session,Date.now());persist();view();},
    'workout-stop':()=>{if(!session)return;stopSession(session,Date.now(),'user');persist();summary();},
    'workout-pain':()=>{if(!session)return;stopSession(session,Date.now(),'pain');api.commit(data=>{data.trainingHold=true;});persist();summary();}
  }};
}

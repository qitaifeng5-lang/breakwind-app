import { healthKitEnabled, readHealthRuns } from './healthkit.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { duration, pace } from '../public/model.js';
import { analyzeTrack, coordinate } from '../public/running.js';
import { elapsedMs, runSummary } from './session.js';
import { iosSupported, reconcileRun, recover, resumeRun, startRun, stopRun, store } from './location.js';

const colors={background:'#0C0D10',surface:'#17181E',outline:'#303138',text:'#F7F7F9',muted:'#B5B5BE',accent:'#E63742',light:'#FF8991',green:'#68DBA9'};
const reasons={interrupted:'上一次记录意外中断，已保留定位点和可确认的时长。', 'location-error':'定位已暂停，请检查定位服务、精确位置和始终授权。', 'sample-limit':'已达到单次采样上限，请结束并保存。'};
const clock = value => duration(Math.floor(value/1000));

function Button({label,onPress,disabled,primary=false}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,primary&&styles.primary,disabled&&styles.disabled,pressed&&styles.pressed]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

function Metric({label,value,unit}) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text>
    <Text style={styles.number}>{value} {unit && <Text style={styles.unit}>{unit}</Text>}</Text></View>;
}

const Route = React.memo(function Route({points}) {
  const valid=points.filter(coordinate);
  if (valid.length<2) return <View style={styles.routeEmpty}><Text style={styles.muted}>等待有效路线采样</Text></View>;
  const left=valid[0].lon;
  const x=p=>(((p.lon-left+540)%360)-180)*Math.cos(valid[0].lat*Math.PI/180);
  const xs=valid.map(x),ys=valid.map(p=>p.lat);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(296/Math.max(maxX-minX,1e-9),142/Math.max(maxY-minY,1e-9));
  const px=p=>160+(x(p)-(minX+maxX)/2)*scale;
  const py=p=>85+((minY+maxY)/2-p.lat)*scale;
  const path=valid.map((point,index)=>((!index || point.break || valid[index-1].segment!==point.segment)?'M':'L')+px(point).toFixed(1)+' '+py(point).toFixed(1)).join(' ');
  return <View style={styles.route}>
    <Svg width="100%" height={160} viewBox="0 0 320 170" accessible accessibilityLabel="跑步路线示意图">
      <Path d="M0 42H320 M0 85H320 M0 128H320 M80 0V170 M160 0V170 M240 0V170" stroke={colors.outline} strokeWidth="1"/>
      <Path d={path} stroke={colors.accent} strokeWidth="3" strokeLinejoin="round" fill="none"/>
      <Circle cx={px(valid[0])} cy={py(valid[0])} r="4" fill={colors.green}/>
      <Circle cx={px(valid.at(-1))} cy={py(valid.at(-1))} r="4" fill={colors.text}/>
    </Svg>
    <Text style={styles.muted}>路线示意 · 仅存于设备</Text>
  </View>;
});

function Metrics({distance,elapsed,climb,live}) {
  return <View style={styles.metrics}>
    <Metric label="距离" value={distance.toFixed(2)} unit="km"/>
    <Metric label="平均配速" value={pace(distance,elapsed/60000)} unit="/km"/>
    <Metric label="累计爬升" value={climb===null?'—':Math.round(climb)} unit="m"/>
    {live !== undefined && <Metric label="当前配速" value={live?duration(Math.round(live)):'—'} unit="/km"/>}
  </View>;
}

function RecordingScreen() {
  const [snapshot,setSnapshot]=useState({session:null,points:[],history:[]});
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [now,setNow]=useState(Date.now());
  const [selected,setSelected]=useState(null);
  const [devices,setDevices]=useState(false);
  const [healthPreview,setHealthPreview]=useState(null);
  const [healthMessage,setHealthMessage]=useState('');
  const working=useRef(false);
  const disposed=useRef(false);
  const inForeground=useRef(AppState.currentState!=='background');

  async function refresh(reconcile=false) {
    let next=await store.snapshot();
    if (reconcile && (next.session || iosSupported)) {
      await reconcileRun(next.session);
      next=await store.snapshot();
    }
    if (!disposed.current) {
      setSnapshot(previous=>previous.session?.id===next.session?.id && previous.points.length===next.points.length ?
        {...next,points:previous.points} : next);
    }
  }
  async function act(work) {
    if (working.current) return;
    working.current=true;
    setBusy(true);
    setMessage('');
    try {await work();}
    catch (error) {setMessage(error.message || '操作失败，请重试。');}
    finally {
      if (!disposed.current) {
        await refresh().catch(()=>setMessage('无法读取本机跑步记录，请重试。'));
        setNow(Date.now());
        setBusy(false);
      }
      working.current=false;
    }
  }
  useEffect(()=>{
    disposed.current=false;
    const setup=()=>act(async()=>{await recover();setReady(true);});
    setup();
    const subscription=AppState.addEventListener('change',state=>{
      inForeground.current=state==='active';
      if (state==='active') act(()=>refresh(true));
    });
    const timer=setInterval(()=>{
      if (inForeground.current) setNow(Date.now());
    },500);
    let polling=false;
    const poll=setInterval(async()=>{
      if (!inForeground.current || working.current || polling) return;
      polling=true;
      try {await refresh(true);}
      catch {if (!disposed.current) setMessage('定位或本地记录暂时无法读取。');}
      finally {polling=false;}
    },3000);
    return ()=>{disposed.current=true;subscription.remove();clearInterval(timer);clearInterval(poll);};
  },[]);

  const {session,points,history}=snapshot;
  const report=useMemo(()=>analyzeTrack(points),[points]);
  const elapsed=session?elapsedMs(session,now):0;
  const running=session?.phase==='running';
  const finished=session?.phase==='finished';
  const disabled=!ready||busy;
  const live=running&&now-(points.at(-1)?.t||0)<15000?report.series.at(-1)?.speed:null;
  const showHistory=run=>act(async()=>setSelected(await store.readSaved(run.id)));
  const discard=()=>Alert.alert('放弃这次跑步？','本机草稿和路线将被删除。',[
    {text:'取消',style:'cancel'},{text:'放弃',style:'destructive',onPress:()=>act(()=>store.discard(session.id))}
  ]);
  const deleteRun=()=>Alert.alert('删除运动记录？','本机记录和路线将被删除。',[
    {text:'取消',style:'cancel'},{text:'删除',style:'destructive',onPress:()=>act(async()=>{await store.deleteSaved(selected.id);setSelected(null);})}
  ]);

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content"/>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Text style={styles.brand}>ϟ 破风</Text><Text style={styles.label}>BREAKWIND / RUN</Text></View>
      {devices ? <>
        <Text style={styles.title}>设备与同步</Text>
        <Text style={styles.section}>Apple 健康</Text>
        <Text style={styles.muted}>{healthKitEnabled?'按次读取最近最多 100 条跑步摘要。只请求运动摘要的读取权限，预览后由你确认是否保存。':'此开发包未开启 HealthKit，仍可使用 iPhone GPS。'}</Text>
        <Text style={styles.muted}>Apple 隐藏读取授权状态。空结果可能是没有跑步记录，也可能是尚未授权。撤销权限请到「健康 → 个人头像 → App 与服务 → 破风」。</Text>
        {Boolean(healthMessage) && <Text style={styles.warning}>{healthMessage}</Text>}
        {Boolean(message) && <Text style={styles.warning}>{message}</Text>}
        <Button label="读取跑步摘要" primary disabled={!healthKitEnabled||disabled||Boolean(session)} onPress={()=>act(async()=>{
          setHealthPreview(null);setHealthMessage('');
          const workouts=await readHealthRuns();
          setHealthPreview(workouts);
          if (!workouts.length) setHealthMessage('未读取到带距离与用时的跑步。请在「健康」中核对记录或权限。');
        })}/>
        {healthPreview?.length>0 && <>
          <Text style={styles.body}>读取到 {healthPreview.length} 条跑步摘要</Text>
          {healthPreview.slice(0,4).map(item=><View style={styles.row} key={item.externalId}>
            <Text style={styles.body}>{new Date(item.started).toLocaleDateString('zh-CN')} · {item.distance.toFixed(2)} km</Text>
            <Text style={styles.muted}>{item.sourceName}</Text>
          </View>)}
          <Button label="确认导入并去重" primary disabled={disabled} onPress={()=>act(async()=>{
            const result=await store.importHealth(healthPreview,Date.now());
            setHealthMessage('已导入 '+result.added+' 条 · 跳过 '+result.skipped+' 条重复记录。');
            setHealthPreview(null);
          })}/>
        </>}
        <Text style={styles.section}>COROS 与 Android</Text>
        <Text style={styles.muted}>COROS 目前可在网页版导入官方导出的 FIT 或 GPX。此开发包未接入 Health Connect。</Text>
        <Button label="返回跑步" disabled={busy} onPress={()=>{setDevices(false);setHealthPreview(null);setHealthMessage('');}}/>
      </> : selected ? <>
        <Text style={styles.title}>运动报告</Text>
        <Text style={styles.muted}>{new Date(selected.started).toLocaleString('zh-CN')} · {selected.source==='healthkit'?'Apple 健康 / '+selected.sourceName:'iPhone GPS'} · {clock(selected.elapsed)}</Text>
        <Metrics {...selected}/>
        <Route points={selected.points}/>
        <Text style={styles.section}>完整公里分段</Text>
        {selected.splits.length ? selected.splits.map((time,index)=><View style={styles.row} key={index}>
          <Text style={styles.body}>{index+1} km</Text><Text style={styles.body}>{duration(Math.round(time))} /km</Text>
        </View>) : <Text style={styles.muted}>本次未记录到完整公里。</Text>}
        <Button label="返回跑步" onPress={()=>setSelected(null)}/>
        <Button label="删除本机记录" onPress={deleteRun} disabled={disabled}/>
      </> : <>
        <Text style={styles.title}>{session?'记录跑步':'开始跑步'}</Text>
        <Text style={styles.muted}>{session ? 'iPhone GPS · '+(running?'正在记录':finished?'等待保存':'已暂停') :
          'iPhone 锁屏记录需要始终定位和精确位置授权。仅在跑步期间采样。'}</Text>
        <View style={styles.timer}><Text style={styles.label}>ACTIVE TIME</Text><Text style={styles.time}>{clock(elapsed)}</Text></View>
        <Metrics distance={report.distance/1000} elapsed={elapsed} climb={report.climb} live={live}/>
        <Route points={points}/>
        {session?.reason && <Text style={styles.warning}>{reasons[session.reason]}</Text>}
        {running && now-(session.lastFix ?? session.anchor)>15000 && <Text style={styles.warning}>暂未取得稳定定位，信号缺口会分段记录。</Text>}
        {Boolean(message) && <Text style={styles.warning} accessibilityLiveRegion="polite">{message}</Text>}
        {!ready ? <Button label={busy?'正在读取…':'重试读取'} disabled={busy} onPress={()=>act(async()=>{await recover();setReady(true);})}/> :
          !session ? <Button label="开始 GPS 跑步" primary disabled={disabled||!iosSupported} onPress={()=>act(startRun)}/> :
          finished ? <>
            <Button label="保存并查看报告" primary disabled={disabled||!runSummary(session,points).valid}
              onPress={()=>act(async()=>{await store.save(session.id);setSelected(await store.readSaved(session.id));})}/>
            {!runSummary(session,points).valid && <Text style={styles.muted}>保存至少需要 10 米有效轨迹和 6 秒记录。</Text>}
            <Button label="返回暂停状态" disabled={disabled} onPress={()=>act(()=>store.change('reopen',Date.now(),session.id))}/>
          </> : <>
            <Button label={running?'暂停':'继续 GPS 跑步'} primary disabled={disabled} onPress={()=>act(()=>running?stopRun(session,'pause'):resumeRun(session))}/>
            <Button label="结束跑步" disabled={disabled} onPress={()=>act(()=>stopRun(session,'finish'))}/>
          </>}
        {session && !running && <Button label="放弃草稿" disabled={disabled} onPress={discard}/>}
        {Boolean(message) && <Button label="打开系统设置" onPress={()=>Linking.openSettings().catch(()=>setMessage('请从 iPhone 主屏幕打开系统设置。'))}/>}
        <Button label="设备与同步" disabled={disabled} onPress={()=>setDevices(true)}/>
        <Text style={styles.section}>本机运动历史</Text>
        {history.length ? history.map(run=><Pressable key={run.id} accessibilityRole="button" disabled={busy} onPress={()=>showHistory(run)} style={styles.row}>
          <Text style={styles.body}>{new Date(run.started).toLocaleDateString('zh-CN')} · {run.distance.toFixed(2)} km</Text>
          <Text style={styles.muted}>{clock(run.elapsed)} ›</Text>
        </Pressable>) : <Text style={styles.muted}>保存后可在这里查看路线和分段。</Text>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><RecordingScreen/></SafeAreaProvider>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},content:{padding:20,gap:12,paddingBottom:32},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:16,borderBottomWidth:1,borderColor:colors.outline},
  brand:{color:colors.light,fontSize:23,fontWeight:'800'},label:{color:colors.muted,fontSize:12,fontWeight:'600',letterSpacing:1},
  title:{color:colors.text,fontSize:34,fontWeight:'800',marginTop:4},muted:{color:colors.muted,fontSize:13,lineHeight:21},body:{color:colors.text,fontSize:15},
  timer:{alignItems:'center',paddingVertical:12},time:{fontSize:60,fontVariant:['tabular-nums'],fontWeight:'800',color:colors.text},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{flexGrow:1,minWidth:'44%',padding:12,backgroundColor:colors.surface,borderRadius:12},
  number:{fontSize:24,fontVariant:['tabular-nums'],fontWeight:'750',color:colors.text,marginTop:4},unit:{fontSize:12,color:colors.muted},
  route:{backgroundColor:colors.surface,borderRadius:12,overflow:'hidden',paddingBottom:8,alignItems:'center'},
  routeEmpty:{height:100,borderRadius:12,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  section:{color:colors.text,fontSize:17,fontWeight:'700',marginTop:12},
  row:{flexDirection:'row',justifyContent:'space-between',gap:8,alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderColor:colors.outline},
  button:{backgroundColor:colors.surface,borderColor:colors.outline,borderWidth:1,borderRadius:12,minHeight:48,alignItems:'center',justifyContent:'center',padding:12},
  primary:{backgroundColor:'#C92635',borderColor:colors.accent},buttonText:{color:colors.text,fontSize:15,fontWeight:'700'},disabled:{opacity:.45},pressed:{opacity:.75},
  warning:{color:colors.light,fontSize:14,lineHeight:21}
});

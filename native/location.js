import { openDatabaseAsync } from 'expo-sqlite';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { createRunStore } from './run-store.js';

const task = 'breakwind-running-location-v1';
export const store = createRunStore(()=>openDatabaseAsync('breakwind-runs.db'));
export const iosSupported = Platform.OS === 'ios';

TaskManager.defineTask(task, async ({data,error})=>{
  try {
    if (error) {
      await store.change('location-error',Date.now());
      await stopTask();
      return;
    }
    if (data?.locations?.length && (await store.append(data.locations,Date.now())) === false) await stopTask();
  } catch (error) {
    // No workout coordinates or health data in diagnostics.
    console.warn('Breakwind could not persist a background location update.',error?.code || 'storage');
  }
});

async function stopTask() {
  if (iosSupported && await Location.hasStartedLocationUpdatesAsync(task)) {
    await Location.stopLocationUpdatesAsync(task);
  }
}

async function authorize() {
  if (!iosSupported || !(await TaskManager.isAvailableAsync())) throw new Error('后台跑步需要 iPhone 上的原生开发版。');
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('请在 iPhone 设置中开启定位服务。');
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('需要使用期间定位权限。请检查「设置 → 破风 → 位置」。');
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted || background.ios?.scope !== 'always') throw new Error('锁屏跑步需要「始终」定位权限。如果此前选择了「允许一次」，请在设置中调整。');
  if (background.ios?.accuracy === 'reduced') throw new Error('请在位置权限中开启「精确位置」，以减少跑步距离误差。');
}

async function begin(session) {
  const started = await store.change('resume',Date.now(),session.id);
  if (started?.phase !== 'running') throw new Error('当前草稿无法开始定位。');
  try {
    await Location.startLocationUpdatesAsync(task,{
      accuracy:Location.Accuracy.BestForNavigation,
      activityType:Location.ActivityType.Fitness,
      distanceInterval:5,
      deferredUpdatesDistance:0,
      deferredUpdatesInterval:0,
      pausesUpdatesAutomatically:false,
      showsBackgroundLocationIndicator:true
    });
  } catch {
    await store.change('location-error',Date.now(),session.id);
    await stopTask().catch(()=>{});
    throw new Error('未能启动后台定位。跑步草稿已保留，请检查权限并重试。');
  }
}

let recovered = false;
export async function recover() {
  if (recovered) return;
  const {session} = await store.snapshot();
  if (session?.phase === 'running') await store.change('interrupted',Date.now(),session.id);
  await stopTask();
  recovered = true;
}

export async function startRun() {
  await authorize();
  await stopTask();
  await begin(await store.create(Date.now(),'ios-background-gps'));
}
export async function resumeRun(session) {
  if (session.reason === 'sample-limit') throw new Error('采样已满，请结束并保存本次记录。');
  await authorize();
  await stopTask();
  await begin(session);
}
export async function stopRun(session,event) {
  await store.change(event,Date.now(),session.id);
  await stopTask();
}
export async function reconcileRun(session) {
  if (session?.phase !== 'running') {
    await stopTask();
    return;
  }
  const permission = await Location.getBackgroundPermissionsAsync();
  if (permission.ios?.scope !== 'always' || permission.ios?.accuracy === 'reduced' ||
      !(await Location.hasServicesEnabledAsync()) || !(await Location.hasStartedLocationUpdatesAsync(task))) {
    await stopRun(session,'location-error');
  }
}

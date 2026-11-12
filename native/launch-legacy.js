import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {openDatabaseAsync} from 'expo-sqlite';
import {createRunStore} from './run-store.js';
export const legacyStore=createRunStore(()=>openDatabaseAsync('breakwind-runs.db'));
const task='breakwind-running-location-v1';
export async function stopLegacyTracking(){
 if(await TaskManager.isTaskRegisteredAsync(task)){try{await Location.stopLocationUpdatesAsync(task);}catch{/* Registration cleanup below is authoritative. */}if(await TaskManager.isTaskRegisteredAsync(task))await TaskManager.unregisterTaskAsync(task);}
 const s=await legacyStore.snapshot();if(s.session?.phase==='running')await legacyStore.change('interrupted',Date.now(),s.session.id);
 return legacyStore.snapshot();
}

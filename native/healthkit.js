import Constants from 'expo-constants';
import { normalizeHealthWorkout } from './health-data.js';

export const healthKitEnabled = Constants.expoConfig?.extra?.healthkit === true;

export async function readHealthRuns() {
  if (!healthKitEnabled) throw new Error('此开发包未启用 HealthKit。');
  const hk = await import('@kingstinct/react-native-healthkit');
  if (!hk.isHealthDataAvailable()) throw new Error('此设备无法读取 Apple 健康。');
  const completed = await hk.requestAuthorization({toRead:['HKWorkoutTypeIdentifier']});
  if (!completed) throw new Error('未能完成 Apple 健康授权请求。');
  const workouts = await hk.queryWorkoutSamples({limit:100,ascending:false,filter:{workoutActivityType:hk.WorkoutActivityType.running}});
  return workouts.map(workout=>normalizeHealthWorkout(workout.toJSON())).filter(Boolean);
}

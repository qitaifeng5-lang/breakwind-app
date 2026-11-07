const distanceUnits={m:1,km:1000,mi:1609.344};
const timeUnits={s:1,min:60,h:3600};

export function normalizeHealthWorkout(sample) {
  const started = new Date(sample.startDate).getTime();
  const end = new Date(sample.endDate).getTime();
  const distance = sample.totalDistance?.quantity * distanceUnits[sample.totalDistance?.unit] / 1000;
  const elapsed = sample.duration?.quantity * timeUnits[sample.duration?.unit] * 1000;
  if (typeof sample.uuid !== 'string' || !sample.uuid || !sample.startDate || !sample.endDate || !Number.isFinite(started) || !Number.isFinite(end) || end <= started ||
      !(distance >= 0.01 && distance <= 300 && elapsed >= 6000 && elapsed <= 86400000)) return null;
  const source = sample.sourceRevision?.source;
  return {externalId:sample.uuid,started,distance,elapsed,climb:null,splits:[],
    sourceName:source?.name || 'Apple 健康',sourceBundle:source?.bundleIdentifier || null};
}

// Local experience simulator only. No store, receipt, account or payment is connected.
export const vipProduct={id:'breakwind_vip_monthly',currency:'CNY',targetPriceMinor:1290,billingPeriod:'month',priceStatus:'target-not-store-verified'};
export const freeCapabilities=['record','import','single-course','basic-week','coach-plan','manual-calendar','history','export','safety'];
export function membershipStatus(snapshot,now=Date.now()) {
  if(snapshot?.mode!=='experience')return {status:'unavailable',active:false,productionVerified:false};
  const active=snapshot.status==='active'&&Number(snapshot.expiresAt)>now;
  return {...snapshot,status:snapshot.status==='active'&&!active?'expired':snapshot.status,active,productionVerified:false};
}
export function entitlement(snapshot,capability,{mode='production',now=Date.now()}={}) {
  if(freeCapabilities.includes(capability)||['view-generated','finish-session'].includes(capability))return true;
  // A browser flag is never a production entitlement, including a forged verified field.
  return mode==='experience'&&membershipStatus(snapshot,now).active;
}
export function applyTestTransaction(snapshot,event) {
  if(event.mode!=='experience'||!event.id||!Number.isSafeInteger(event.sequence)||event.sequence<1)throw Error('仅接受明确标记的本地模拟交易');
  const s=snapshot?.mode==='experience'?structuredClone(snapshot):{mode:'experience',status:'none',sequence:0,seen:[],autoRenew:false};
  if(s.seen.includes(event.id)||event.sequence<=s.sequence)return s;
  const allowed=['pending','success','cancel','failure','renew','cancel-renew','expire','revoke','restore'];
  if(!allowed.includes(event.type))throw Error('未知测试状态');
  if(['success','renew','restore'].includes(event.type)&&!Number.isFinite(event.expiresAt))throw Error('测试有效期缺失');
  if(event.type==='restore'&&!['active','expired','revoked'].includes(event.restoredStatus))throw Error('恢复购买需要模拟渠道当前状态，不凭旧购买记录恢复权益');
  s.seen.push(event.id);s.sequence=event.sequence;s.lastResult=event.type;
  if(event.type==='pending'&&!membershipStatus(s).active)s.status='pending';
  if(['success','renew','restore'].includes(event.type))Object.assign(s,{status:'active',expiresAt:event.expiresAt,autoRenew:event.autoRenew!==false});
  if(event.type==='restore')s.status=event.restoredStatus;
  if(['cancel','failure'].includes(event.type)&&s.status!=='active')s.status=event.type==='cancel'?'cancelled':'failed';
  if(event.type==='cancel-renew')s.autoRenew=false;
  if(event.type==='expire')s.status='expired';
  if(event.type==='revoke')Object.assign(s,{status:'revoked',autoRenew:false});
  return s;
}

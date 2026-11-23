const {withInfoPlist,withEntitlementsPlist}=require('expo/config-plugins');
module.exports=config=>{
 config=withInfoPlist(config,c=>{for(const k of Object.keys(c.modResults))if(k.startsWith('NSLocation')||k.startsWith('NSHealth')||k==='NSMotionUsageDescription')delete c.modResults[k];c.modResults.UIBackgroundModes=(c.modResults.UIBackgroundModes||[]).filter(v=>!['location','fetch','processing'].includes(v));return c;});
 return withEntitlementsPlist(config,c=>{for(const k of Object.keys(c.modResults))if(k.startsWith('com.apple.developer.healthkit'))delete c.modResults[k];return c;});
};

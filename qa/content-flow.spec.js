import {test,expect} from '@playwright/test';
import {fresh} from '../public/model.js';
test.use({screenshot:'off',video:'off'});
test('current selection drives long-term preview and preserves course semantics through export',async({page})=>{
 const data=fresh();data.groupPlan={event:'800 m',pb:130,group:'base',phase:'base'};
 await page.addInitScript(data=>{
  localStorage.setItem('breakwind.local.v1',JSON.stringify(data));
  localStorage.setItem('breakwind.pb-catalog',JSON.stringify({event:'1500 m',pb:270,group:'competitive',phase:'develop'}));
 },data);
 await page.goto('/#run');
 await expect(page.locator('.course-profile')).toContainText('1500');
 await page.getByRole('button',{name:'长期训练 · 体验',exact:true}).click();
 await expect(page.locator('#program-create select[name=event]')).toHaveValue('1500 m');
 await page.getByRole('button',{name:'预览整个周期',exact:true}).click();
 await expect(page.locator('.week-outline')).toContainText('第12周');
 await page.getByRole('button',{name:/第2周 ·/}).click();
 await expect(page.locator('.week-outline')).toContainText('5×5分钟');
 const result=await page.evaluate(async()=>{
  const {pbCourses}=await import('/pb-library.js');const {buildProgram,previewProgramWeek,exportProgram}=await import('/program.js');
  const {fresh}=await import('/model.js');const {courseReading}=await import('/workout-ui.js');
  const state=fresh(),p=buildProgram({event:'1500 m',pb:270,startDate:'2026-12-07'});p.programId='browser-fixture';state.programs=[p];
  state.plans=previewProgramWeek(state,p,4,{today:'2026-12-07'}).added;
  const exported=exportProgram(state,p.programId);
  return exported.plans.map(plan=>({category:plan.categoryId,same:JSON.stringify(courseReading(plan.course))===JSON.stringify(courseReading(pbCourses('1500 m',270,{group:'competitive'}).find(c=>c.id===plan.courseId))),revision:plan.courseRevision===plan.course.catalogRevision}));
 });
 expect(result.some(x=>x.category==='tempo')).toBe(true);expect(result.some(x=>x.category==='combination')).toBe(true);
 expect(result.every(x=>x.same&&x.revision)).toBe(true);
});

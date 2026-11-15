import {test,expect} from '@playwright/test';
import {foodGallery,foodGalleryGroups} from '../public/food-gallery.js';
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();

test('every pictured category is browseable in the real search page with aligned, decoded assets',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');
 for(const [group,label] of Object.entries(foodGalleryGroups)){
  await click(page,label);const rows=page.locator('.food-pick');await expect(rows).toHaveCount(24);
  await expect(page.locator('.food-section-title')).toHaveText(label);
  const selected=page.locator('.food-browse-groups [aria-pressed=true]');
  const position=await selected.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;});expect(position).toBe(true);
  const ids=await rows.locator('[data-food-art]').evaluateAll(els=>els.map(el=>el.dataset.foodArt));
  expect(new Set(ids).size).toBe(24);expect(ids.sort()).toEqual(foodGallery.filter(f=>f.group===group).map(f=>f.id).sort());
  const actual=await rows.first().locator('[data-food-art]').evaluate(async el=>{const style=getComputedStyle(el),image=new Image();image.src=style.backgroundImage.slice(5,-2);await image.decode();return [image.naturalWidth,image.naturalHeight,style.backgroundSize];});
  expect(actual).toEqual([1536,1024,'600% 400%']);
 }
 const width=await page.locator('.dialog-body').evaluate(el=>[el.scrollWidth,el.clientWidth]);expect(width[0]).toBeLessThanOrEqual(width[1]+1);
});

test('new Chinese foods retain selected category, photo, saved quantity and favorites across return and reload',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');await click(page,'水果果干');
 const original=page.locator('[data-action="food-pick:fdc-169089"]');await original.scrollIntoViewIfNeeded();await original.click();
 await expect(page.locator('.portion-product [data-food-art]')).toHaveAttribute('data-food-art','fdc-169089');
 await click(page,'查看食物详情');await expect(page.locator('.food-detail-hero [data-food-art]')).toHaveAttribute('data-food-art','fdc-169089');
 await click(page,'收藏食物');await click(page,'调整份量');await click(page,'保存到午餐');
 await expect(page.locator('.meal-entry [data-food-art]')).toHaveAttribute('data-food-art','fdc-169089');
 await page.reload();await expect(page.locator('.meal-entry [data-food-art]')).toHaveAttribute('data-food-art','fdc-169089');
 await click(page,'添加晚餐');await page.getByRole('searchbox').fill('苦瓜');
 await expect(page.locator('.food-pick').first()).toHaveAttribute('data-action','food-pick:fdc-168393');
 await page.getByRole('searchbox').fill('伊利纯牛奶250ml');await expect(page.locator('.food-pick')).toHaveCount(0);
});

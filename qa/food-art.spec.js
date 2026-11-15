import {test,expect} from '@playwright/test';
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
test('common food images follow the real search, portion, details, saved meal, recent and favorite flows',async({page})=>{
 await page.goto('/#food');await click(page,'添加午餐');
 for(const [query,key] of [['苹果','apple'],['豆腐','tofu'],['馄饨','wonton-soup'],['宫保鸡丁','kung-pao'],['鸡肉炒饭','chicken-fried-rice'],['白粥','congee']]){
  await page.getByRole('searchbox').fill(query);await expect(page.locator('.food-pick').first().locator('[data-food-art]')).toHaveAttribute('data-food-art',key);
 }
 await page.getByRole('searchbox').fill('苹果');await page.locator('.food-pick').first().click();
 await expect(page.locator('.portion-product [data-food-art]')).toHaveAttribute('data-food-art','apple');
 await click(page,'查看食物详情');const image=page.locator('.food-detail-hero [data-food-art]');await expect(image).toHaveAttribute('data-food-art','apple');
 const loaded=await image.evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.slice(5,-2),image=new Image();image.src=url;await image.decode();return image.naturalWidth;});expect(loaded).toBeGreaterThan(1000);
 await click(page,'收藏食物');await click(page,'调整份量');await click(page,'保存到午餐');
 await expect(page.locator('.meal-entry [data-food-art]')).toHaveAttribute('data-food-art','apple');
 await expect(page.locator('.food-recent-rail [data-food-art]')).toHaveAttribute('data-food-art','apple');await click(page,'我的收藏');await expect(page.locator('.food-recent-rail [data-food-art]')).toHaveAttribute('data-food-art','apple');
 await page.reload();await expect(page.locator('.meal-entry [data-food-art]')).toHaveAttribute('data-food-art','apple');
 await click(page,'添加午餐');await page.getByRole('searchbox').fill('061954000041');await expect(page.locator('.food-pick .food-photo')).toHaveCount(0);
});

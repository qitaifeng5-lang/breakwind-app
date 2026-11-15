# 常见食品配图 · 2026-11-15

正式搜索、详情、份量、餐次记录、最近吃过和收藏共用 public/food-art.js，不改食品营养、用户记录或历史快照。

当前覆盖范围：现有已核对中文名称、优先常用食品及内置配方中的 91 个非品牌食品，全部对应图片。另有按主体名称严格匹配的常见食材。105 类图像不是新增营养食品数量。

生虾／熟虾、生肉／熟肉、白粥／米饭、水饺／锅贴、鸡胸肉／宫保鸡丁／鸡肉炒饭分别匹配。菜品变体的照片仅表示菜品类型，不代表实际配方、馅料、重量或烹调程度。未知混合菜不借用单个食材照片。

品牌、条码商品不使用通用图片冒充商品包装；目前仍有商品没有已核实的包装图。此项不能视为中国品牌图片库已完成。

## 原创图片与保存位置

- public/food-photos.png：原有 9 类。
- public/food-produce.png：水果、蔬菜、豆类、坚果，24 格。
- public/food-staples.png：主食、肉鱼虾、饮品，24 格。
- public/food-dishes.png：饭、面、粥、汤、饺子及家常菜，24 格。
- public/food-basics.png：生鲜、调味与其他常见食材，24 格。

采用内置图像生成工具制作原创食物示意素材，没有商品包装、品牌标志或营养数字。图片按网格单格显示在真实组件中，不作为整页效果图。源文件保留在生成目录，项目副本随同网页预览、离线缓存和 iOS 共用入口打包。

## 本轮生成提示原文

### produce

Create ONE production image atlas for a real nutrition app: exactly 6 columns by 4 rows of square tiles, landscape 3:2 aspect, perfectly equal cells with NO gaps, NO borders, NO labels, NO text. Each tile is a separate photorealistic food studio photograph with a uniform dark navy #182230 background, soft light, centered entire subject with generous padding, similar scale, three-quarter overhead angle. Food on simple matte small ceramic dishes when appropriate; fruit can be loose. Do not let items cross their tile boundaries. No brands, logos, packaging, utensils, typography, people or nutrition values. Visually distinguish every listed food. Read the cell assignments left to right row by row. This is an image atlas, not an App mockup. Row 1: red apple with one cut wedge; orange cut in half; strawberries; blueberries; watermelon wedge; ripe mango cut into cubes. Row 2: avocado halves; cucumber with slices; fresh spinach leaves; cooked plain spinach in small bowl; carrots; red tomatoes. Row 3: whole potato with cut half; yellow sweetcorn cob; shelled peanuts; almonds; walnut kernels; green edamame pods with beans. Row 4: white tofu cubes; green lettuce; green pear with a wedge; purple grapes; kiwi halves; pineapple wedges.

### staples

Create ONE production image atlas for a real nutrition app: exactly 6 columns by 4 rows of square tiles, landscape 3:2 aspect, perfectly equal cells with NO gaps, NO borders, NO labels, NO text. Each tile is a separate photorealistic food studio photograph with a uniform dark navy #182230 background, soft light, centered entire subject with generous padding, similar scale, three-quarter overhead angle. Food on simple matte small ceramic dishes when appropriate; fruit can be loose. Do not let items cross their tile boundaries. No brands, logos, packaging, utensils, typography, people or nutrition values. Visually distinguish every listed food. Read the cell assignments left to right row by row. This is an image atlas, not an App mockup. Row 1: cooked brown rice; plain white sliced bread; whole wheat sliced bread; plain cooked wheat noodles in bowl; cooked brown soba noodles; cooked lamb slices. Row 2: roast beef slices; roast pork slices; cooked salmon fillet; raw grey shrimp; cooked pink shrimp; brewed black coffee in cup. Row 3: brewed pale green tea; brewed amber black tea; hot cafe latte with milk foam; iced cafe latte in clear glass; plain milk tea in clear glass without pearls; plain soy milk in clear glass. Row 4: yellow cheese wedges; mixed stir-fried vegetables; cooked green beans; cappuccino with thick foam; fried egg sunny side up; dry yellow soybeans.

### dishes

Create ONE production image atlas for a real nutrition app: exactly 6 columns by 4 rows of square tiles, landscape 3:2 aspect, perfectly equal cells with NO gaps, NO borders, NO labels, NO text. Each tile is a separate photorealistic food studio photograph with a uniform dark navy #182230 background, soft light, centered entire subject with generous padding, similar scale, three-quarter overhead angle. Food on simple matte small ceramic dishes when appropriate; fruit can be loose. Do not let items cross their tile boundaries. No brands, logos, packaging, utensils, typography, people or nutrition values. Visually distinguish every listed food. Read the cell assignments left to right row by row. This is an image atlas, not an App mockup. Row 1: Chinese tomato and scrambled eggs; Chinese egg and vegetable fried rice; Chinese plain steamed mantou bun cut in half; boiled pork cabbage dumplings; pan-fried potstickers with golden bases; steamed dumplings. Row 2: Chinese pleated steamed bao buns one closed and one cut open; stir-fried lo mein wheat noodles with a few vegetables; plain white rice congee; vegetable rice congee; egg rice congee; meat rice congee with shredded pork. Row 3: Chinese hot and sour soup; Chinese egg drop soup; wonton soup; kung pao chicken cubes with peanuts and chili; sweet and sour pork; soy-sauce beef over white rice. Row 4: soy-sauce chicken over white rice; crispy spring rolls; sweet and sour pork over white rice; shrimp fried rice; chicken fried rice; shrimp lo mein noodles.

### basics

Create ONE production food image atlas, exactly 6 columns by 4 rows of equal square tiles, landscape 3:2 aspect, NO gaps NO borders NO text. Each cell is a separate photorealistic studio food photograph, uniform dark navy #182230 background, soft light, centered entire subject with generous padding, three-quarter overhead angle, consistent scale. Simple small ceramic dishes or bowls where suitable. Items must not cross tile boundaries. No brands, logos, packaging, people, typography, nutrition numbers. Read left to right row by row. Row 1: fresh raw red beef steak; fresh raw pale pink pork cut; fresh raw lamb cut; fresh raw chicken breast; fresh raw salmon fillet; whole brown chicken eggs with one cracked raw egg in a small dish. Row 2: plain boiled potato pieces; yellow corn kernels; white wheat flour in a bowl; golden cooking oil in small clear glass cruet; butter pat; granulated white sugar in bowl. Row 3: table salt in tiny bowl; amber honey in glass dish; dark chocolate squares; clear drinking water in glass; orange juice in glass; dark cola soda in clear glass without ice. Row 4: sliced fresh mushrooms; purple eggplant; green bok choy; pale green Chinese cabbage; orange pumpkin wedge; peach with cut half. This is an asset atlas for an App, not a UI mockup.

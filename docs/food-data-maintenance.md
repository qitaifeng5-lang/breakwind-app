# 食品数据维护

来源与许可：USDA FoodData Central公开数据，CC0-1.0；来源网址、版本、原始ZIP校验和见food-source-manifest.json。未混入Open Food Facts、薄荷或付费专有数据。

重建：`python scripts/build-food-catalog.py --download`。仅下载固定官方版本，校验和不同则停止；标准库即可运行，无API密钥。生成public/food-data.js与来源清单。中文名称索引规则在脚本中；修改索引不修改原始营养数值。重新运行`node scripts/report-food-coverage.mjs`检查实际中文与商品命中；不要以记录数量替代覆盖审核。

品牌来源保留原始描述、市场、条码、规格、单位、更新时间。兼容同条码不同明确包装/口味；同来源版本去重保留追溯ID。配方估算在fuel.js中从官方食材计算，产量和食材可以修改，不能冒充官方餐品。

更新前运行food-catalog、content-consistency以及浏览器cards-food/launch回归。未获得授权的中国数据不能通过抓取补齐；新增数据源需先记录商业使用及再分发条件。不把用户上传标签、饮食历史或私人食材库写入此公共数据文件。

本项目以来源网址与sourceUpdated区分数据版本。更新库不对food.components快照执行迁移；收藏保留私有食物副本，旧记录改份量按旧营养快照计算。

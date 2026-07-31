# lit_gz 角色覆写说明

`lit_gz` 默认从 `lit` 继承角色、技能、翻译和角色包元数据，[index.js](../index.js) 同时负责继承转换、差异聚合和最终角色包导出。本目录仅保存国战专属差异；`rebuild.mjs` 会自动扫描这里的 `.js` 文件并更新 `ROLE_FILES`，无需手动登记。

## 文件命名

- 文件名使用角色资源主名，后置显示前缀写在末尾。例如 `lit_hupan9胡畔` 对应 `hupan9.js`，而不是 `9hupan.js`。
- 国战角色完整 ID 继续使用 `gz_` 前缀，例如 `gz_lit_hupan9胡畔`。
- 技能 ID 不加 `gz_`；同名技能会覆盖普通包版本。

## 可覆写内容

角色文件可按需导出以下任意对象：

```js
export const character = {
    'gz_lit_hujunwei胡峻玮': {
        // 国战专属角色定义
    },
};

export const skill = {
    lit_wutong: {
        // 国战专属技能定义
    },
};

export const translate = {
    lit_wutong_info: '国战版描述',
    'gz_lit_hujunwei胡峻玮': '胡峻玮',
};

export const characterIntro = {
    'gz_lit_hujunwei胡峻玮': '国战专用简介',
};
```

可覆写字段包括：`character`、`skill`、`characterTitle`、`characterIntro`、`characterReplace`、`characterFilter`、`characterSubstitute`、`perfectPair`、`translate`、`dynamicTranslate` 和 `pinyins`。所有字段都按键合并，国战文件中的同名键优先。

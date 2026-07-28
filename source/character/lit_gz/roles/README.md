# lit_gz 角色覆写说明

当某个 `lit` 角色在国战中的技能、翻译、简介或配对关系需要与平时不同，可以在这里单独写一个同名角色文件，仅覆写国战差异。

## 用法

1. 在本目录下新建角色文件，例如：
   - `hujunwei.js`
   - `wangrong.js`

2. 在 [index.js](../index.js) 的 `ROLE_FILES` 中加入文件名：

```js
const ROLE_FILES = [
    'hujunwei',
];
```

3. 角色文件按需导出这些对象中的任意一部分：

```js
export const character = {
    'gz_lit_hujunwei胡峻玮': {
        // 若国战下整张角色要改技能表/体力/描述标签，可在这里覆写
    },
};

export const skill = {
    lit_wutong: {
        // 仅覆写国战版技能定义
    },
};

export const translate = {
    lit_wutong_info: '国战版描述',
    gz_lit_hujunwei胡峻玮: '胡峻玮',
};

export const characterIntro = {
    'gz_lit_hujunwei胡峻玮': '国战专用简介',
};
```

## 继承规则

- 默认所有内容都继承 `lit`
- 这里只有“差异项”需要写出来
- `skill` / `dynamicTranslate` / `translate` 为直接覆盖同名 key
- `character` / `characterIntro` / `characterTitle` / `perfectPair` 等为合并覆盖

## 命名约定

- 角色 key 使用 `gz_` 前缀后的完整角色 id
- 技能 key 仍使用原技能 id，不加 `gz_`

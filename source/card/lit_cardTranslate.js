import { lib, game, ui, get, ai, _status } from '../../../../../noname.js';
import { lib_lit } from '../precontent.js';

function getDKListTranslate() {
    let str = '';
    for(let skill of lib_lit.dkSkills){
		str += `<li>${get.poptip(skill)}</li>`
	}
	return str;
}

export const translate = {
    'lit_diaoka': '吊卡',
    'lit_diaoka_info': `可重铸，限“九/叁”势力使用；随机获以下技能，除开场上已有技及发动过的限定技/觉醒技，获新技能前失去吊卡技，技能用尽则补1张牌，吊卡技不失效：${getDKListTranslate()}`,

    'lit_diaokajineng': '吊卡',
    'lit_diaokajineng_info': '显示已获得的吊卡技能',
    'lit_qianfanpai': '遣返牌',
    'lit_qianfanpai_info': '出牌阶段，对距离为1的他人使用。其于判定阶段判定：不为♦，其回合立即结束',
    'lit_zigaodebeixin': '自高的背心',
    'lit_zigaodebeixin_limit': '（存活人数>4）',
    'lit_zigaodebeixin_info': '锁；防属性伤害，锦囊牌不能被无懈',
    'lit_zenggedeshouzhou': '曾哥的手肘',
    'lit_zenggedeshouzhou_info': '锁；属性伤害+1',
    'lit_qianlaoshidejialian': '钱老师的加练',
    'lit_qianlaoshidejialian_info': '锁；你的牌无次数限制',
    'lit_pandejianpan': '畔的键盘',
    'lit_pandejianpan_info': '出牌阶段限1次，交换两人手牌',
    'lit_zhongyutongdebiji': '钟雨桐的笔记',
    'lit_zhongyutongdebiji_info': '弃置区域内的牌后，可观看并弃置他人区域内的1张牌',
    'lit_liyangdeziyou': '李洋的自由',
    'lit_liyangdeziyou_info': '锁；没有手牌上限（+∞）',
    'lit_zhangxuandemp5': '张轩的MP5',
    'lit_zhangxuandemp5_info': '使用杀后若还有杀，可展示手牌中所有的杀，令此杀不能被响应',
    'lit_yibandelajitong': '1班的垃圾桶',
    'lit_yibandelajitong_info': '（6次后失效）获得所有从判定区弃置的牌',
    'lit_xiaohongtanver': '小红他女儿',
    'lit_xiaohongtanver_info': '失去此技能，拿走1人未失效的吊卡技能，如果此时其没有可获得的吊卡技能，你随机获得一个',
    'lit_qbzhimao': 'Qb之帽',
    'lit_qbzhimao_limit': '（存活人数>4）',
    'lit_qbzhimao_info': '锁；受到的伤害>1时，将其改为1，并摸等同于溢出伤害量的牌',
    'lit_jiegededifengfenger': '杰哥的地缝缝儿',
    'lit_jiegededifengfenger_limit': '（2<存活人数<6）',
    'lit_jiegededifengfenger_info': '锁；1人死亡后，你须选择其一初始技能添加至你的角色牌',
};

export const dynamicTranslate = {
    lit_diaoka(player) {
        let str = "可重铸，限“九/叁”势力使用；随机获以下技能，除开场上已有技及发动过的限定技/觉醒技，获新技能前失去吊卡技，技能用尽则补1张牌，吊卡技不失效：";
        for (let i of lib.lit.dkSkills) {
            str += '<li>' + get.translation(i);
        }
        return str;
    },
    lit_yibandelajitong(player) {
        return `（${player.storage.lit_yibandelajitong}次后失效）获得所有从判定区弃置的牌`;
    }
};

export const pinyins = {};
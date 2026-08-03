import { lib, game, ui, get, ai, _status } from '../shared.js';

export const sort = 'jbs';

export const character = {
    'lit_zhongyutong9钟雨桐': {
        sex: "female",
        group: "nine",
        hp: 3,
        skills: ["lit_jinshan", "lit_cidi", "lit_danchun"],
        groupInGuozhan: "nine",
    },
};

export const skill = {
    lit_jinshan: {
        group: ["lit_jinshan_die"],
        trigger: {
            player: "phaseDiscardBefore",
        },
        frequent: (event, player) => {
            return player.needsToDiscard();
        },
        filter: (event, player) => {
            // 如果跳过出牌阶段，可以发动
            if (player.getHistory('skipped').includes('phaseUse')) return true;

            // 检查本回合是否使用过杀
            const history = player.getAllHistory('useCard');
            for (const evt of history) {
                if (evt.card.name === 'sha' && evt.isPhaseUsing()) {
                    return false;
                }
            }
            return true;
        },
        async content(event, trigger, player) {
            trigger.cancel();
        },
        ai: {
            nodiscard: true,
            threaten: 0.7,
            effect: {
                player: (card, player) => {
                    if (get.tag(card, "skip") === "phaseUse") {
                        return [1, 1];
                    }
                },
            },
        },
        subSkill: {
            die: {
                trigger: {
                    player: "die",
                },
                forced: true,
                forceDie: true,
                logTarget: "source",
                skillAnimation: true,
                animationColor: "wood",
                async content(event, trigger, player) {
                    game.countPlayer(async (current) => {
                        if (current !== player && current.isAlive()) {
                            await current.loseHp();
                        }
                    });
                },
                ai: {
                    threaten: 0.9,
                },
                sub: true,
                sourceSkill: "lit_jinshan",
            },
        },
    },
    lit_danchun: {
        enable: "phaseUse",
        usable: 1,
        filter: (event, player) => {
            return game.hasPlayer(target =>
                target !== player && target.countCards('h') > 0
            );
        },
        filterTarget: (card, player, target) => {
            return target !== player && target.countCards('h') > 0;
        },
        async content(event, trigger, player) {
            lib.lit.aiGuard.record(player, 'lit_danchun');
            const target = event.targets[0];
            const handCards = target.getCards('h');

            // 显示目标手牌
            const dialog = ui.create.dialog(get.prompt2('lit_danchun'), handCards, 'hidden');

            // 选择红桃牌
            const result = await player.chooseButton(dialog,
                (button) => get.value(button.link),
                (button) => get.suit(button.link) === 'heart'
            ).forResult();

            if (!result.bool) {
                dialog.close();
                return;
            }
            const selectedCard = result.links[0];

            // 选择操作
            const { control } = await player.chooseControl(['拿走', '置于牌堆顶', '取消', '返回'])
                .set("prompt", "【单纯】")
                .set("prompt2", `选择对${get.translation(selectedCard)}的操作`)
                .set("ai", () => {
                    if (get.attitude(player, target) < 0) {
                        let nextPlayer = player.nextSeat;
                        if (get.attitude(player, nextPlayer) > 0 && nextPlayer.hasJudge('lebu')) return '置于牌堆顶';
                        return '拿走';
                    }
                    return '取消';
                }).forResult();

            dialog.close();
            if (control === '置于牌堆顶') {
                await player.showCards(selectedCard, '置于牌堆顶');
                await target.lose(selectedCard, ui.cardPile, 'insert', 'visible');
                game.log(player, '将', selectedCard, '置于牌堆顶');
            } else if (control === '拿走') {
                await player.showCards(selectedCard, get.translation(player) + '拿走');
                await player.gain(selectedCard);
                game.log(player, '获得了', selectedCard);
            } else if (control === '返回') {
                // 返回，重新开始
                event.goto(0);
            }
        },
        ai: {
            threaten: 1.5,
            result: {
                target: (player, target) => {
                    return -target.countCards('h') - target.countCards('h', card => get.suit(card) === 'heart') * 0.3;
                },
                player: (player) => {
                    return player.countCards('h') < 3 ? 1 : 0.5;
                },
            },
            order: (item, player) => lib.lit.aiGuard.blocked(player, 'lit_danchun') ? -1 : 10,
            expose: 0.4,
            effect: {
                target: (card, player, target) => {
                    if (target.countCards('h', card => get.suit(card) === 'heart') > 0) {
                        return [1, -0.3];
                    }
                    if (target.countCards('h') > 0 && get.tag(card, 'loseCard')) {
                        return [1, 0.2];
                    }
                },
            },
        },
    },
    lit_cidi: {
        trigger: {
            player: "loseAfter",
            global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        frequent: true,
        preHidden: true,
        filter: (event, player) => {
            if (player === _status.currentPhase) return false;
            if (event.name === "gain" && event.player === player) return false;
            const evt = event.getl(player);
            return evt && evt.cards2 && evt.cards2.length > 0;
        },
        async content(event, trigger, player) {
            const judge = player.judge((card) => {
                // 点数不为1则通过，可以存储
                if (get.number(card) !== 1) return 2;
                return -1;
            });
            judge.judge2 = (result) => result.bool;

            if (get.mode() !== "guozhan") {
                judge.callback = lib.skill.lit_cidi.callback;
                return void (await judge);
            }

            const { result } = await judge;
            if (!result.bool || get.position(result.card) !== "d") {
                return;
            }

            const card = result.card;
            const { bool } = await player.chooseBool(
                `是否将${get.translation(card)}作为"第"置于武将牌上？`
            ).set("ai", () => true).forResult();
            if (!bool) return;

            const addToExpansion = player.addToExpansion(card, "gain2");
            addToExpansion.gaintag.add("lit_cidi");
            await addToExpansion;
        },
        async callback(event, trigger, player) {
            if (!event.judgeResult.bool) {
                return;
            }
            const next = player.addToExpansion(event.judgeResult.card, "gain2");
            next.gaintag.add("lit_cidi");
            await next;
        },
        marktext: "第",
        intro: {
            content: "expansion",
            markcount: "expansion",
            mark: (dialog, content, player) => {
                const cards = player.getExpansions("lit_cidi");
                if (cards.length) {
                    dialog.addAuto(cards);
                }
            },
        },
        onremove: (player, skill) => {
            const cards = player.getExpansions(skill);
            if (cards.length) {
                player.loseToDiscardpile(cards);
            }
        },
        group: ["lit_cidi_shun", "lit_cidi_dist"],
        locked: false,
        subSkill: {
            dist: {
                locked: false,
                mod: {
                    globalFrom: (from, to, distance) => {
                        const expansions = from.getExpansions("lit_cidi");
                        let num = distance - expansions.length;
                        if (_status.event.skill === "lit_cidi_one_backup" ||
                            _status.event.skill === "gz_lit_cidi_one_backup") {
                            num++;
                        }
                        return num;
                    },
                },
                sub: true,
                sourceSkill: "lit_cidi",
            },
            shun: {
                enable: "phaseUse",
                filter: (event, player) => {
                    return player.getExpansions("lit_cidi").length > 0 &&
                        event.filterCard({ name: "shunshou" }, player, event);
                },
                chooseButton: {
                    dialog: (event, player) => {
                        const cards = player.getExpansions("lit_cidi");
                        return ui.create.dialog("次第：位次随着这些牌的消耗而上升", cards, "hidden");
                    },
                    filter(button, player) {
                        const card = button.link;
                        if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player)) {
                            return false;
                        }
                        const evt = _status.event.getParent();
                        return evt.filterCard(get.autoViewAs({ name: "shunshou" }, [card]), player, evt);
                    },
                    backup: (links, player) => {
                        lib.lit.aiGuard.record(player, 'lit_cidi_shun');
                        return {
                            selectCard: -1,
                            position: "x",
                            filterCard: card => links && card == links[0],
                            viewAs: { name: "shunshou" },
                            card: links[0],
                        };
                    },
                    prompt: (links, player) => {
                        return `请选择 顺手牵羊（${get.translation(links[0])}）的目标`;
                    },
                },
                ai: {
                    order: (item, player) => lib.lit.aiGuard.blocked(player, 'lit_cidi_shun') ? -1 : 10,
                    result: {
                        player: (player) => {
                            return player.getExpansions("lit_cidi").length - 1;
                        },
                    },
                },
                sub: true,
                sourceSkill: "lit_cidi",
            },
        },
        ai: {
            nodiscard: true,
            nolose: true,
            effect: {
                target: (card, player, target, current) => {
                    if (!target.hasFriend() && !player.hasUnknown()) return;
                    if (_status.currentPhase === target) return;

                    if (card.name !== "shuiyanqijunx" && get.tag(card, "loseCard") && target.countCards("he")) {
                        if (target.hasSkill("ziliang")) return 0.6;
                        return [0.4, Math.max(2, target.countCards("h") * 0.6)];
                    }

                    if (target.isUnderControl(true, player)) {
                        if ((get.tag(card, "respondSha") && target.countCards("h", "sha")) ||
                            (get.tag(card, "respondShan") && target.countCards("h", "shan"))) {
                            if (target.hasSkill("ziliang")) return 0.6;
                            return [0.4, 0.8];
                        }
                    } else if (get.tag(card, "respondSha") || get.tag(card, "respondShan")) {
                        if (get.attitude(player, target) > 0 && card.name === "juedou") return;
                        if (get.tag(card, "damage") && target.hasSkillTag("maixie")) return;
                        if (target.countCards("h") === 0) return 2;
                        if (target.hasSkill("ziliang")) return 0.6;
                        if (get.mode() === "guozhan") return 0.4;
                        return [0.4, Math.max(
                            target.countCards("h") / 4,
                            target.countCards("h", "sha") + target.countCards("h", "shan")
                        )];
                    }
                },
            },
            threaten: (player, target) => {
                if (target.countCards("h") === 0) return 2;
                return 0.6;
            },
        },
    },
};

export const translate = {
    'lit_zhongyutong9钟雨桐': "9钟雨桐",
    'lit_zhongyutong9钟雨桐_prefix': "9",
    "lit_jinshan": "尽善",
    "lit_jinshan_info": "若你在出牌阶段没有使用过“杀”，则你可以跳过弃牌阶段；锁定技；死亡时<span class='redtext' style='color:Red'>所有人</span>-1点体力。",
    "lit_danchun": "单纯",
    "lit_danchun_info": "出牌阶段限1次，你可以观看其他1人手牌并可以将其1张♥️牌拿走或放至牌堆顶。",
    "lit_cidi": "次第",
    "lit_cidi_info": "当你在回合外失去牌时，可以判定：<span class='redtext' style='color:Red'>不为A</span>则将判定牌明置在你的人物牌上称为“第”，你的“第”可作顺手牵羊使用。锁定技；你与他人计算的距离-“第”数。",
};

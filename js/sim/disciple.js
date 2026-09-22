/* 弟子：六维/灵根/特质 + 五需求 + 心境 + 境界修行状态机。
   杂役：干活 + 闲时吐纳，练气圆满可择典筑基。
   修士：不干活，打坐纳气、破境冲关、吃饭睡觉。 */
(function (X) {
  const SUR = '墨云顾沈白叶楚陆秦苏';
  const GIV = ['拙言', '守一', '青芜', '望舒', '知秋', '抱朴', '无咎', '拾遗', '云深', '听松', '见山', '归晚', '拂霜', '枕流', '停云', '鹤鸣'];
  const TRAITS = {
    diligent: { n: '勤快', work: 1.15 }, lazy: { n: '怠惰', work: 0.85 },
    sleepy: { n: '贪睡', sleepUse: 1.3 }, ironbelly: { n: '耐饥', hungerUse: 0.8 },
    foodie: { n: '馋嘴', mealBias: 1.5 }, greenhand: { n: '木灵', gatherWood: 1.4 },
    stonekin: { n: '石肤', gatherStone: 1.4 }, chatty: { n: '话痨', social: 1.4 },
    quiet: { n: '喜静', social: 0.7 }, tough: { n: '皮糙', hp: 1.3 },
    daochi: { n: '道痴', cult: 1.15 }, leyi: { n: '乐逸', mood: 1.2 },
  };
  const D = { list: [], nextId: 1, SPEED: 0.09 };

  D.gen = function (x, y) {
    const r = X.rng;
    const traits = r.shuffle(Object.keys(TRAITS)).slice(0, 2);
    const age = r.i(18, 30);
    const d = {
      id: D.nextId++, kind: '杂役',
      name: r.pick(SUR.split('')) + r.pick(GIV),
      stats: { li: r.i(35, 90), gu: r.i(35, 90), shen: r.i(35, 90), wu: r.i(35, 90), mei: r.i(35, 90), qi: r.i(35, 90) },
      linggen: r.i(0, 4),
      traits,
      skills: { farm: 0, cook: 0, build: 0, gather: 0 },
      px: x + 0.5, py: y + 0.5, x, y,
      needs: { hunger: 80, sleep: 85, comfort: 70, beauty: 65, social: 70 },
      mood: 70, moodEv: 0, hp: 100,
      task: null, bed: 0, carry: null,
      state: '闲',
      // P2 修行
      realm: 0, stage: 0, exp: 0, scId: '',
      eligible: false, readyDay: 0, breakCd: 0, failPity: 0, cultSpot: 0,
      bornDay: X.Time.day - age * 360,
      // P3 百艺
      craft: { dan: 0, qi: 0, fu: 0 }, buffs: [], artifact: 0, hpMaxBuff: 0, lifeBuff: 0,
    };
    return d;
  };

  D.add = function (x, y) {
    if (D.list.length >= 12) return null;
    const d = D.gen(x, y);
    D.list.push(d);
    const bed = X.Build.freeBed();
    if (bed) { bed.sleeper = d.id; d.bed = bed.id; }
    return d;
  };

  D.hasTrait = (d, k) => d.traits.indexOf(k) >= 0;
  D.workSpeed = d => (1 + d.skills.build * 0.07 + d.stats.li / 400) * (D.hasTrait(d, 'diligent') ? 1.15 : D.hasTrait(d, 'lazy') ? 0.85 : 1);
  D.maxHp = d => (X.Cult ? X.Cult.maxHp(d) : (D.hasTrait(d, 'tough') ? 130 : 100)) + (d.hpMaxBuff || 0) + (X.Craft ? X.Craft.artMods(d).hp : 0);

  // ---- 行走 ----
  function walkStep(d) {
    const p = d.task && d.task.path;
    if (!p || !p.length) return true;
    const [tx, ty] = p[0];
    const cx = tx + 0.5, cy = ty + 0.5;
    const dx = cx - d.px, dy = cy - d.py;
    const dist = Math.hypot(dx, dy);
    if (dist <= D.SPEED) {
      d.px = cx; d.py = cy; d.x = tx; d.y = ty;
      p.shift();
      return p.length === 0;
    }
    d.px += dx / dist * D.SPEED; d.py += dy / dist * D.SPEED;
    d.x = d.px | 0; d.y = d.py | 0;
    return false;
  }
  function setPath(d, tx, ty) {
    const path = X.Path.find(d.x, d.y, tx, ty);
    d.task.path = path || [];
    return !!path;
  }

  // ---- 进食 / 睡眠 ----
  function startEat(d) {
    let item = null;
    if (X.Inv.count('meal') > 0 && X.Inv.take('meal', 1)) item = 'meal';
    else if (X.Inv.count('grain') >= 2 && X.Inv.take('grain', 2)) item = 'grain2';
    if (!item) return false;
    if (d.task && d.task.job) X.Work.release(d.task.job, d);
    d.task = { type: 'eat', item, phase: 'go', timer: 120, store: null };
    const st = X.Inv.nearestStore(d.x, d.y);
    if (st) { d.task.tx = st.x; d.task.ty = st.y; setPath(d, st.x, st.y); }
    else { d.task.phase = 'do'; d.task.path = []; }
    d.state = '用饭';
    return true;
  }
  function finishEat(d) {
    const it = X.Items[d.task.item === 'grain2' ? 'grain' : d.task.item];
    const mult = d.task.item === 'meal' ? (D.hasTrait(d, 'foodie') ? 1.1 : 1) : 1;
    d.needs.hunger = Math.min(100, d.needs.hunger + (it.food || 30) * (d.task.item === 'grain2' ? 1.9 : 1) * mult);
    if (d.task.item === 'meal') { d.moodEv += 3 + (d.skills.cook >= 5 ? 2 : 0); X.Game.stats.mealsEaten++; }
    else d.moodEv += (it.rawMood || 0) + (D.hasTrait(d, 'foodie') ? -3 : 0);
    d.task = null; d.state = '闲';
  }
  function startSleep(d) {
    if (d.task && d.task.job) X.Work.release(d.task.job, d);
    const bed = d.bed ? X.Build.inst[d.bed] : null;
    d.task = { type: 'sleep', phase: bed ? 'go' : 'do', timer: 0, bed };
    if (bed) { d.task.tx = bed.x; d.task.ty = bed.y; setPath(d, bed.x, bed.y); }
    else d.task.path = [];
    d.state = '安眠';
  }
  const isNight = () => { const s = X.Time.shichen; return s >= 11 || s <= 2; };

  // ---- 修行任务 ----
  function startCultivate(d) {
    const spot = X.Cult.spotFor(d);
    if (!spot) {
      if (!d._noSpotLog) { X.Game.log(`${d.name} 无处打坐（需蒲团或寒玉席）`); d._noSpotLog = true; }
      d.state = '出关';
      return false;
    }
    d._noSpotLog = false;
    d.cultSpot = spot.id;
    d.task = { type: 'cultivate', phase: 'go' };
    d.task.tx = spot.x; d.task.ty = spot.y;
    setPath(d, spot.x, spot.y);
    d.state = '赴静室';
    return true;
  }
  function startBreak(d) {
    if (!d.cultSpot || !X.Build.inst[d.cultSpot]) {
      if (!startCultivate(d)) return false;
    }
    const spot = X.Build.inst[d.cultSpot];
    d.task = { type: 'break', phase: 'go', timer: 300 };
    d.task.tx = spot.x; d.task.ty = spot.y;
    setPath(d, spot.x, spot.y);
    d.state = '赴冲关';
    return true;
  }
  function startCraft(d, order) {
    const st = X.Build.inst[order.station];
    if (!st) { X.Craft.releaseOrder(order); return false; }
    const r = X.Recipes.byId[order.rid];
    d.task = { type: 'craft', phase: 'go', order: order.id, timer: r.work, art: order.art };
    d.task.tx = st.x; d.task.ty = st.y;
    setPath(d, st.x, st.y);
    d.state = '赴' + ({ dan: '丹房', qi: '器坊', fu: '符案' })[order.art];
    return true;
  }

  // ---- 任务执行 ----
  function completeTask(d) {
    const t = d.task, G = X.Game;
    switch (t.type) {
      case 'chop': {
        const n = Math.round(8 * (D.hasTrait(d, 'greenhand') ? 1.4 : 1));
        d.carry = { item: 'wood', n };
        X.Map.setTile(t.tx, t.ty, X.Map.TERRAIN.GRASS);
        const fi = G.forest.findIndex(p => p[0] === t.tx && p[1] === t.ty);
        if (fi >= 0) G.forest.splice(fi, 1);
        d.skills.gather += 0.3;
        beginStore(d);
        break;
      }
      case 'mine': {
        const n = Math.round(6 * (D.hasTrait(d, 'stonekin') ? 1.4 : 1));
        d.carry = { item: 'stone', n };
        X.Map.setTile(t.tx, t.ty, X.Map.TERRAIN.SOIL);
        const ri = G.rocks.findIndex(p => p[0] === t.tx && p[1] === t.ty);
        if (ri >= 0) G.rocks.splice(ri, 1);
        d.skills.gather += 0.3;
        beginStore(d);
        break;
      }
      case 'harvest': {
        const b = X.Build.inst[t.bid];
        if (b) {
          const y = X.Farm.harvest(b);
          d.carry = { item: y.item, n: y.n };
          d.skills.farm += 0.4;
          G.stats.harvests++;
        }
        beginStore(d);
        break;
      }
      case 'sow': {
        const b = X.Build.inst[t.bid];
        if (b) { X.Farm.plant(b); d.skills.farm += 0.2; }
        d.task = null; d.state = '闲';
        break;
      }
      case 'build': {
        const b = X.Build.inst[t.bid];
        if (b && !b.built) {
          X.Build.work(b, 26 * D.workSpeed(d));
          d.skills.build += 0.15;
          if (!b.built) { t.timer = 20; return; }
        }
        d.task = null; d.state = '闲';
        break;
      }
      case 'cook': {
        X.Inv.add('meal', 2);
        d.skills.cook += 0.5; G.stats.mealsCooked += 2;
        d.task = null; d.state = '闲';
        break;
      }
      case 'sulk': {
        d.task = null; d.state = '闲';
        break;
      }
    }
  }
  function beginStore(d) {
    const st = X.Inv.nearestStore(d.x, d.y);
    d.state = '归仓';
    if (!st) {
      if (d.carry) { X.Inv.add(d.carry.item, d.carry.n); d.carry = null; }
      d.task = null; d.state = '闲';
      return;
    }
    d.task = { type: 'store', phase: 'go', tx: st.x, ty: st.y };
    setPath(d, st.x, st.y);
  }

  // ---- 每 tick 更新 ----
  D.update = function (d) {
    if (d.travel) return;   // 游历在外：状态冻结（离山）
    const N = d.needs;
    const winter = X.Time.season === 3 ? 0.7 : 1;
    N.hunger -= 0.030 * winter * (D.hasTrait(d, 'ironbelly') ? 0.8 : 1);
    if (d.task && d.task.type === 'sleep') N.sleep += 0.052;
    else N.sleep -= (0.033 * winter) * (D.hasTrait(d, 'sleepy') ? 1.3 : 1);
    N.comfort = Math.max(0, N.comfort - 0.006);
    N.beauty = Math.max(0, N.beauty - 0.006);
    N.social = Math.max(0, N.social - 0.008);
    for (const k in N) N[k] = Math.max(0, Math.min(100, N[k]));

    // 杂役闲时吐纳
    if (d.kind === '杂役' && X.Cult) X.Cult.gain(d, X.Cult.passiveGain(d));

    // 丹药/符箓自动服用（每时辰一次尝试，先于进食判定）
    if (X.Craft && X.Tick.count % X.Time.TICKS_PER_SHICHEN === 0) X.Craft.autoConsume(d);

    // 生存优先级（饿极可唤醒睡者）
    if (!d.task || (d.task.type !== 'sleep' && d.task.type !== 'eat')) {
      if (N.hunger < 30) { startEat(d); }
      else if (N.sleep < 32 && isNight()) { startSleep(d); }
    } else if (d.task.type === 'sleep' && N.hunger < 15) {
      startEat(d);
    }

    if (X.Tick.count % 30 === 0) environment(d);
    if (X.Tick.count % X.Time.TICKS_PER_SHICHEN === 0) mood(d);
    if (N.hunger <= 0.5) d.hp -= 0.02;
    else if (N.hunger > 60 && d.hp < D.maxHp(d)) d.hp += 0.004;
    if (d.hp <= 0) { X.Game.kill(d, '饿殒'); return; }

    // 状态机
    const t = d.task;
    if (!t) {
      if (d.kind === '修士') {
        // 妖兽/犯山 > 冲关 > 百艺委托 > 打坐
        if (X.Combat && X.Combat.threat() && d.hp > X.Disciple.maxHp(d) * 0.35) {
          d.task = { type: 'fight', phase: 'go' };
          d.state = '迎敌';
        }
        else if ((d.realm === 1 && d.eligible && d.scId) || (d.realm >= 2 && X.Realms.atCap(d))) startBreak(d);
        else {
          const order = X.Craft ? X.Craft.claim(d) : null;
          if (order) startCraft(d, order);
          else startCultivate(d);
        }
      } else if (d.eligible && d.scId) {
        startBreak(d);   // 择典已毕的杂役：冲关筑基
      } else {
        // 杂役不参战：妖兽近身则弃活避险
        if (X.Combat && X.Combat.threat()) {
          const bs = X.Combat.nearestBeast(d);
          if (bs && Math.hypot(bs.x - d.px, bs.y - d.py) < 4 && d.task && d.task.job) {
            X.Work.release(d.task.job, d);
            d.task = null;
            d.moodEv -= 2;
          }
        }
        d.state = '闲';
      }
      return;
    }
    if (t.phase === 'go') {
      if (walkStep(d)) {
        t.phase = 'do';
        t.timer = t.timer || workTicks(d, t);
      }
      return;
    }
    switch (t.type) {
      case 'sleep': {
        d.state = '安眠';
        if (N.sleep >= 96 || (!isNight() && N.sleep > 60)) {
          d.task = null; d.state = '闲';
          if (!t.bed) d.moodEv -= 2;
        }
        break;
      }
      case 'eat': {
        d.state = '用饭';
        if (--t.timer <= 0) finishEat(d);
        break;
      }
      case 'store': {
        if (d.carry) {
          const real = X.Inv.add(d.carry.item, d.carry.n);
          if (real < d.carry.n) X.Game.log(`${d.name} 归仓受阻：${X.Items[d.carry.item].name} 已满`);
          d.carry = null;
        }
        d.task = null; d.state = '闲';
        break;
      }
      case 'cultivate': {
        d.state = '打坐';
        X.Cult.gain(d, X.Cult.rate(d));
        if ((d.realm === 1 && d.eligible && d.scId) || (d.realm >= 2 && X.Realms.atCap(d))) d.task = null;   // 转冲关
        break;
      }
      case 'break': {
        d.state = '冲关';
        if (--t.timer <= 0) {
          const r = X.Cult.attempt(d);
          d.task = null;
          if (!r.ok && r.why === '未择典') d.state = '待择典';
        }
        break;
      }
      case 'craft': {
        d.state = { dan: '炼丹', qi: '锻器', fu: '画符' }[t.art] || '炼制';
        const order = X.Craft.orders.find(o => o.id === t.order);
        if (!order) { d.task = null; break; }
        if (--t.timer <= 0) {
          X.Craft.finish(order, d, 0);
          d.task = null;
        }
        break;
      }
      case 'fight': {
        d.state = '斗法';
        const r = X.Combat ? X.Combat.discTick(d) : false;
        if (r === 'dead') { d.task = null; return; }   // 阵亡已由 Combat 处理
        if (r === 'go') {
          const tgt = d._fightTgt;
          if (tgt) {
            if (!t.path || !t.path.length || (d._repath | 0) <= X.Tick.count) {
              d._repath = X.Tick.count + 40;
              if (!setPath(d, tgt[0], tgt[1])) d.task = null;   // 无路可达：放弃此敌
            }
            if (t.path && t.path.length) walkStep(d);
          }
          // 目标消失/无敌可战
          if (!tgt || (X.Combat && !X.Combat.threat())) d.task = null;
        }
        else if (!r) d.task = null;   // 战事已毕
        break;
      }
      default: {
        d.state = stateName(t.type);
        if (--t.timer <= 0) {
          completeTask(d);
          if (d.task === null && t.job) X.Work.done(t.job);
          else if (d.task !== null && d.task.type !== t.type && t.job) X.Work.done(t.job);
        }
      }
    }
  };

  function workTicks(d, t) {
    const base = { chop: 60, mine: 80, sow: 34, harvest: 56, cook: 110, cultivate: 0, break: 300 }[t.type] || 60;
    let s = D.workSpeed(d);
    if ((t.type === 'chop' || t.type === 'mine') && d.skills.gather > 3) s *= 1.15;
    return Math.max(12, base / s);
  }
  function stateName(type) {
    return { chop: '伐木', mine: '采石', sow: '播种', harvest: '收割', build: '营建', cook: '炊事' }[type] || '劳作';
  }

  function environment(d) {
    let comfort = 0, beauty = 0, rad = 5;
    X.Build.each(b => {
      if (!b.built || !b.def.tags) return;
      const dist = Math.hypot(b.x - d.px, b.y - d.py);
      if (dist > rad) return;
      if (b.def.tags.comfort) comfort += b.def.tags.comfort;
      if (b.def.tags.beauty) beauty += b.def.tags.beauty;
    });
    const cold = X.Solar.buff.cold && X.Solar.buff.until > X.Time.day ? 0.5 : 1;
    d.needs.comfort = Math.min(100, d.needs.comfort + 0.35 * Math.min(4, comfort) * cold);
    d.needs.beauty = Math.min(100, d.needs.beauty + 0.3 * Math.min(5, beauty));
    let near = 0;
    for (const o of D.list) if (o !== d && !o.dead && Math.hypot(o.px - d.px, o.py - d.py) < 6) near++;
    if (near) d.needs.social = Math.min(100, d.needs.social + 0.5 * near * (D.hasTrait(d, 'chatty') ? 1.4 : D.hasTrait(d, 'quiet') ? 0.7 : 1));
  }

  function mood(d) {
    const N = d.needs;
    d.moodEv *= 0.7;
    // 清心阵：阵中心境渐复
    if (X.Form && X.Form.moodRegenAt(d.px | 0, d.py | 0)) d.moodEv += 1.2;
    let m = 40
      + (N.hunger - 50) * 0.20 + (N.sleep - 50) * 0.20
      + (N.comfort - 50) * 0.12 + (N.beauty - 50) * 0.12 + (N.social - 50) * 0.08
      + d.moodEv;
    if (D.hasTrait(d, 'leyi')) m += 6;
    if (D.hasTrait(d, 'daochi') && d.task && d.task.type === 'cultivate') m += 4;
    d.mood = Math.max(0, Math.min(100, m));
    if (d.mood < 10 && X.rng.chance(0.3)) {
      d.moodEv += 15;
      X.Game.log(`${d.name} 心境郁结，需要休整`);
      if (d.task && d.task.job) X.Work.release(d.task.job, d);
      d.task = { type: 'sulk', phase: 'do', timer: 300, path: [] };
      d.state = '郁结';
    }
  }

  D.takeJob = function (d, job) {
    if (d.kind !== '杂役') return false;
    if (d.task && d.task.job) X.Work.release(d.task.job, d);
    d.task = { type: job.type, job: job.id, phase: 'go', tx: job.tx, ty: job.ty, bid: job.bid, timer: job.timer };
    if (!setPath(d, job.tx, job.ty)) { d.task = null; return false; }
    return true;
  };

  D.snapshot = () => D.list.map(d => ({
    name: d.name, kind: d.kind, stats: { ...d.stats }, linggen: d.linggen, traits: [...d.traits],
    skills: { ...d.skills }, px: d.px, py: d.py, needs: { ...d.needs },
    mood: d.mood, moodEv: d.moodEv, hp: d.hp, bed: d.bed,
    realm: d.realm, stage: d.stage, exp: d.exp, scId: d.scId,
    eligible: d.eligible, readyDay: d.readyDay, breakCd: d.breakCd, failPity: d.failPity,
    cultSpot: d.cultSpot, bornDay: d.bornDay,
    craft: { ...d.craft }, buffs: (d.buffs || []).map(b => ({ ...b })), artifact: d.artifact || 0,
    hpMaxBuff: d.hpMaxBuff || 0, lifeBuff: d.lifeBuff || 0, travel: d.travel || 0,
  }));
  D.restore = function (arr) {
    D.list = []; D.nextId = 1;
    for (const r of arr) {
      const d = D.gen(0, 0);
      Object.assign(d, {
        name: r.name, kind: r.kind || '杂役', stats: r.stats, linggen: r.linggen, traits: r.traits,
        skills: r.skills, px: r.px, py: r.py, x: r.px | 0, y: r.py | 0,
        needs: r.needs, mood: r.mood, moodEv: r.moodEv, hp: r.hp, bed: r.bed, task: null, carry: null,
        realm: r.realm || 0, stage: r.stage || 0, exp: r.exp || 0, scId: r.scId || '',
        eligible: !!r.eligible, readyDay: r.readyDay || 0, breakCd: r.breakCd || 0, failPity: r.failPity || 0,
        cultSpot: r.cultSpot || 0, bornDay: r.bornDay !== undefined ? r.bornDay : X.Time.day - 20 * 360,
        craft: r.craft || { dan: 0, qi: 0, fu: 0 }, buffs: r.buffs || [], artifact: r.artifact || 0,
        hpMaxBuff: r.hpMaxBuff || 0, lifeBuff: r.lifeBuff || 0, travel: 0,
      });
      D.list.push(d);
    }
  };

  X.Disciple = D;
})(globalThis.XIANG);

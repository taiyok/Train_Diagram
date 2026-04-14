/**
 * サンプルダイヤデータ生成スクリプト
 * node scripts/generate-ikebukuro-data.mjs で実行
 *
 * ■ データ収録方針（通過列車仕様）
 * 各路線データには「停車列車」だけでなく、「経路上を通過するすべての列車」を収録する。
 * 例：
 *  - 板橋・十条で見ている人は湘南新宿ラインが通過するのを目撃できる
 *  - 日暮里で見ている人は東北新幹線が通過するのを目撃できる
 *  - 池袋で見ている人はTRAIN SUITE 四季島が東北新幹線路線上で通過するのを目撃できる
 *
 * JSONの stations[] に掲載された駅のうち、列車の timetable[] に含まれない駅は
 * アプリ側で補間（interpolation）され「通過スジ」として描画される（isScheduledStop=false）。
 * 停車駅のみ掲載すればよく、通過駅は列車データに記載不要。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../src/data')

/** 分数 → "HH:MM" 文字列 */
function fmt(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * 停車パターンから列車エントリを生成する
 * @param {string} id - 列車ID
 * @param {string} name - 列車名
 * @param {string} typeId - 種別ID
 * @param {string} dir - "down" | "up"
 * @param {number} baseDep - 始発駅の発車時刻（分）
 * @param {Array<[string, number]>} pattern - [駅名, 始発からの経過分] の配列
 */
function makeTrain(id, name, typeId, dir, baseDep, pattern) {
  const timetable = pattern.map(([station, off], i) => {
    const t = baseDep + off
    if (i === 0) return { station, departure: fmt(t) }
    if (i === pattern.length - 1) return { station, arrival: fmt(t) }
    return { station, arrival: fmt(t), departure: fmt(t + 1) }
  })
  return { id, name, typeId, direction: dir, timetable }
}

/** 複数の発車時刻で列車群を生成 */
function makeTrains(prefix, baseName, typeId, dir, departures, pattern) {
  return departures.map((dep, i) => {
    const h = Math.floor(dep / 60)
    const m = dep % 60
    const timeLabel = `${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}`
    return makeTrain(`${prefix}-${i+1}`, `${baseName}${timeLabel}`, typeId, dir, dep, pattern)
  })
}

// ─── 東武東上線 ───────────────────────────────────────────

const tobuStations = [
  { name: '池袋',     distance: 0.0 },
  { name: '北池袋',   distance: 1.3 },
  { name: '下板橋',   distance: 2.1 },
  { name: '大山',     distance: 3.3 },
  { name: '中板橋',   distance: 4.4 },
  { name: 'ときわ台', distance: 5.6 },
  { name: '上板橋',   distance: 6.9 },
  { name: '東武練馬', distance: 8.2 },
  { name: '下赤塚',   distance: 9.2 },
  { name: '成増',     distance: 10.9 },
  { name: '和光市',   distance: 13.3 },
  { name: '朝霞',     distance: 15.4 },
  { name: '朝霞台',   distance: 17.4 },
  { name: '志木',     distance: 18.7 },
  { name: '柳瀬川',   distance: 20.6 },
  { name: 'みずほ台', distance: 22.1 },
  { name: '鶴瀬',     distance: 24.2 },
  { name: 'ふじみ野', distance: 26.1 },
  { name: '上福岡',   distance: 28.9 },
  { name: '新河岸',   distance: 32.7 },
  { name: '川越',     distance: 36.1 },
  { name: '川越市',   distance: 37.7 },
  { name: '霞ヶ関',   distance: 42.1 },
  { name: '鶴ヶ島',   distance: 45.3 },
  { name: '若葉',     distance: 48.5 },
  { name: '坂戸',     distance: 51.2 },
  { name: '北坂戸',   distance: 53.8 },
  { name: '高坂',     distance: 56.6 },
  { name: '東松山',   distance: 59.4 },
  { name: '森林公園', distance: 63.3 },
  { name: 'つきのわ', distance: 67.5 },
  { name: '武蔵嵐山', distance: 71.4 },
  { name: '小川町',   distance: 75.6 },
]

const tobuTypes = [
  { id: 'tj-liner',      name: 'TJライナー', color: '#E07B00', lineWidth: 3.0, emoji: '🚃' },
  { id: 'rapid-express', name: '快速急行',   color: '#1A237E', lineWidth: 2.5, emoji: '🚇' },
  { id: 'express',       name: '急行',       color: '#C62828', lineWidth: 2.5, emoji: '🚋' },
  { id: 'semi-express',  name: '準急',       color: '#2E7D32', lineWidth: 2.0, emoji: '🚃' },
  { id: 'local',         name: '普通',       color: '#1565C0', lineWidth: 1.5, emoji: '🚃' },
]

// 急行下り（池袋→小川町）の停車オフセット
const tobuExpDown = [
  ['池袋',0],['成増',14],['和光市',19],['朝霞台',26],['志木',30],
  ['ふじみ野',40],['川越',51],['川越市',55],['霞ヶ関',63],['鶴ヶ島',68],
  ['坂戸',73],['高坂',80],['東松山',85],['森林公園',92],['小川町',106],
]
// 急行上り（小川町→池袋）
const tobuExpUp = [
  ['小川町',0],['森林公園',13],['東松山',18],['高坂',23],['坂戸',28],
  ['鶴ヶ島',33],['霞ヶ関',37],['川越市',44],['川越',48],['ふじみ野',58],
  ['志木',68],['朝霞台',72],['和光市',78],['成増',83],['池袋',97],
]
// 快速急行下り
const tobuFEDown = [
  ['池袋',0],['和光市',12],['朝霞台',18],['志木',21],['ふじみ野',31],
  ['川越',42],['川越市',46],['霞ヶ関',54],['鶴ヶ島',59],['坂戸',64],
  ['高坂',70],['東松山',75],['森林公園',81],['小川町',95],
]
// 快速急行上り
const tobuFEUp = [
  ['小川町',0],['森林公園',12],['東松山',17],['高坂',22],['坂戸',27],
  ['鶴ヶ島',32],['霞ヶ関',36],['川越市',44],['川越',48],['ふじみ野',59],
  ['志木',68],['朝霞台',72],['和光市',78],['池袋',90],
]
// TJライナー下り（池袋→森林公園止まり）
const tobuTJDown = [
  ['池袋',0],['朝霞台',16],['志木',19],['川越',31],['川越市',35],
  ['坂戸',44],['東松山',50],['森林公園',56],
]
// TJライナー上り
const tobuTJUp = [
  ['小川町',0],['森林公園',14],['東松山',19],['坂戸',26],['川越市',34],
  ['川越',38],['志木',51],['朝霞台',55],['池袋',72],
]
// 準急下り（池袋→川越）
const tobuSEDown = [
  ['池袋',0],['北池袋',2],['下板橋',4],['大山',7],['中板橋',10],
  ['ときわ台',13],['上板橋',16],['東武練馬',19],['下赤塚',22],['成増',25],
  ['和光市',30],['朝霞',34],['朝霞台',38],['志木',42],['柳瀬川',46],
  ['みずほ台',50],['鶴瀬',54],['ふじみ野',58],['上福岡',65],['新河岸',74],['川越',81],
]
// 準急上り（川越→池袋）
const tobuSEUp = [
  ['川越',0],['新河岸',6],['上福岡',15],['ふじみ野',22],['鶴瀬',26],
  ['みずほ台',30],['柳瀬川',34],['志木',38],['朝霞台',42],['朝霞',46],
  ['和光市',50],['成増',55],['下赤塚',60],['東武練馬',64],['上板橋',68],
  ['ときわ台',72],['中板橋',76],['大山',80],['下板橋',83],['北池袋',86],['池袋',89],
]
// 普通下り（池袋→成増）
const tobuLocalDown = [
  ['池袋',0],['北池袋',2],['下板橋',5],['大山',8],['中板橋',11],
  ['ときわ台',14],['上板橋',17],['東武練馬',20],['下赤塚',23],['成増',27],
]
// 普通上り（成増→池袋）
const tobuLocalUp = [
  ['成増',0],['下赤塚',4],['東武練馬',8],['上板橋',12],['ときわ台',16],
  ['中板橋',20],['大山',24],['下板橋',27],['北池袋',30],['池袋',33],
]

// 発車時刻リスト生成（開始〜終了、間隔 分）
function range(start, end, step) {
  const result = []
  for (let t = start; t <= end; t += step) result.push(t)
  return result
}

const tobuTrains = [
  // TJライナー上り（朝：小川町→池袋）
  ...makeTrains('tj-up', 'TJライナー', 'tj-liner', 'up',
    range(5*60+50, 7*60+30, 40), tobuTJUp),
  // TJライナー下り（夕方：池袋→森林公園）
  ...makeTrains('tj-down', 'TJライナー', 'tj-liner', 'down',
    range(17*60+30, 21*60, 30), tobuTJDown),
  // 快速急行下り（終日）
  ...makeTrains('fe-down', '快速急行', 'rapid-express', 'down',
    range(6*60+10, 22*60, 60), tobuFEDown),
  // 快速急行上り（終日）
  ...makeTrains('fe-up', '快速急行', 'rapid-express', 'up',
    range(6*60, 21*60+30, 60), tobuFEUp),
  // 急行下り（終日）
  ...makeTrains('e-down', '急行', 'express', 'down',
    range(6*60, 22*60, 30), tobuExpDown),
  // 急行上り（終日）
  ...makeTrains('e-up', '急行', 'express', 'up',
    range(5*60+50, 22*60, 30), tobuExpUp),
  // 準急下り（終日）
  ...makeTrains('se-down', '準急', 'semi-express', 'down',
    range(6*60, 22*60, 40), tobuSEDown),
  // 準急上り（終日）
  ...makeTrains('se-up', '準急', 'semi-express', 'up',
    range(6*60, 22*60, 40), tobuSEUp),
  // 普通下り（終日）
  ...makeTrains('l-down', '普通', 'local', 'down',
    range(6*60, 22*60, 20), tobuLocalDown),
  // 普通上り（終日）
  ...makeTrains('l-up', '普通', 'local', 'up',
    range(6*60, 22*60, 20), tobuLocalUp),
]

// ─── 西武池袋線 ──────────────────────────────────────────

const seibuStations = [
  { name: '池袋',       distance: 0.0 },
  { name: '椎名町',     distance: 1.9 },
  { name: '東長崎',     distance: 3.0 },
  { name: '江古田',     distance: 4.4 },
  { name: '桜台',       distance: 5.5 },
  { name: '練馬',       distance: 7.1 },
  { name: '中村橋',     distance: 8.2 },
  { name: '富士見台',   distance: 9.3 },
  { name: '練馬高野台', distance: 10.7 },
  { name: '石神井公園', distance: 11.7 },
  { name: '大泉学園',   distance: 14.3 },
  { name: '保谷',       distance: 16.1 },
  { name: 'ひばりヶ丘', distance: 18.0 },
  { name: '東久留米',   distance: 19.8 },
  { name: '清瀬',       distance: 22.1 },
  { name: '秋津',       distance: 24.8 },
  { name: '所沢',       distance: 26.8 },
  { name: '西所沢',     distance: 28.8 },
  { name: '小手指',     distance: 31.4 },
  { name: '狭山ヶ丘',   distance: 33.2 },
  { name: '武蔵藤沢',   distance: 35.2 },
  { name: '稲荷山公園', distance: 37.4 },
  { name: '入間市',     distance: 38.8 },
  { name: '仏子',       distance: 41.1 },
  { name: '元加治',     distance: 42.7 },
  { name: '飯能',       distance: 44.8 },
]

const seibuTypes = [
  { id: 'limited-express', name: '特急',     color: '#C8860A', lineWidth: 3.0, emoji: '🚄' },
  { id: 'express',         name: '急行',     color: '#C62828', lineWidth: 2.5, emoji: '🚋' },
  { id: 'semi-express',    name: '準急',     color: '#2E7D32', lineWidth: 2.0, emoji: '🚃' },
  { id: 'local',           name: '各駅停車', color: '#1565C0', lineWidth: 1.5, emoji: '🚃' },
]

const seibuLtdDown = [['池袋',0],['所沢',28],['飯能',52]]
const seibuLtdUp   = [['飯能',0],['所沢',24],['池袋',52]]
const seibuExpDown = [
  ['池袋',0],['練馬',9],['石神井公園',14],['ひばりヶ丘',22],
  ['所沢',33],['入間市',45],['飯能',55],
]
const seibuExpUp = [
  ['飯能',0],['入間市',10],['所沢',22],['ひばりヶ丘',33],
  ['石神井公園',42],['練馬',48],['池袋',57],
]
const seibuSEDown = [
  ['池袋',0],['椎名町',2],['東長崎',5],['江古田',8],['桜台',11],
  ['練馬',14],['石神井公園',22],['ひばりヶ丘',31],['東久留米',35],
  ['清瀬',39],['秋津',43],['所沢',47],['西所沢',52],['小手指',57],['飯能',76],
]
const seibuSEUp = [
  ['飯能',0],['小手指',19],['西所沢',24],['所沢',28],['秋津',32],
  ['清瀬',36],['東久留米',40],['ひばりヶ丘',44],['石神井公園',53],
  ['練馬',60],['桜台',64],['江古田',67],['東長崎',70],['椎名町',74],['池袋',77],
]
const seibuLocalDown = [
  ['池袋',0],['椎名町',2],['東長崎',5],['江古田',8],['桜台',11],
  ['練馬',14],['中村橋',17],['富士見台',20],['練馬高野台',24],
  ['石神井公園',27],['大泉学園',33],['保谷',38],['ひばりヶ丘',43],
]
const seibuLocalUp = [
  ['ひばりヶ丘',0],['保谷',5],['大泉学園',10],['石神井公園',15],
  ['練馬高野台',19],['富士見台',22],['中村橋',25],['練馬',28],
  ['桜台',31],['江古田',34],['東長崎',38],['椎名町',41],['池袋',44],
]

const seibuTrains = [
  ...makeTrains('ltd-down', '特急むさし', 'limited-express', 'down',
    range(6*60, 22*60, 60), seibuLtdDown),
  ...makeTrains('ltd-up', '特急むさし', 'limited-express', 'up',
    range(6*60, 21*60+30, 60), seibuLtdUp),
  ...makeTrains('e-down', '急行', 'express', 'down',
    range(6*60, 22*60, 30), seibuExpDown),
  ...makeTrains('e-up', '急行', 'express', 'up',
    range(5*60+55, 22*60, 30), seibuExpUp),
  ...makeTrains('se-down', '準急', 'semi-express', 'down',
    range(6*60, 22*60, 35), seibuSEDown),
  ...makeTrains('se-up', '準急', 'semi-express', 'up',
    range(6*60, 22*60, 35), seibuSEUp),
  ...makeTrains('l-down', '各停', 'local', 'down',
    range(6*60, 22*60, 15), seibuLocalDown),
  ...makeTrains('l-up', '各停', 'local', 'up',
    range(6*60, 22*60, 15), seibuLocalUp),
]

// ─── JR埼京線 ────────────────────────────────────────────

const saikyoStations = [
  { name: '大崎',     distance: 0.0 },
  { name: '恵比寿',   distance: 2.6 },
  { name: '渋谷',     distance: 4.6 },
  { name: '新宿',     distance: 8.7 },
  { name: '新大久保', distance: 10.3 },
  { name: '高田馬場', distance: 11.8 },
  { name: '池袋',     distance: 13.8 },
  { name: '板橋',     distance: 15.8 },
  { name: '十条',     distance: 17.1 },
  { name: '赤羽',     distance: 19.2 },
  { name: '北赤羽',   distance: 21.0 },
  { name: '浮間舟渡', distance: 22.7 },
  { name: '戸田公園', distance: 25.2 },
  { name: '戸田',     distance: 26.9 },
  { name: '北戸田',   distance: 28.4 },
  { name: '武蔵浦和', distance: 31.1 },
  { name: '中浦和',   distance: 32.8 },
  { name: '南与野',   distance: 34.0 },
  { name: '与野本町', distance: 35.1 },
  { name: '北与野',   distance: 36.6 },
  { name: '大宮',     distance: 38.1 },
  { name: '日進',     distance: 40.2 },
  { name: '西大宮',   distance: 42.9 },
  { name: '指扇',     distance: 44.9 },
  { name: '南古谷',   distance: 47.2 },
  { name: '川越',     distance: 49.6 },
]

const saikyoTypes = [
  { id: 'shonan-shinjuku', name: '湘南新宿ライン', color: '#007A3D', lineWidth: 2.5, emoji: '🚅' },
  { id: 'commuter-rapid',  name: '通勤快速',       color: '#E56B10', lineWidth: 2.5, emoji: '🚇' },
  { id: 'rapid',           name: '快速',           color: '#2E7D32', lineWidth: 2.0, emoji: '🚋' },
  { id: 'local',           name: '各駅停車',       color: '#1565C0', lineWidth: 1.5, emoji: '🚃' },
  // 貨物列車：山手貨物線（埼京線と同じ線路）を通過するEF65・EH500などの機関車
  // 池袋の旅客ホームには停まらず通過 → タイムテーブルに池袋なし → 補間で通過スジ表示
  { id: 'freight',         name: '貨物列車',       color: '#8B4513', lineWidth: 3.0, emoji: '🚂' },
]

// 貨物列車（大崎〜大宮を通過、池袋は旅客ホームに停まらない）
// 途中の客駅はすべて補間通過スジとして描画される
const freightDown = [
  ['大崎',0], ['大宮',48],
]
const freightUp = [
  ['大宮',0], ['大崎',50],
]

// 湘南新宿ライン（埼京線と同じ軌道を大崎〜大宮で共用）
// 板橋・十条・北赤羽・戸田公園 等 中間の各駅は通過扱い → 補間で通過スジ表示
const shonanDown = [
  ['大崎',0],['恵比寿',4],['渋谷',8],['新宿',16],['池袋',26],
  ['赤羽',37],['武蔵浦和',55],['大宮',66],
]
const shonanUp = [
  ['大宮',0],['武蔵浦和',11],['赤羽',29],
  ['池袋',40],['新宿',48],['渋谷',56],['恵比寿',60],['大崎',64],
]

const saikyoCRDown = [
  ['大崎',0],['恵比寿',4],['渋谷',8],['新宿',16],
  ['池袋',25],['赤羽',36],['武蔵浦和',55],['大宮',66],
  ['日進',72],['西大宮',78],['指扇',83],['南古谷',88],['川越',93],
]
const saikyoCRUp = [
  ['川越',0],['南古谷',5],['指扇',10],['西大宮',15],['日進',20],
  ['大宮',27],['武蔵浦和',38],['赤羽',57],
  ['池袋',69],['新宿',77],['渋谷',85],['恵比寿',89],['大崎',93],
]
const saikyoRapidDown = [
  ['大崎',0],['恵比寿',4],['渋谷',8],['新宿',16],['池袋',26],
  ['板橋',30],['十条',33],['赤羽',37],['北赤羽',41],['浮間舟渡',44],
  ['戸田公園',49],['戸田',52],['北戸田',55],['武蔵浦和',60],
  ['中浦和',64],['南与野',67],['与野本町',70],['北与野',73],['大宮',76],
  ['日進',82],['西大宮',88],['指扇',92],['南古谷',97],['川越',102],
]
const saikyoRapidUp = [
  ['川越',0],['南古谷',5],['指扇',10],['西大宮',14],['日進',19],
  ['大宮',25],['北与野',28],['与野本町',31],['南与野',34],['中浦和',37],
  ['武蔵浦和',41],['北戸田',46],['戸田',49],['戸田公園',52],
  ['浮間舟渡',57],['北赤羽',60],['赤羽',64],['十条',69],['板橋',72],
  ['池袋',76],['新宿',85],['渋谷',93],['恵比寿',97],['大崎',102],
]
const saikyoLocalDown = [
  ['大崎',0],['恵比寿',4],['渋谷',8],['新宿',16],
  ['新大久保',19],['高田馬場',22],['池袋',26],
  ['板橋',30],['十条',33],['赤羽',37],
]
const saikyoLocalUp = [
  ['赤羽',0],['十条',4],['板橋',7],['池袋',11],
  ['高田馬場',15],['新大久保',18],['新宿',21],
  ['渋谷',29],['恵比寿',33],['大崎',37],
]

const saikyoTrains = [
  // 湘南新宿ライン（大崎〜大宮 埼京線軌道共用・通過駅補間表示）
  ...makeTrains('sn-down', '湘南新宿ライン', 'shonan-shinjuku', 'down',
    range(6*60+5, 22*60, 30), shonanDown),
  ...makeTrains('sn-up', '湘南新宿ライン', 'shonan-shinjuku', 'up',
    range(6*60+0, 22*60, 30), shonanUp),
  ...makeTrains('cr-down', '通勤快速', 'commuter-rapid', 'down',
    range(6*60, 22*60, 30), saikyoCRDown),
  ...makeTrains('cr-up', '通勤快速', 'commuter-rapid', 'up',
    range(5*60+50, 22*60, 30), saikyoCRUp),
  ...makeTrains('r-down', '快速', 'rapid', 'down',
    range(6*60, 22*60, 20), saikyoRapidDown),
  ...makeTrains('r-up', '快速', 'rapid', 'up',
    range(5*60+53, 22*60, 20), saikyoRapidUp),
  ...makeTrains('l-down', '各停', 'local', 'down',
    range(6*60, 22*60, 10), saikyoLocalDown),
  ...makeTrains('l-up', '各停', 'local', 'up',
    range(6*60, 22*60, 10), saikyoLocalUp),
  // 貨物列車（EF65・EH500などの機関車）
  // 時刻は実態に基づく参考値。1日数本が不定期に通過
  ...makeTrains('freight-down', '貨物列車', 'freight', 'down',
    [6*60+15, 9*60+40, 13*60+25, 16*60+50, 20*60+10], freightDown),
  ...makeTrains('freight-up', '貨物列車', 'freight', 'up',
    [7*60+30, 11*60+5, 14*60+55, 18*60+20, 21*60+35], freightUp),
]

// ─── 東京メトロ有楽町線 ──────────────────────────────────

const yurakuchoStations = [
  { name: '池袋',       distance: 0.0 },
  { name: '東池袋',     distance: 1.7 },
  { name: '護国寺',     distance: 3.4 },
  { name: '江戸川橋',   distance: 4.5 },
  { name: '飯田橋',     distance: 6.6 },
  { name: '市ヶ谷',     distance: 8.0 },
  { name: '麹町',       distance: 9.2 },
  { name: '永田町',     distance: 10.5 },
  { name: '桜田門',     distance: 12.5 },
  { name: '有楽町',     distance: 13.5 },
  { name: '銀座一丁目', distance: 14.6 },
  { name: '新富町',     distance: 15.5 },
  { name: '月島',       distance: 17.1 },
  { name: '豊洲',       distance: 19.2 },
  { name: '辰巳',       distance: 21.6 },
  { name: '新木場',     distance: 23.8 },
]

const yurakuchoTypes = [
  { id: 'express', name: '急行',     color: '#C7A800', lineWidth: 2.5, emoji: '🚇' },
  { id: 'local',   name: '各駅停車', color: '#7B5F00', lineWidth: 1.5, emoji: '🚃' },
]

const yurakuchoExpDown = [
  ['池袋',0],['護国寺',4],['飯田橋',9],['市ヶ谷',13],['永田町',17],
  ['有楽町',22],['月島',27],['豊洲',32],['新木場',40],
]
const yurakuchoExpUp = [
  ['新木場',0],['豊洲',8],['月島',13],['有楽町',18],['永田町',23],
  ['市ヶ谷',27],['飯田橋',31],['護国寺',36],['池袋',41],
]
const yurakuchoLocalDown = [
  ['池袋',0],['東池袋',2],['護国寺',5],['江戸川橋',8],['飯田橋',12],
  ['市ヶ谷',16],['麹町',19],['永田町',22],['桜田門',26],['有楽町',30],
  ['銀座一丁目',33],['新富町',36],['月島',40],['豊洲',45],['辰巳',49],['新木場',54],
]
const yurakuchoLocalUp = [
  ['新木場',0],['辰巳',5],['豊洲',9],['月島',14],['新富町',18],
  ['銀座一丁目',21],['有楽町',24],['桜田門',28],['永田町',32],['麹町',36],
  ['市ヶ谷',39],['飯田橋',43],['江戸川橋',47],['護国寺',50],['東池袋',54],['池袋',57],
]

const yurakuchoTrains = [
  ...makeTrains('exp-down', '急行', 'express', 'down',
    range(6*60, 22*60, 10), yurakuchoExpDown),
  ...makeTrains('exp-up', '急行', 'express', 'up',
    range(6*60, 22*60, 10), yurakuchoExpUp),
  ...makeTrains('l-down', '各停', 'local', 'down',
    range(6*60, 22*60, 5), yurakuchoLocalDown),
  ...makeTrains('l-up', '各停', 'local', 'up',
    range(6*60, 22*60, 5), yurakuchoLocalUp),
]

// ─── 東北新幹線 ──────────────────────────────────────────

// 日暮里は新幹線の停車駅ではないが車窓から見えるポイントとして掲載
const tohokuStations = [
  { name: '東京',     distance: 0.0 },
  { name: '上野',     distance: 3.6 },
  { name: '日暮里',   distance: 6.2 },   // 新幹線が通過して見えるポイント（停車なし）
  { name: '大宮',     distance: 26.7 },
  { name: '小山',     distance: 80.6 },
  { name: '宇都宮',   distance: 109.5 },
  { name: '那須塩原', distance: 157.8 },
  { name: '新白河',   distance: 185.4 },
  { name: '郡山',     distance: 226.7 },
  { name: '福島',     distance: 272.8 },
  { name: '白石蔵王', distance: 303.6 },
  { name: '仙台',     distance: 351.8 },
]

const tohokuTypes = [
  { id: 'hayabusa',   name: 'はやぶさ',           color: '#C8202D', lineWidth: 3.5, emoji: '🚄' },
  { id: 'yamabiko',   name: 'やまびこ',           color: '#006400', lineWidth: 2.5, emoji: '🚅' },
  { id: 'nasuno',     name: 'なすの',             color: '#1565C0', lineWidth: 2.0, emoji: '🚃' },
  { id: 'shikishima', name: 'TRAIN SUITE 四季島', color: '#1C3144', lineWidth: 3.5, emoji: '✨' },
]

// はやぶさ下り（東京→仙台）速達型
// 日暮里・小山・宇都宮・那須塩原・新白河・郡山・福島・白石蔵王 は通過（補間で表示）
const hayabusaDown = [
  ['東京',0], ['上野',4], ['大宮',15], ['仙台',95],
]
// はやぶさ上り
const hayabusaUp = [
  ['仙台',0], ['大宮',80], ['上野',95], ['東京',99],
]

// やまびこ下り（東京→仙台）主要駅停車
// 日暮里・新白河・白石蔵王 は通過
const yamabikoDown = [
  ['東京',0], ['上野',4], ['大宮',18], ['小山',46],
  ['宇都宮',59], ['那須塩原',86], ['郡山',114], ['福島',136], ['仙台',163],
]
// やまびこ上り
const yamabikoUp = [
  ['仙台',0], ['福島',27], ['郡山',49], ['那須塩原',77],
  ['宇都宮',104], ['小山',117], ['大宮',145], ['上野',159], ['東京',163],
]

// なすの下り（東京→那須塩原）各駅型（東北新幹線内では比較的こまめに停車）
// 日暮里・新白河 は通過
const nasunoDown = [
  ['東京',0], ['上野',4], ['大宮',18], ['小山',48],
  ['宇都宮',63], ['那須塩原',93],
]
// なすの上り
const nasunoUp = [
  ['那須塩原',0], ['宇都宮',30], ['小山',45],
  ['大宮',75], ['上野',89], ['東京',93],
]

// TRAIN SUITE 四季島（上野発、クルーズトレイン）
// 上野を出発し仙台方面へ。全区間にわたって通過駅を補間表示
const shikishimaDown = [
  ['上野',0], ['仙台',125],
]
const shikishimaUp = [
  ['仙台',0], ['上野',125],
]

const tohokuTrains = [
  // はやぶさ下り（終日）
  ...makeTrains('hb-down', 'はやぶさ', 'hayabusa', 'down',
    range(6*60+4, 20*60, 30), hayabusaDown),
  // はやぶさ上り（終日）
  ...makeTrains('hb-up', 'はやぶさ', 'hayabusa', 'up',
    range(6*60+13, 20*60, 30), hayabusaUp),
  // やまびこ下り（終日）
  ...makeTrains('ym-down', 'やまびこ', 'yamabiko', 'down',
    range(6*60+28, 20*60, 60), yamabikoDown),
  // やまびこ上り（終日）
  ...makeTrains('ym-up', 'やまびこ', 'yamabiko', 'up',
    range(6*60+0, 20*60, 60), yamabikoUp),
  // なすの下り（終日）
  ...makeTrains('ns-down', 'なすの', 'nasuno', 'down',
    range(6*60+44, 21*60, 60), nasunoDown),
  // なすの上り（終日）
  ...makeTrains('ns-up', 'なすの', 'nasuno', 'up',
    range(6*60+30, 21*60, 60), nasunoUp),
  // TRAIN SUITE 四季島（特別列車・1日1往復）
  makeTrain('shikishima-down-1', 'TRAIN SUITE 四季島', 'shikishima', 'down', 7*60+20, shikishimaDown),
  makeTrain('shikishima-up-1',   'TRAIN SUITE 四季島', 'shikishima', 'up',   15*60+30, shikishimaUp),
]

// ─── 東京メトロ副都心線 ──────────────────────────────────
// 池袋は中間停車駅（地下ホーム）
// S-TRAIN（西武⇔東急の有料特急）が通過ポイントとして見られる

const fukutoshinStations = [
  { name: '和光市',       distance: 0.0 },
  { name: '地下鉄成増',   distance: 2.4 },
  { name: '地下鉄赤塚',   distance: 4.3 },
  { name: '平和台',       distance: 5.8 },
  { name: '氷川台',       distance: 7.0 },
  { name: '小竹向原',     distance: 9.0 },
  { name: '千川',         distance: 10.4 },
  { name: '要町',         distance: 11.7 },
  { name: '池袋',         distance: 13.0 },
  { name: '雑司が谷',     distance: 14.4 },
  { name: '西早稲田',     distance: 15.8 },
  { name: '東新宿',       distance: 17.5 },
  { name: '新宿三丁目',   distance: 19.0 },
  { name: '北参道',       distance: 20.5 },
  { name: '明治神宮前',   distance: 22.0 },
  { name: '渋谷',         distance: 23.8 },
]

const fukutoshinTypes = [
  // S-TRAINは西武線から小竹向原経由で副都心線に入る有料特急
  // 副都心線内停車駅が少なく、池袋も通過ポイントとして見やすい
  { id: 's-train', name: 'S-TRAIN',   color: '#1C3A6E', lineWidth: 3.0, emoji: '🚆' },
  { id: 'express', name: '急行',      color: '#8B0041', lineWidth: 2.5, emoji: '🚇' },
  { id: 'local',   name: '各駅停車',  color: '#553B8E', lineWidth: 1.5, emoji: '🚃' },
]

// 急行下り（和光市→渋谷）
// 地下鉄成増・地下鉄赤塚・平和台・氷川台・千川・要町・雑司が谷・西早稲田・東新宿・北参道 は通過補間
const fukuExpDown = [
  ['和光市',0], ['小竹向原',10], ['池袋',19], ['新宿三丁目',29], ['明治神宮前',35], ['渋谷',40],
]
// 急行上り
const fukuExpUp = [
  ['渋谷',0], ['明治神宮前',6], ['新宿三丁目',12], ['池袋',22], ['小竹向原',31], ['和光市',41],
]
// 各停下り（全駅）
const fukuLocalDown = [
  ['和光市',0], ['地下鉄成増',4], ['地下鉄赤塚',7], ['平和台',10], ['氷川台',13],
  ['小竹向原',17], ['千川',20], ['要町',23], ['池袋',27], ['雑司が谷',31],
  ['西早稲田',35], ['東新宿',39], ['新宿三丁目',43], ['北参道',47], ['明治神宮前',51], ['渋谷',56],
]
// 各停上り
const fukuLocalUp = [
  ['渋谷',0], ['明治神宮前',5], ['北参道',9], ['新宿三丁目',13], ['東新宿',17],
  ['西早稲田',21], ['雑司が谷',25], ['池袋',29], ['要町',33], ['千川',36],
  ['小竹向原',39], ['氷川台',43], ['平和台',46], ['地下鉄赤塚',49], ['地下鉄成増',52], ['和光市',56],
]
// S-TRAIN下り（小竹向原→渋谷）
// 西武池袋線から小竹向原で副都心線に入る有料特急
// 地下鉄成増〜氷川台・千川・要町・雑司が谷 等は通過補間
const sTrainDown = [
  ['小竹向原',0], ['池袋',9], ['新宿三丁目',19], ['渋谷',25],
]
// S-TRAIN上り
const sTrainUp = [
  ['渋谷',0], ['新宿三丁目',7], ['池袋',17], ['小竹向原',26],
]

const fukutoshinTrains = [
  // S-TRAIN（土休日ダイヤ想定・1時間に1本）
  ...makeTrains('st-down', 'S-TRAIN', 's-train', 'down',
    range(7*60, 21*60, 60), sTrainDown),
  ...makeTrains('st-up', 'S-TRAIN', 's-train', 'up',
    range(7*60+30, 21*60, 60), sTrainUp),
  // 急行（終日・10分間隔）
  ...makeTrains('exp-down', '急行', 'express', 'down',
    range(6*60, 22*60, 10), fukuExpDown),
  ...makeTrains('exp-up', '急行', 'express', 'up',
    range(6*60, 22*60, 10), fukuExpUp),
  // 各停（終日・5分間隔）
  ...makeTrains('l-down', '各停', 'local', 'down',
    range(6*60, 22*60, 5), fukuLocalDown),
  ...makeTrains('l-up', '各停', 'local', 'up',
    range(6*60, 22*60, 5), fukuLocalUp),
]

// ─── JR山手線 ─────────────────────────────────────────────
// 環状線のため大崎〜品川（内回り方向順）を1路線として表現
// 内回り = down（大崎→渋谷→新宿→池袋→上野→東京→品川）
// 外回り = up （品川→東京→上野→池袋→新宿→渋谷→大崎）

const yamanoteStations = [
  { name: '大崎',           distance: 0.0 },
  { name: '五反田',         distance: 1.5 },
  { name: '目黒',           distance: 3.0 },
  { name: '恵比寿',         distance: 4.5 },
  { name: '渋谷',           distance: 5.9 },
  { name: '原宿',           distance: 7.3 },
  { name: '代々木',         distance: 8.7 },
  { name: '新宿',           distance: 10.0 },
  { name: '新大久保',       distance: 11.3 },
  { name: '高田馬場',       distance: 12.6 },
  { name: '目白',           distance: 13.9 },
  { name: '池袋',           distance: 15.2 },
  { name: '大塚',           distance: 16.9 },
  { name: '巣鴨',           distance: 18.1 },
  { name: '駒込',           distance: 19.3 },
  { name: '田端',           distance: 20.8 },
  { name: '西日暮里',       distance: 21.9 },
  { name: '日暮里',         distance: 22.9 },
  { name: '鶯谷',           distance: 23.9 },
  { name: '上野',           distance: 24.9 },
  { name: '御徒町',         distance: 26.0 },
  { name: '秋葉原',         distance: 27.1 },
  { name: '神田',           distance: 28.2 },
  { name: '東京',           distance: 29.4 },
  { name: '有楽町',         distance: 30.5 },
  { name: '新橋',           distance: 31.8 },
  { name: '浜松町',         distance: 33.2 },
  { name: '田町',           distance: 34.7 },
  { name: '高輪ゲートウェイ', distance: 35.8 },
  { name: '品川',           distance: 37.0 },
]

const yamanoteTypes = [
  { id: 'yamanote', name: '山手線', color: '#9ACD32', lineWidth: 2.0, emoji: '🔄' },
]

// 内回り（全駅停車・大崎→品川）
const yamanoteInner = [
  ['大崎',0],['五反田',2],['目黒',5],['恵比寿',7],['渋谷',10],
  ['原宿',13],['代々木',15],['新宿',18],['新大久保',20],['高田馬場',22],
  ['目白',24],['池袋',26],['大塚',29],['巣鴨',31],['駒込',34],
  ['田端',37],['西日暮里',39],['日暮里',41],['鶯谷',43],['上野',46],
  ['御徒町',48],['秋葉原',50],['神田',52],['東京',55],['有楽町',57],
  ['新橋',60],['浜松町',63],['田町',66],['高輪ゲートウェイ',69],['品川',72],
]
// 外回り（全駅停車・品川→大崎）
const yamanoteOuter = [
  ['品川',0],['高輪ゲートウェイ',4],['田町',7],['浜松町',9],['新橋',12],
  ['有楽町',15],['東京',17],['神田',19],['秋葉原',21],['御徒町',24],
  ['上野',26],['鶯谷',29],['日暮里',31],['西日暮里',33],['田端',35],
  ['駒込',38],['巣鴨',40],['大塚',43],['池袋',46],['目白',48],
  ['高田馬場',50],['新大久保',52],['新宿',54],['代々木',57],['原宿',59],
  ['渋谷',62],['恵比寿',66],['目黒',68],['五反田',71],['大崎',73],
]

const yamanoteTrains = [
  // 内回り（終日・4分間隔）
  ...makeTrains('inner', '内回り', 'yamanote', 'down',
    range(6*60, 22*60, 4), yamanoteInner),
  // 外回り（終日・4分間隔）
  ...makeTrains('outer', '外回り', 'yamanote', 'up',
    range(6*60, 22*60, 4), yamanoteOuter),
]

// ─── JSON書き出し ────────────────────────────────────────

const files = [
  {
    path: path.join(dataDir, 'tobu-tojo-line.json'),
    data: { lineName: '東武東上線', stations: tobuStations, trainTypes: tobuTypes, trains: tobuTrains },
  },
  {
    path: path.join(dataDir, 'seibu-ikebukuro-line.json'),
    data: { lineName: '西武池袋線', stations: seibuStations, trainTypes: seibuTypes, trains: seibuTrains },
  },
  {
    path: path.join(dataDir, 'jr-saikyo-line.json'),
    data: { lineName: 'JR埼京線', stations: saikyoStations, trainTypes: saikyoTypes, trains: saikyoTrains },
  },
  {
    path: path.join(dataDir, 'metro-yurakucho-line.json'),
    data: { lineName: '東京メトロ有楽町線', stations: yurakuchoStations, trainTypes: yurakuchoTypes, trains: yurakuchoTrains },
  },
  {
    path: path.join(dataDir, 'tohoku-shinkansen.json'),
    data: { lineName: '東北新幹線', stations: tohokuStations, trainTypes: tohokuTypes, trains: tohokuTrains },
  },
  {
    path: path.join(dataDir, 'metro-fukutoshin-line.json'),
    data: { lineName: '東京メトロ副都心線', stations: fukutoshinStations, trainTypes: fukutoshinTypes, trains: fukutoshinTrains },
  },
  {
    path: path.join(dataDir, 'jr-yamanote-line.json'),
    data: { lineName: 'JR山手線', stations: yamanoteStations, trainTypes: yamanoteTypes, trains: yamanoteTrains },
  },
]

for (const { path: fp, data } of files) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✓ ${path.basename(fp)} (${data.trains.length} 列車)`)
}

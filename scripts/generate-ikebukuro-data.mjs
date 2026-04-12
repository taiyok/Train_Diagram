/**
 * 池袋4路線の全日ダイヤデータ生成スクリプト
 * node scripts/generate-ikebukuro-data.mjs で実行
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
  { id: 'commuter-rapid', name: '通勤快速', color: '#E56B10', lineWidth: 2.5, emoji: '🚇' },
  { id: 'rapid',          name: '快速',     color: '#2E7D32', lineWidth: 2.0, emoji: '🚋' },
  { id: 'local',          name: '各駅停車', color: '#1565C0', lineWidth: 1.5, emoji: '🚃' },
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
]

for (const { path: fp, data } of files) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✓ ${path.basename(fp)} (${data.trains.length} 列車)`)
}

import { ILine } from './models/StationAPI';

export enum MarkShape {
  round,
  reversedRound,
  square,
  reversedSquare,
}

export interface ILineMark {
  shape: MarkShape;
  sign: string;
  signBlackText?: boolean;
  subSign?: string;
  subSignBlackText?: boolean;
  signPath?: any;
  subSignPath?: any;
}

export const getLineMark = (line: ILine): ILineMark | null => {
  switch (line.id) {
    // 省略されたJR
    case '0':
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JR',
      };
    // 新幹線
    case '1002': // 東海道新幹線
      return {
        shape: MarkShape.round,
        sign: '',
        signPath: require('../assets/marks/shinkansen/jrc.png'),
      };
    case '1003': // 山陽新幹線
    case '11901': // 博多南線（これは新幹線にするべきなんだろうか）
      return {
        shape: MarkShape.round,
        sign: '',
        signPath: require('../assets/marks/shinkansen/jrw.png'),
      };
    case '1004': // 東北新幹線
    case '1005': // 上越新幹線
    case '1006': // 上越新幹線(ガーラ湯沢支線)
    case '1007': // 山形新幹線
    case '1008': // 秋田新幹線
      return {
        shape: MarkShape.round,
        sign: '',
        signPath: require('../assets/marks/shinkansen/jre.png'),
      };
    case '1009': // 北陸新幹線
      return {
        shape: MarkShape.round,
        sign: '',
        signPath: require('../assets/marks/shinkansen/jrc.png'),
      };
    case '1010': // 九州新幹線
      return {
        shape: MarkShape.round,
        sign: '',
        signPath: require('../assets/marks/shinkansen/jrk.png'),
      };
    case '1011':
      return {
        shape: MarkShape.round,
        sign: 'H',
        signPath: require('../assets/marks/shinkansen/jrh.png'),
      };

    // 札幌市営地下鉄
    case '99102': // 南北線
      return {
        shape: MarkShape.round,
        sign: 'N',
        signPath: require('../assets/marks/sapporosubway/n.png'),
      };
    case '99101': // 東西線
      return {
        shape: MarkShape.round,
        sign: 'T',
        signPath: require('../assets/marks/sapporosubway/t.png'),
      };
    case '99103': // 東豊線
      return {
        shape: MarkShape.round,
        sign: 'H',
        signPath: require('../assets/marks/sapporosubway/h.png'),
      };
    // 函館市電
    case '99105': // ２系統
      return {
        shape: MarkShape.round,
        sign: 'Y',
      };
    case '99106': // ５系統
      return {
        shape: MarkShape.round,
        sign: 'D',
      };
    case '99108': // 道南いさりび鉄道線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'sh',
      };
    // 仙台市交通局
    case '99214': // 南北線
      return {
        shape: MarkShape.round,
        sign: 'N',
      };
    case '99218': // 東西線
      return {
        shape: MarkShape.round,
        sign: 'T',
      };
    case '11301': // 東海道線（東日本区間）
      return {
        shape: MarkShape.square,
        sign: 'JT',
        signPath: require('../assets/marks/jre/jt.png'),
      };
    case '11308': // 横須賀線
    case '11314': // 総武本線
    case '11327': // 成田線
      return {
        shape: MarkShape.square,
        sign: 'JO',
        signPath: require('../assets/marks/jre/jo.png'),
      };
    case '11332': // 京浜東北線
    case '11307': // 根岸線
      return {
        shape: MarkShape.square,
        sign: 'JK',
        signPath: require('../assets/marks/jre/jk.png'),
      };
    case '11306': // 横浜線
      return {
        shape: MarkShape.square,
        sign: 'JH',
        signPath: require('../assets/marks/jre/jh.png'),
      };
    case '11303': // 南武線
      return {
        shape: MarkShape.square,
        sign: 'JN',
        signPath: require('../assets/marks/jre/jn.png'),
      };
    case '11304': // 鶴見線
      return {
        shape: MarkShape.square,
        sign: 'JI',
        signPath: require('../assets/marks/jre/ji.png'),
      };
    case '11302': // 山手線
      return {
        shape: MarkShape.square,
        sign: 'JY',
        signPath: require('../assets/marks/jre/jy.png'),
      };
    case '11312': // 中央線快速
    case '11311': // 中央本線
      return {
        shape: MarkShape.square,
        sign: 'JC',
        signPath: require('../assets/marks/jre/jc.png'),
      };
    case '11313': // 中央・総武線各駅停車
      return {
        shape: MarkShape.square,
        sign: 'JB',
        signPath: require('../assets/marks/jre/jb.png'),
      };
    case '11319': // 宇都宮線
    case '11323': // 高崎線
    case '11343': // 上野東京ライン
      return {
        shape: MarkShape.square,
        sign: 'JU',
        signPath: require('../assets/marks/jre/ju.png'),
      };
    case '11321': // 埼京線
      return {
        shape: MarkShape.square,
        sign: 'JA',
        signPath: require('../assets/marks/jre/ja.png'),
      };
    case '11320': // 常磐線
      return {
        shape: MarkShape.square,
        sign: 'JJ',
        signPath: require('../assets/marks/jre/jj.png'),
        subSign: 'JL',
        subSignPath: require('../assets/marks/jre/jl.png'),
      };
    case '11326': // 京葉線
      return {
        shape: MarkShape.square,
        sign: 'JE',
        signPath: require('../assets/marks/jre/je.png'),
      };
    case '11305': // 武蔵野線
      return {
        shape: MarkShape.square,
        sign: 'JM',
        signPath: require('../assets/marks/jre/jm.png'),
      };
    case '11333': // 湘南新宿ライン
      return {
        shape: MarkShape.square,
        sign: 'JS',
        signPath: require('../assets/marks/jre/js.png'),
      };
    case '11328': // 成田エクスプレス
      return {
        shape: MarkShape.reversedSquare,
        sign: '',
      };
    case '99309':
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TX',
      };
    case '99336': // 東京モノレール
      return {
        shape: MarkShape.square,
        sign: 'MO',
        signPath: require('../assets/marks/tokyomonorail/mo.png'),
      };
    case '99337': // りんかい線
      return {
        shape: MarkShape.reversedRound,
        sign: 'R',
        signPath: require('../assets/marks/rinkai/r.png'),
      };
    // 西武線
    case '22001': // 池袋線
    case '22002': // 秩父線
    case '22003': // 有楽町線
    case '22004': // 豊島線
    case '22005': // 狭山線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SI',
        signPath: require('../assets/marks/seibu/si.png'),
      };
    case '22007': // 新宿線
    case '22008': // 拝島線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SS',
        signPath: require('../assets/marks/seibu/ss.png'),
      };
    case '22009': // 西武園線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SY',
        signPath: require('../assets/marks/seibu/sy.png'),
      };
    case '22010': // 国分寺線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SK',
        signPath: require('../assets/marks/seibu/sk.png'),
      };
    case '220011': // 多摩湖線
      return {
        shape: MarkShape.reversedRound,
        sign: 'ST',
        signPath: require('../assets/marks/seibu/st.png'),
      };
    case '220012': // 多摩線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SW',
        signPath: require('../assets/marks/seibu/sw.png'),
      };
    // 東武
    case '21001': // 東上線
    case '21007': // 越生線
      return {
        shape: MarkShape.square,
        sign: 'TJ',
        signPath: require('../assets/marks/tobu/tj.png'),
      };
    case '21002': // 伊勢崎線（スカイツリーライン）
    case '21005': // 亀戸線
    case '21006': // 大師線
      return {
        shape: MarkShape.square,
        sign: 'TS',
        signPath: require('../assets/marks/tobu/ts.png'),
        subSign: 'TI',
        subSignPath: require('../assets/marks/tobu/ti.png'),
      };
    case '21010': // 佐野線
    case '21011': // 桐生線
    case '21012': // 小泉線
      return {
        shape: MarkShape.square,
        sign: 'TI',
        signPath: require('../assets/marks/tobu/ti.png'),
      };
    case '21003': // 日光線
    case '21008': // 宇都宮線
    case '21009': // 鬼怒川線
      return {
        shape: MarkShape.square,
        sign: 'TN',
        signPath: require('../assets/marks/tobu/tn.png'),
      };
    case '21004': // 野田線
      return {
        shape: MarkShape.square,
        sign: 'TD',
        signPath: require('../assets/marks/tobu/td.png'),
      };
    // 京急
    case '27001': // 本線
    case '27002': // 空港線
    case '27003': // 大師線
    case '27004': // 逗子線
    case '27005': // 久里浜線
      return {
        shape: MarkShape.round,
        sign: 'KK',
        signPath: require('../assets/marks/keikyu/kk.png'),
      };
    // 東急
    case '26001': // 東横線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TY',
        signPath: require('../assets/marks/tokyu/ty.png'),
      };
    case '26002': // 目黒線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'MG',
        signPath: require('../assets/marks/tokyu/mg.png'),
      };
    case '26003': // 田園都市線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'DT',
        signPath: require('../assets/marks/tokyu/dt.png'),
      };
    case '26004': // 大井町線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'OM',
        signPath: require('../assets/marks/tokyu/om.png'),
      };
    case '26005': // 池上線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'IK',
        signPath: require('../assets/marks/tokyu/ik.png'),
      };
    case '26006': // 多摩川線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TM',
        signPath: require('../assets/marks/tokyu/tm.png'),
      };
    case '26007': // 世田谷線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'SG',
        signPath: require('../assets/marks/tokyu/sg.png'),
      };
    case '26008': // こどもの国線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'KD',
        signPath: require('../assets/marks/tokyu/kd.png'),
      };
    case '99310': // みなとみらい線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'MM',
        signPath: require('../assets/marks/minatomirai/mm.png'),
      };
    // 相鉄
    case '29001': // 本線
    case '29002': // いずみ野線
    case '29002': // 新横浜線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'SO',
        signPath: require('../assets/marks/sotetsu/so.png'),
      };
    // 横浜市交通局
    case '99316': // ブルーライン
      return {
        shape: MarkShape.reversedRound,
        sign: 'B',
        signPath: require('../assets/marks/yokohamamunicipal/b.png'),
      };
    case '99343': // グリーンライン
      return {
        shape: MarkShape.reversedRound,
        sign: 'G',
        signPath: require('../assets/marks/yokohamamunicipal/g.png'),
      };
    case '99320': // 江ノ電
      return {
        shape: MarkShape.round,
        sign: 'EN',
        signPath: require('../assets/marks/enoden/en.png'),
      };
    case '99338': // 東葉高速鉄道線
      return {
        shape: MarkShape.round,
        sign: 'TR',
        signPath: require('../assets/marks/toyorapid/tr.png'),
      };
    case '99307': // 東葉高速鉄道線
      return {
        shape: MarkShape.round,
        sign: 'SR',
        signPath: require('../assets/marks/saitamarapid/sr.png'),
      };
    case '99334': // 多摩都市モノレール
      return {
        shape: MarkShape.square,
        sign: 'TT',
        signPath: require('../assets/marks/tamamonorail/tt.png'),
      };
    case '99321': // ニューシャトル
      return {
        shape: MarkShape.round,
        sign: 'NS',
        signPath: require('../assets/marks/newshuttle/ns.png'),
      };
    case '99335': // 銚子電鉄線
      return {
        shape: MarkShape.square,
        sign: 'CD',
        signPath: require('../assets/marks/choshi/cd.png'),
      };
    case '99331': // 千葉都市モノレール
    case '99332': // 千葉都市モノレール
      return {
        shape: MarkShape.round,
        sign: 'CM',
        signPath: require('../assets/marks/chibamonorail/cm.png'),
      };
    case '28001': // 東京メトロ銀座線
      return {
        shape: MarkShape.round,
        sign: 'G',
        signPath: require('../assets/marks/tokyometro/g.png'),
      };
    case '28002': // 東京メトロ丸ノ内線
      return {
        shape: MarkShape.round,
        sign: 'M',
        signPath: require('../assets/marks/tokyometro/m.png'),
      };
    case '28003': // 東京メトロ日比谷線
      return {
        shape: MarkShape.round,
        sign: 'H',
        signPath: require('../assets/marks/tokyometro/h.png'),
      };
    case '28004': // 東京メトロ東西線
      return {
        shape: MarkShape.round,
        sign: 'T',
        signPath: require('../assets/marks/tokyometro/t.png'),
      };
    case '28005': // 東京メトロ千代田線
      return {
        shape: MarkShape.round,
        sign: 'C',
        signPath: require('../assets/marks/tokyometro/c.png'),
      };
    case '28006': // 東京メトロ有楽町線
      return {
        shape: MarkShape.round,
        sign: 'Y',
        signPath: require('../assets/marks/tokyometro/y.png'),
      };
    case '28008': // 東京メトロ半蔵門線
      return {
        shape: MarkShape.round,
        sign: 'Z',
        signPath: require('../assets/marks/tokyometro/z.png'),
      };
    case '28009': // 東京メトロ南北線
      return {
        shape: MarkShape.round,
        sign: 'N',
        signPath: require('../assets/marks/tokyometro/n.png'),
      };
    case '28010': // 東京メトロ副都心線
      return {
        shape: MarkShape.round,
        sign: 'F',
        signPath: require('../assets/marks/tokyometro/f.png'),
      };
    case '99302': // 都営浅草線
      return {
        shape: MarkShape.round,
        sign: 'A',
        signPath: require('../assets/marks/toei/a.png'),
      };
    case '99303': // 都営三田線
      return {
        shape: MarkShape.round,
        sign: 'I',
        signPath: require('../assets/marks/toei/i.png'),
      };
    case '99304': // 都営新宿線
      return {
        shape: MarkShape.round,
        sign: 'S',
        signPath: require('../assets/marks/toei/s.png'),
      };
    case '99301': // 都営大江戸線
      return {
        shape: MarkShape.round,
        sign: 'E',
        signPath: require('../assets/marks/toei/e.png'),
      };
    case '99311': // ゆりかもめ
      return {
        shape: MarkShape.reversedRound,
        sign: 'U',
        signPath: require('../assets/marks/yurikamome/u.png'),
      };
    case '99305': // 都電荒川線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SA',
        signPath: require('../assets/marks/toden/sa.png'),
      };
    case '99342': // 日暮里舎人ライナー
      return {
        shape: MarkShape.square,
        sign: 'NT',
        signPath: require('../assets/marks/nippori-toneri-liner/nt.png'),
      };
    // 京王線
    case '24001':
    case '24002':
    case '24003':
    case '24004':
    case '24005':
    case '24007':
      return {
        shape: MarkShape.round,
        sign: 'KO',
        signPath: require('../assets/marks/keio/ko.png'),
      };
    case '24006': // 井の頭線
      return {
        shape: MarkShape.round,
        sign: 'IN',
        signPath: require('../assets/marks/keio/in.png'),
      };
    case '25001': // 小田急小田原線
      return {
        shape: MarkShape.round,
        sign: 'OH',
        signPath: require('../assets/marks/odakyu/oh.png'),
      };
    case '25002': // 小田急江ノ島線
      return {
        shape: MarkShape.round,
        sign: 'OE',
        signPath: require('../assets/marks/odakyu/oe.png'),
      };
    case '25003': // 小田急多摩線
      return {
        shape: MarkShape.round,
        sign: 'OT',
        signPath: require('../assets/marks/odakyu/oe.png'),
      };
    // 京成
    case '23001': // 本線
    case '23002': // 押上
    case '23003': // 金町
    case '23004': // 千葉
    case '23005': // 千原
      return {
        shape: MarkShape.round,
        sign: 'KS',
        signPath: require('../assets/marks/keisei/ks.png'),
      };
    case '99329': // 新京成
      return {
        shape: MarkShape.round,
        sign: 'SL',
        signPath: require('../assets/marks/shinkeisei/sl.png'),
      };
    case '99340': // 北総線
      return {
        shape: MarkShape.round,
        sign: 'HS',
        signPath: require('../assets/marks/hokuso/hs.png'),
      };

    case '99324': // 芝山線
      return {
        shape: MarkShape.round,
        sign: 'SR',
        signPath: require('../assets/marks/shibayama/sr.png'),
      };
    case '99333': // 流鉄流山線
      return {
        shape: MarkShape.round,
        sign: 'RN',
      };
    case '11405': // 北陸線
    case '11415':
    case '11601': // 琵琶湖線
    case '11602': // 京都線
    case '11603': // 神戸線
    case '11608': // 山陽線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'A',
        signPath: require('../assets/marks/jrw/a.png'),
      };
    case '11609': // JR山陽本線(姫路～岡山)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'S',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/s2.png'),
      };
    case '11610': // JR山陽本線(岡山～三原)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'W',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/w.png'),
        subSign: 'X',
        subSignPath: require('../assets/marks/jrw/x.png'),
      };
    case '11709': // 宇野線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'L',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/l2.png'),
      };
    case '11611': // JR山陽本線(三原～岩国)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'G',
        signPath: require('../assets/marks/jrw/g2.png'),
        subSign: 'R',
        subSignPath: require('../assets/marks/jrw/r2.png'),
      };
    case '11511': // 草津線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'C',
        signPath: require('../assets/marks/jrw/c.png'),
      };
    case '11705': // 境線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'C',
        signPath: require('../assets/marks/jrw/c2.png'),
      };
    case '11618': // 奈良線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'D',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/d.png'),
      };
    case '11616': // JR山陰本線(豊岡～米子)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'A',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/a2.png'),
      };
    case '11701': // JR山陰本線(米子～益田)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'D',
        signPath: require('../assets/marks/jrw/d.png'),
      };
    case '11614': // 嵯峨野線
    case '11615': // 山陰線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'E',
        signPath: require('../assets/marks/jrw/e.png'),
      };
    case '11641': // おおさか東線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'F',
        signPath: require('../assets/marks/jrw/f.png'),
      };
    case '11629': // 宝塚線
    case '11630': // 福知山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'G',
        signPath: require('../assets/marks/jrw/g.png'),
      };
    case '11625': // 東西線
    case '11617': // 学研都市線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'H',
        signPath: require('../assets/marks/jrw/h.png'),
      };
    case '11632': // 加古川線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'I',
        signPath: require('../assets/marks/jrw/i.png'),
      };
    case '11635': // 播但線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'J',
        signPath: require('../assets/marks/jrw/j.png'),
      };
    case '11633': // 姫新線
    case '11634':
      return {
        shape: MarkShape.reversedSquare,
        sign: 'K',
        signPath: require('../assets/marks/jrw/k.png'),
      };
    case '11622': // 舞鶴線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'L',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/l.png'),
      };
    case '11623': // 大阪環状線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'O',
        signPath: require('../assets/marks/jrw/o.png'),
      };
    case '11624': // ゆめ咲線
    case '11714': // 芸備線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'P',
        signPath: require('../assets/marks/jrw/p.png'),
      };
    case '11607': // 大和路線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'Q',
        signPath: require('../assets/marks/jrw/q.png'),
      };
    case '11626': // 阪和線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'R',
        signPath: require('../assets/marks/jrw/r.png'),
      };
    case '11628': // 関西空港線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'S',
        signPath: require('../assets/marks/jrw/s.png'),
      };
    case '11636': // 和歌山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'T',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/t.png'),
      };
    case '11637': // 万葉まほろば線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'U',
        signPath: require('../assets/marks/jrw/u.png'),
      };
    case '11509': // 関西線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'V',
        signPath: require('../assets/marks/jrw/v.png'),
      };
    case '11703': // 伯備線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'V',
        signPath: require('../assets/marks/jrw/v2.png'),
      };
    case '11639': // きのくに線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'W',
        signPath: require('../assets/marks/jrw/w2.png'),
      };
    case '11715': // 津山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'T',
        signPath: require('../assets/marks/jrw/t2.png'),
      };
    case '11713': // 吉備線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'U',
        signPath: require('../assets/marks/jrw/u2.png'),
      };
    case '11720': // 福塩線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'Z',
        signPath: require('../assets/marks/jrw/z.png'),
      };
    case '11710': // 瀬戸大橋線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'M',
        signPath: require('../assets/marks/jrw/m.png'),
      };
    case '11631': // 赤穂線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'N',
        signPath: require('../assets/marks/jrw/n.png'),
      };
    case '11704': // 因美線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'B',
        signPath: require('../assets/marks/jrw/b2.png'),
      };
    case '11717': // 可部線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'B',
        signPath: require('../assets/marks/jrw/b3.png'),
      };
    case '11605': // 湖西線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'B',
        signPath: require('../assets/marks/jrw/b.png'),
      };
    case '11706': // 木次線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'E',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/e2.png'),
      };
    case '11716': // 呉線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'Y',
        signBlackText: true,
        signPath: require('../assets/marks/jrw/y.png'),
      };
    // JR東海
    case '11501': // 東海道本線（熱海〜浜松）
    case '11502': // 東海道本線（浜松〜岐阜）
    case '11503': // 東海道本線（岐阜〜米原）
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CA',
        signPath: require('../assets/marks/jrc/ca.png'),
      };
    case '11505': // 御殿場線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CB',
        signPath: require('../assets/marks/jrc/cb.png'),
      };
    case '11402': // 身延線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CC',
        signPath: require('../assets/marks/jrc/cc.png'),
      };
    case '11413': // 飯田線（豊橋～天竜峡）
    case '11414': // 飯田線（天竜峡～辰野）
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CD',
        signPath: require('../assets/marks/jrc/cd.png'),
      };
    case '11506': // 武豊線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CE',
        signPath: require('../assets/marks/jrc/ce.png'),
      };
    case '11411': // 中央本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CF',
        signPath: require('../assets/marks/jrc/cf.png'),
      };
    case '11416': // 高山本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CG',
        signPath: require('../assets/marks/jrc/cg.png'),
      };
    case '11507': // 太多線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CI',
        signPath: require('../assets/marks/jrc/ci.png'),
      };
    case '11508': // 関西本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CJ',
        signPath: require('../assets/marks/jrc/cj.png'),
      };
    // JR九州
    case '11902': // 鹿児島本線(下関・門司港～博多)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JA',
      };
    case '11903': // 鹿児島本線(博多～八代)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JB',
      };
    case '11908': // 鹿児島本線(博多～八代)
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JC',
      };
    case '11917': // 香椎線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JD',
      };
    case '11910': // 若松線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JE',
      };
    case '11906': // 日豊本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JF',
      };
    case '11912': // 原田線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JG',
      };
    case '11905': // 長崎本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JH',
      };
    case '11914': // 日田彦山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JI',
      };
    case '11915': // 日田彦山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JJ',
      };
    case '11909': // 日田彦山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'JK',
      };
    // 福岡市営地下鉄
    case '99905': // 空港線
      return {
        shape: MarkShape.round,
        sign: 'K',
      };
    case '99906': // 箱崎線
      return {
        shape: MarkShape.round,
        sign: 'H',
      };
    case '99907': // 箱崎線
      return {
        shape: MarkShape.round,
        sign: 'N',
      };
    // 西日本鉄道
    case '36001': // 天神大牟田線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'T',
      };
    case '36002': // 太宰府線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'D',
      };
    case '36003': // 甘木
      return {
        shape: MarkShape.reversedSquare,
        sign: 'A',
      };
    case '36004': // 貝塚線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'NK',
      };
    case '99909': // 筑豊電気鉄道線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CK',
      };
    // 熊本市電
    case '99922': // A系統
      return {
        shape: MarkShape.reversedSquare,
        sign: 'A',
      };
    case '99923': // B系統
      return {
        shape: MarkShape.reversedSquare,
        sign: 'B',
      };
    // 鹿児島市電
    case '99925': // 1系統
      return {
        shape: MarkShape.reversedSquare,
        sign: 'I',
      };
    case '99926': // 2系統
      return {
        shape: MarkShape.reversedSquare,
        sign: 'N',
      };
    // 名古屋市営地下鉄
    case '99513': // 東山線
      return {
        shape: MarkShape.round,
        sign: 'H',
        signPath: require('../assets/marks/nagoyamunicipal/h.png'),
      };
    case '99514': // 東山線
      return {
        shape: MarkShape.round,
        sign: 'M',
        signPath: require('../assets/marks/nagoyamunicipal/m.png'),
      };
    case '99515': // 名港線
      return {
        shape: MarkShape.round,
        sign: 'E',
        signPath: require('../assets/marks/nagoyamunicipal/e.png'),
      };
    case '99516': // 鶴舞線
      return {
        shape: MarkShape.round,
        sign: 'T',
        signPath: require('../assets/marks/nagoyamunicipal/t.png'),
      };
    case '99517': // 桜通線
      return {
        shape: MarkShape.round,
        sign: 'S',
        signPath: require('../assets/marks/nagoyamunicipal/s.png'),
      };
    case '99518': // 上飯田線
      return {
        shape: MarkShape.round,
        sign: 'K',
        signPath: require('../assets/marks/nagoyamunicipal/k.png'),
      };
    // 名鉄
    case '30001': // 名古屋本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'NH',
        signPath: require('../assets/marks/meitetsu/nh.png'),
      };
    case '30002': // 豊川線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TK',
        signPath: require('../assets/marks/meitetsu/tk.png'),
      };
    case '30003': // 西尾線
    case '30004': // 蒲郡線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'GN',
        signPath: require('../assets/marks/meitetsu/gn.png'),
      };
    case '30004': // 蒲郡線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'GN',
        signPath: require('../assets/marks/meitetsu/gn.png'),
      };
    case '30005': // 三河線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'MU',
        signPath: require('../assets/marks/meitetsu/mu.png'),
      };
    case '30006': // 豊田線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TT',
        signPath: require('../assets/marks/meitetsu/tt.png'),
      };
    case '30008': // 常滑線
    case '30007': // 空港線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TA',
        signPath: require('../assets/marks/meitetsu/ta.png'),
      };
    case '30009': // 河和線
    case '30010': // 知多新線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'KC',
        signPath: require('../assets/marks/meitetsu/kc.png'),
      };
    case '30013': // 津島線
    case '30014': // 尾西線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TB',
        signPath: require('../assets/marks/meitetsu/tb.png'),
      };
    case '30020': // 竹鼻線
    case '30021': // 羽島線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'TH',
        signPath: require('../assets/marks/meitetsu/th.png'),
      };
    case '30015': // 犬山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'IY',
        signPath: require('../assets/marks/meitetsu/iy.png'),
      };
    case '30016': // 各務原線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'KG',
        signPath: require('../assets/marks/meitetsu/kg.png'),
      };
    case '30017': // 広見線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'HM',
        signPath: require('../assets/marks/meitetsu/hm.png'),
      };
    case '30018': // 小牧線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'KM',
        signPath: require('../assets/marks/meitetsu/km.png'),
      };
    case '30012': // 瀬戸線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'ST',
        signPath: require('../assets/marks/meitetsu/st.png'),
      };
    case '30011': // 築港線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'CH',
        signPath: require('../assets/marks/meitetsu/ch.png'),
      };
    // 南海
    case '32001': // 南海本線
    case '32003': // 南海和歌山港線
    case '32004': // 南海高師浜線
    case '32005': // 南海加太線
    case '32006': // 南海多奈川線
      return {
        shape: MarkShape.reversedRound,
        sign: 'NK',
        signPath: require('../assets/marks/nankai/main.png'),
      };
    case '32002': // 南海空港線
      return {
        shape: MarkShape.reversedRound,
        sign: 'NK',
        signPath: require('../assets/marks/nankai/airport.png'),
      };
    case '32007': // 南海高野線
    case '32008': // 南海高野山ケーブル
    case '32009': // 南海汐見橋線
      return {
        shape: MarkShape.reversedRound,
        sign: 'NK',
        signPath: require('../assets/marks/nankai/koya.png'),
      };
    case '99616': // 泉北高速鉄道線
      return {
        shape: MarkShape.reversedRound,
        sign: 'SB',
        signPath: require('../assets/marks/senhoku/sb.png'),
      };
    case '99629': // 阪堺線
    case '99628': // 上町線
      return {
        shape: MarkShape.square,
        sign: 'HN',
        signPath: require('../assets/marks/hankai/hn.png'),
      };
    case '99610': // 京都市営地下鉄烏丸線
      return {
        shape: MarkShape.reversedRound,
        sign: 'K',
        signPath: require('../assets/marks/kyotomunicipal/k.png'),
      };
    case '99611': // 京都市営地下鉄東西線
      return {
        shape: MarkShape.reversedRound,
        sign: 'T',
        signPath: require('../assets/marks/kyotomunicipal/t.png'),
      };
    case '99618': // 大阪メトロ御堂筋線
      return {
        shape: MarkShape.reversedRound,
        sign: 'M',
        signPath: require('../assets/marks/osakametro/m.png'),
      };
    case '99619': // 大阪メトロ谷町線
      return {
        shape: MarkShape.reversedRound,
        sign: 'T',
        signPath: require('../assets/marks/osakametro/t.png'),
      };
    case '99620': // 大阪メトロ四つ橋線
      return {
        shape: MarkShape.reversedRound,
        sign: 'Y',
        signPath: require('../assets/marks/osakametro/y.png'),
      };
    case '99621': // 大阪メトロ中央線
    case '31023': // 近鉄けいはんな線
      return {
        shape: MarkShape.reversedRound,
        sign: 'C',
        signPath: require('../assets/marks/osakametro/c.png'),
      };
    case '99622': // 大阪メトロ千日前線
      return {
        shape: MarkShape.reversedRound,
        sign: 'S',
        signPath: require('../assets/marks/osakametro/s.png'),
      };
    case '99623': // 大阪メトロ堺筋線
      return {
        shape: MarkShape.reversedRound,
        sign: 'K',
        signPath: require('../assets/marks/osakametro/k.png'),
      };
    case '99624': // 大阪メトロ長堀鶴見緑地線
      return {
        shape: MarkShape.reversedRound,
        sign: 'N',
        signPath: require('../assets/marks/osakametro/n.png'),
      };
    case '99652': // 大阪メトロ今里筋線
      return {
        shape: MarkShape.reversedRound,
        sign: 'I',
        signPath: require('../assets/marks/osakametro/i.png'),
      };
    case '99625': // 南港ポートタウン線
      return {
        shape: MarkShape.reversedRound,
        sign: 'P',
        signPath: require('../assets/marks/osakametro/p.png'),
      };
    case '99608': // 宮福線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'F',
      };
    case '99653': // 宮舞線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'M',
      };
    case '99609': // 宮豊線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'T',
      };
    // 阪急線
    case '34001': // 神戸線
    case '34004': // 今津線
    case '34005': // 甲陽線
    case '34006': // 伊丹線
      return {
        shape: MarkShape.round,
        sign: 'HK',
        signPath: require('../assets/marks/hankyu/kobe.png'),
      };
    case '34002': // 宝塚線
    case '34007': // 箕面線
      return {
        shape: MarkShape.round,
        sign: 'HK',
        signPath: require('../assets/marks/hankyu/takarazuka.png'),
      };
    case '34003': // 京都線
    case '34008': // 千里線
    case '34009': // 嵐山線
      return {
        shape: MarkShape.round,
        sign: 'HK',
        signPath: require('../assets/marks/hankyu/kyoto.png'),
      };
    // 阪神
    case '35001': // 本線
    case '35002': // なんば線
    case '35003': // 武庫川線
      return {
        shape: MarkShape.round,
        sign: 'HS',
        signPath: require('../assets/marks/hanshin/hs.png'),
      };
    // 近鉄
    case '31001': // 難波線
    case '31020': // 奈良線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'A',
      };
    case '31016': // 生駒線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'G',
      };
    case '31025': // 京都線
    case '31002': // 橿原線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'B',
      };
    case '31011': // 天理線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'H',
      };
    case '31017': // 田原線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'I',
      };
    case '31005': // 大阪線
    case '31021': // 信貴線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'D',
      };
    case '31027': // 名古屋線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'E',
      };
    case '31019': // 鈴鹿線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'L',
      };
    case '31008': // 湯の山線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'K',
      };
    case '31009': // 山田線
    case '31010': // 鳥羽線
    case '31015': // 志摩線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'M',
      };
    case '31003': // 南大阪線
    case '31007': // 吉野線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'F',
      };
    case '31012': // 道明寺線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'N',
      };
    case '31022': // 長野線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'O',
      };
    case '31018': // 御所線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'P',
      };
    case '31026': // 生駒ケーブル
      return {
        shape: MarkShape.reversedSquare,
        sign: 'Y',
      };
    // 神戸市営地下鉄
    case '99645': // 西神線
    case '99646': // 山手線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'S',
        signPath: require('../assets/marks/kobemunicipal/seishin.png'),
      };
    case '99647': // 海岸線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'K',
        signPath: require('../assets/marks/kobemunicipal/kaigan.png'),
      };
    // 神戸新交通
    case '99648': // ポートライナー
      return {
        shape: MarkShape.reversedSquare,
        sign: 'P',
      };
    case '99649': // 六甲アイランド線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'R',
      };
    // 能勢電鉄
    case '99615': // 妙見線
    case '99640': // 日生線
      return {
        shape: MarkShape.reversedRound,
        sign: 'NS',
        signPath: require('../assets/marks/nose/ns.png'),
      };
    // 神戸高速
    case '99630': // 東西線
    case '99631': // 南北線
      return {
        shape: MarkShape.reversedRound,
        sign: 'KB',
        signPath: require('../assets/marks/kobe/kb.png'),
      };
    // 京阪
    case '33001': // 本線
    case '33002': // 宇治線
    case '33003': // 交野線
    case '33004': // 鴨東線
    case '33008': // 中之島線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'KH',
      };
    case '33006': // 石山坂本線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'OT',
      };
    case '33007': // 京津線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'OT',
      };
    // 京福
    case '99612': // 嵐山本線
      return {
        shape: MarkShape.reversedRound,
        sign: 'A',
        signPath: require('../assets/marks/keihuku/a.png'),
      };
    case '99613': // 北野線
      return {
        shape: MarkShape.reversedRound,
        sign: 'B',
        signPath: require('../assets/marks/keihuku/b.png'),
      };
    // 叡山線
    case '99606': // 叡山本線
    case '99607': // 鞍馬線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'E',
      };
    // 岡山電気軌道
    case '99706': // 東山線
      return {
        shape: MarkShape.round,
        sign: 'H',
      };
    case '99707': // 清輝橋線
      return {
        shape: MarkShape.round,
        sign: 'S',
      };
    case '99704': // 水島本線
      return {
        shape: MarkShape.reversedRound,
        sign: 'MR',
      };
    // 広島電鉄
    case '99711': // 本線・宮島線
      return {
        shape: MarkShape.reversedRound,
        sign: 'M',
      };
    case '99716': // 横川線
      return {
        shape: MarkShape.reversedRound,
        sign: 'Y',
      };
    case '99710': // 宇品線
      return {
        shape: MarkShape.reversedRound,
        sign: 'U',
      };
    case '99714': // 江波線
      return {
        shape: MarkShape.reversedRound,
        sign: 'E',
      };
    case '99717': // 白島線
      return {
        shape: MarkShape.reversedRound,
        sign: 'W',
      };
    case '99713': // 皆実線
      return {
        shape: MarkShape.reversedRound,
        sign: 'H',
      };
    // 伊予鉄
    case '99806': // 高浜線
    case '99807': // 横河原線
    case '99805': // 郡中線
      return {
        shape: MarkShape.reversedRound,
        sign: 'IY',
      };
    // ことでん
    case '99802': // 琴平線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'K',
      };
    case '99803': // 長尾線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'N',
      };
    case '99805': // 志度線
      return {
        shape: MarkShape.reversedSquare,
        sign: 'S',
      };
    case '11806': // 予讃線
      return {
        shape: MarkShape.round,
        sign: 'Y',
      };
    case '11801': // 土讃線
      return {
        shape: MarkShape.round,
        sign: 'D',
      };
    case '11808': // 予土線
      return {
        shape: MarkShape.round,
        sign: 'G',
      };
    case '11802': // 高徳線
      return {
        shape: MarkShape.round,
        sign: 'T',
      };
    case '11805': // 鳴門線
      return {
        shape: MarkShape.round,
        sign: 'N',
      };
    case '11803': // 徳島線
      return {
        shape: MarkShape.round,
        sign: 'B',
      };
    case '11804': // 牟岐線
      return {
        shape: MarkShape.round,
        sign: 'M',
      };
    case '99816': // ごめん・なはり線
      return {
        shape: MarkShape.round,
        sign: 'GN',
      };
    case '99814': // 中村線
      return {
        shape: MarkShape.round,
        sign: 'TK',
      };
    default:
      return null;
  }
};

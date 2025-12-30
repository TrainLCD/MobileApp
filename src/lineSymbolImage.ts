import type { Line } from '~/@types/graphql';

export type LineSymbolImage = {
  signPath?: number;
  subSignPath?: number;
  extraSignPath?: number;
};

export type LineSymbolImageWithImage = Partial<LineSymbolImage> & {
  signShape?: string;
};

/**
 * 直接使わず、getLineSymbolImageを使う
 */
const getLineSymbolImageWithColor = (line: Line): LineSymbolImage | null => {
  switch (line?.id) {
    // 新幹線
    case 1002: // 東海道新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc.webp') };
    case 1003: // 山陽新幹線
    case 11901: // 博多南線（これは新幹線にするべきなんだろうか）
      return { signPath: require('../assets/marks/shinkansen/jrw.webp') };
    case 1004: // 東北新幹線
    case 1005: // 上越新幹線
    case 1006: // 上越新幹線(ガーラ湯沢支線)
    case 1007: // 山形新幹線
    case 1008: // 秋田新幹線
      return { signPath: require('../assets/marks/shinkansen/jre.webp') };
    case 1009: // 北陸新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc.webp') };
    case 1010: // 九州新幹線
    case 1012: // 西九州新幹線
      return { signPath: require('../assets/marks/shinkansen/jrk.webp') };
    case 1011:
      return { signPath: require('../assets/marks/shinkansen/jrh.webp') };
    // 札幌市営地下鉄
    case 99102: // 南北線
      return { signPath: require('../assets/marks/sapporosubway/n.webp') };
    case 99101: // 東西線
      return { signPath: require('../assets/marks/sapporosubway/t.webp') };
    case 99103: // 東豊線
      return { signPath: require('../assets/marks/sapporosubway/h.webp') };
    // JR東日本
    case 11301: // 東海道線（東日本区間）
      return { signPath: require('../assets/marks/jre/jt.webp') };
    case 11308: // 横須賀線
    case 11314: // 総武本線
    case 11327: // 成田線
      return { signPath: require('../assets/marks/jre/jo.webp') };
    case 11332: // 京浜東北線
    case 11307: // 根岸線
      return { signPath: require('../assets/marks/jre/jk.webp') };
    case 11306: // 横浜線
      return { signPath: require('../assets/marks/jre/jh.webp') };
    case 11303: // 南武線
      return { signPath: require('../assets/marks/jre/jn.webp') };
    case 11304: // 鶴見線
      return { signPath: require('../assets/marks/jre/ji.webp') };
    case 11302: // 山手線
      return { signPath: require('../assets/marks/jre/jy.webp') };
    case 11312: // 中央線快速
    case 11315: // 青梅線
    case 11316: // 五日市線
      return { signPath: require('../assets/marks/jre/jc.webp') };
    case 11311: // 中央本線
      return {
        signPath: require('../assets/marks/jre/jc.webp'),
        subSignPath: require('../assets/marks/jre/co.webp'),
      };
    case 11313: // 中央・総武線各駅停車
      return { signPath: require('../assets/marks/jre/jb.webp') };
    case 11319: // 宇都宮線
    case 11323: // 高崎線
    case 11343: // 上野東京ライン
      return { signPath: require('../assets/marks/jre/ju.webp') };
    case 11321: // 埼京線
      return { signPath: require('../assets/marks/jre/ja.webp') };
    case 11229: // JR常磐線(取手～いわき)
      return { signPath: require('../assets/marks/jre/jj.webp') };
    case 11320: // JR常磐線(上野～取手)
      return { signPath: require('../assets/marks/jre/jj.webp') };
    case 11344: // JR常磐線(緩行線)
      return { signPath: require('../assets/marks/jre/jl.webp') };
    case 11326: // 京葉線
      return { signPath: require('../assets/marks/jre/je.webp') };
    case 11305: // 武蔵野線
      return { signPath: require('../assets/marks/jre/jm.webp') };
    case 11333: // 湘南新宿ライン
      return { signPath: require('../assets/marks/jre/js.webp') };
    case 11504: // 伊東線
      return { signPath: require('../assets/marks/jre/jt.webp') };
    case 99336: // 東京モノレール
      return { signPath: require('../assets/marks/tokyomonorail/mo.webp') };
    case 99337: // りんかい線
      return { signPath: require('../assets/marks/twr/r.webp') };
    // 西武線
    case 22001: // 池袋線
    case 22002: // 秩父線
    case 22003: // 有楽町線
    case 22004: // 豊島線
    case 22005: // 狭山線
      return { signPath: require('../assets/marks/seibu/si.webp') };
    case 22006: // 西武山口線
      return { signPath: require('../assets/marks/seibu/sy.webp') };
    case 22007: // 新宿線
    case 22008: // 拝島線
      return { signPath: require('../assets/marks/seibu/ss.webp') };
    case 22009: // 西武園線
    case 22010: // 国分寺線
      return { signPath: require('../assets/marks/seibu/sk.webp') };
    case 22011: // 多摩湖線
      return { signPath: require('../assets/marks/seibu/st.webp') };
    case 22012: // 多摩川線
      return { signPath: require('../assets/marks/seibu/sw.webp') };
    // 東武
    case 21001: // 東上線
    case 21007: // 越生線
      return { signPath: require('../assets/marks/tobu/tj.webp') };
    case 21002: // 伊勢崎線（スカイツリーライン）
      return {
        signPath: require('../assets/marks/tobu/ti.webp'),
        subSignPath: require('../assets/marks/tobu/ts.webp'),
      };
    case 21005: // 亀戸線
    case 21006: // 大師線
      return { signPath: require('../assets/marks/tobu/ts.webp') };
    case 21010: // 佐野線
    case 21011: // 桐生線
    case 21012: // 小泉線
      return { signPath: require('../assets/marks/tobu/ti.webp') };
    case 21003: // 日光線
    case 21008: // 宇都宮線
    case 21009: // 鬼怒川線
      return { signPath: require('../assets/marks/tobu/tn.webp') };
    case 21004: // 野田線
      return { signPath: require('../assets/marks/tobu/td.webp') };
    // 京急
    case 27001: // 本線
    case 27002: // 空港線
    case 27003: // 大師線
    case 27004: // 逗子線
    case 27005: // 久里浜線
      return { signPath: require('../assets/marks/keikyu/kk.webp') };
    // 東急
    case 26001: // 東横線
      return { signPath: require('../assets/marks/tokyu/ty.webp') };
    case 26002: // 目黒線
      return { signPath: require('../assets/marks/tokyu/mg.webp') };
    case 26003: // 田園都市線
      return { signPath: require('../assets/marks/tokyu/dt.webp') };
    case 26004: // 大井町線
      return { signPath: require('../assets/marks/tokyu/om.webp') };
    case 26005: // 池上線
      return { signPath: require('../assets/marks/tokyu/ik.webp') };
    case 26006: // 多摩川線
      return { signPath: require('../assets/marks/tokyu/tm.webp') };
    case 26007: // 世田谷線
      return { signPath: require('../assets/marks/tokyu/sg.webp') };
    case 26008: // こどもの国線
      return { signPath: require('../assets/marks/tokyu/kd.webp') };
    case 26009: // 東急新横浜線
      return { signPath: require('../assets/marks/tokyu/sh.webp') };
    case 99310: // みなとみらい線
      return { signPath: require('../assets/marks/minatomirai/mm.webp') };
    // 相鉄
    case 29001: // 本線
    case 29002: // いずみ野線
    case 29003: // 相鉄・JR直通線
    case 29004: // 新横浜線
      return { signPath: require('../assets/marks/sotetsu/so.webp') };
    // 横浜市交通局
    case 99316: // ブルーライン
      return { signPath: require('../assets/marks/yokohamamunicipal/b.webp') };
    case 99343: // グリーンライン
      return { signPath: require('../assets/marks/yokohamamunicipal/g.webp') };
    case 99320: // 江ノ電
      return { signPath: require('../assets/marks/enoden/en.webp') };
    case 99338: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/toyorapid/tr.webp') };
    case 99307: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/saitamarapid/sr.webp') };
    case 99334: // 多摩都市モノレール
      return { signPath: require('../assets/marks/tamamonorail/tt.webp') };
    case 99321: // ニューシャトル
      return { signPath: require('../assets/marks/newshuttle/ns.webp') };
    case 99335: // 銚子電鉄線
      return { signPath: require('../assets/marks/choshi/cd.webp') };
    case 99331: // 千葉都市モノレール
    case 99332: // 千葉都市モノレール
      return { signPath: require('../assets/marks/chibamonorail/cm.webp') };
    case 28001: // 東京メトロ銀座線
      return { signPath: require('../assets/marks/tokyometro/g.webp') };
    case 28002: // 東京メトロ丸ノ内線
      return { signPath: require('../assets/marks/tokyometro/m.webp') };
    case 28003: // 東京メトロ日比谷線
      return { signPath: require('../assets/marks/tokyometro/h.webp') };
    case 28004: // 東京メトロ東西線
      return { signPath: require('../assets/marks/tokyometro/t.webp') };
    case 28005: // 東京メトロ千代田線
      return { signPath: require('../assets/marks/tokyometro/c.webp') };
    case 28006: // 東京メトロ有楽町線
      return { signPath: require('../assets/marks/tokyometro/y.webp') };
    case 28008: // 東京メトロ半蔵門線
      return { signPath: require('../assets/marks/tokyometro/z.webp') };
    case 28009: // 東京メトロ南北線
      return { signPath: require('../assets/marks/tokyometro/n.webp') };
    case 28010: // 東京メトロ副都心線
      return { signPath: require('../assets/marks/tokyometro/f.webp') };
    case 99302: // 都営浅草線
      return { signPath: require('../assets/marks/toei/a.webp') };
    case 99303: // 都営三田線
      return { signPath: require('../assets/marks/toei/i.webp') };
    case 99304: // 都営新宿線
      return { signPath: require('../assets/marks/toei/s.webp') };
    case 99301: // 都営大江戸線
      return { signPath: require('../assets/marks/toei/e.webp') };
    case 99311: // ゆりかもめ
      return { signPath: require('../assets/marks/yurikamome/u.webp') };
    case 99305: // 都電荒川線
      return { signPath: require('../assets/marks/toden/sa.webp') };
    case 99342: // 日暮里舎人ライナー
      return {
        signPath: require('../assets/marks/nippori-toneri-liner/nt.webp'),
      };
    // 京王線
    case 24001:
    case 24002:
    case 24003:
    case 24004:
    case 24005:
    case 24007:
      return { signPath: require('../assets/marks/keio/ko.webp') };
    case 24006: // 井の頭線
      return { signPath: require('../assets/marks/keio/in.webp') };
    case 25001: // 小田急小田原線
      return { signPath: require('../assets/marks/odakyu/oh.webp') };
    case 25002: // 小田急江ノ島線
      return { signPath: require('../assets/marks/odakyu/oe.webp') };
    case 25003: // 小田急多摩線
      return { signPath: require('../assets/marks/odakyu/ot.webp') };
    case 99339: // 箱根登山鉄道鉄道線
      return { signPath: require('../assets/marks/hakone/oh.webp') };
    // 京成
    case 23001: // 本線
    case 23002: // 押上
    case 23003: // 金町
    case 23004: // 千葉
    case 23005: // 千原
      return { signPath: require('../assets/marks/keisei/ks.webp') };
    case 23006: // 成田スカイアクセス
      return {
        signPath: require('../assets/marks/keisei/ks2.webp'),
        subSignPath: require('../assets/marks/hokuso/hs.webp'),
      };
    case 99329: // 新京成
      return { signPath: require('../assets/marks/keisei/ks.webp') };
    case 99340: // 北総線
      return { signPath: require('../assets/marks/hokuso/hs.webp') };

    case 99324: // 芝山線
      return { signPath: require('../assets/marks/shibayama/sr.webp') };
    // JR西日本
    case 11405: // 北陸線
    case 11415:
    case 11601: // 琵琶湖線
    case 11602: // 京都線
    case 11603: // 神戸線
    case 11608: // 山陽線
      return { signPath: require('../assets/marks/jrw/a.webp') };
    case 11609: // JR山陽本線(姫路～岡山)
      return { signPath: require('../assets/marks/jrw/s2.webp') };
    case 11610: // JR山陽本線(岡山～三原)
      return {
        signPath: require('../assets/marks/jrw/w.webp'),
        subSignPath: require('../assets/marks/jrw/x.webp'),
      };
    case 11709: // 宇野線
      return { signPath: require('../assets/marks/jrw/l2.webp') };
    case 11611: // JR山陽本線(三原～岩国)
      return {
        signPath: require('../assets/marks/jrw/g2.webp'),
        subSignPath: require('../assets/marks/jrw/r2.webp'),
      };
    case 11511: // 草津線
      return { signPath: require('../assets/marks/jrw/c.webp') };
    case 11705: // 境線
      return { signPath: require('../assets/marks/jrw/c2.webp') };
    case 11618: // 奈良線
      return { signPath: require('../assets/marks/jrw/d.webp') };
    case 11616: // JR山陰本線(豊岡～米子)
      return { signPath: require('../assets/marks/jrw/a2.webp') };
    case 11701: // JR山陰本線(米子～益田)
      return { signPath: require('../assets/marks/jrw/d.webp') };
    case 11614: // 嵯峨野線
    case 11615: // 山陰線
      return { signPath: require('../assets/marks/jrw/e.webp') };
    case 11641: // おおさか東線
      return { signPath: require('../assets/marks/jrw/f.webp') };
    case 11629: // 宝塚線
    case 11630: // 福知山線
      return {
        signPath: require('../assets/marks/jrw/g.webp'),
        subSignPath: require('../assets/marks/jrw/a.webp'),
      };
    case 11625: // 東西線
    case 11617: // 学研都市線
      return { signPath: require('../assets/marks/jrw/h.webp') };
    case 11632: // 加古川線
      return { signPath: require('../assets/marks/jrw/i.webp') };
    case 11635: // 播但線
      return { signPath: require('../assets/marks/jrw/j.webp') };
    case 11633: // 姫新線
    case 11634:
      return { signPath: require('../assets/marks/jrw/k.webp') };
    case 11622: // 舞鶴線
      return { signPath: require('../assets/marks/jrw/l.webp') };
    case 11623: // 大阪環状線
      return { signPath: require('../assets/marks/jrw/o.webp') };
    case 11624: // ゆめ咲線
      return { signPath: require('../assets/marks/jrw/p.webp') };
    case 11714: // 芸備線
      return { signPath: require('../assets/marks/jrw/p2.webp') };
    case 11607: // 大和路線
      return { signPath: require('../assets/marks/jrw/q.webp') };
    case 11626: // 阪和線
      return { signPath: require('../assets/marks/jrw/r.webp') };
    case 11628: // 関西空港線
      return { signPath: require('../assets/marks/jrw/s.webp') };
    case 11636: // 和歌山線
      return { signPath: require('../assets/marks/jrw/t.webp') };
    case 11637: // 万葉まほろば線
      return { signPath: require('../assets/marks/jrw/u.webp') };
    case 11509: // 関西線
      return { signPath: require('../assets/marks/jrw/v.webp') };
    case 11703: // 伯備線
      return { signPath: require('../assets/marks/jrw/v2.webp') };
    case 11639: // きのくに線
      return { signPath: require('../assets/marks/jrw/w2.webp') };
    case 11715: // 津山線
      return { signPath: require('../assets/marks/jrw/t2.webp') };
    case 11713: // 吉備線
      return { signPath: require('../assets/marks/jrw/u2.webp') };
    case 11720: // 福塩線
      return { signPath: require('../assets/marks/jrw/z.webp') };
    case 11710: // 瀬戸大橋線
      return { signPath: require('../assets/marks/jrw/m.webp') };
    case 11631: // 赤穂線
      return {
        signPath: require('../assets/marks/jrw/n.webp'),
        subSignPath: require('../assets/marks/jrw/a.webp'),
      };
    case 11704: // 因美線
      return { signPath: require('../assets/marks/jrw/b2.webp') };
    case 11717: // 可部線
      return { signPath: require('../assets/marks/jrw/b3.webp') };
    case 11605: // 湖西線
      return { signPath: require('../assets/marks/jrw/b.webp') };
    case 11706: // 木次線
      return { signPath: require('../assets/marks/jrw/e2.webp') };
    case 11716: // 呉線
      return { signPath: require('../assets/marks/jrw/y.webp') };
    // JR東海
    case 11501: // 東海道本線（熱海〜浜松）
    case 11502: // 東海道本線（浜松〜岐阜）
    case 11503: // 東海道本線（岐阜〜米原）
      return { signPath: require('../assets/marks/jrc/ca.webp') };
    case 11505: // 御殿場線
      return { signPath: require('../assets/marks/jrc/cb.webp') };
    case 11402: // 身延線
      return { signPath: require('../assets/marks/jrc/cc.webp') };
    case 11413: // 飯田線（豊橋～天竜峡）
    case 11414: // 飯田線（天竜峡～辰野）
      return { signPath: require('../assets/marks/jrc/cd.webp') };
    case 11506: // 武豊線
      return { signPath: require('../assets/marks/jrc/ce.webp') };
    case 11411: // 中央本線
      return { signPath: require('../assets/marks/jrc/cf.webp') };
    case 11416: // 高山本線
      return { signPath: require('../assets/marks/jrc/cg.webp') };
    case 11507: // 太多線
      return { signPath: require('../assets/marks/jrc/ci.webp') };
    case 11508: // 関西本線
      return { signPath: require('../assets/marks/jrc/cj.webp') };
    // 名古屋市営地下鉄
    case 99513: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/h.webp') };
    case 99514: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/m.webp') };
    case 99515: // 名港線
      return { signPath: require('../assets/marks/nagoyamunicipal/e.webp') };
    case 99516: // 鶴舞線
      return { signPath: require('../assets/marks/nagoyamunicipal/t.webp') };
    case 99517: // 桜通線
      return { signPath: require('../assets/marks/nagoyamunicipal/s.webp') };
    case 99518: // 上飯田線
      return { signPath: require('../assets/marks/nagoyamunicipal/k.webp') };
    // 名鉄
    case 30001: // 名古屋本線
      return { signPath: require('../assets/marks/meitetsu/nh.webp') };
    case 30002: // 豊川線
      return { signPath: require('../assets/marks/meitetsu/tk.webp') };
    case 30003: // 西尾線
    case 30004: // 蒲郡線
      return { signPath: require('../assets/marks/meitetsu/gn.webp') };
    case 30005: // 三河線
      return { signPath: require('../assets/marks/meitetsu/mu.webp') };
    case 30006: // 豊田線
      return { signPath: require('../assets/marks/meitetsu/tt.webp') };
    case 30008: // 常滑線
    case 30007: // 空港線
      return { signPath: require('../assets/marks/meitetsu/ta.webp') };
    case 30009: // 河和線
    case 30010: // 知多新線
      return { signPath: require('../assets/marks/meitetsu/kc.webp') };
    case 30013: // 津島線
    case 30014: // 尾西線
      return { signPath: require('../assets/marks/meitetsu/tb.webp') };
    case 30020: // 竹鼻線
    case 30021: // 羽島線
      return { signPath: require('../assets/marks/meitetsu/th.webp') };
    case 30015: // 犬山線
      return { signPath: require('../assets/marks/meitetsu/iy.webp') };
    case 30016: // 各務原線
      return { signPath: require('../assets/marks/meitetsu/kg.webp') };
    case 30017: // 広見線
      return { signPath: require('../assets/marks/meitetsu/hm.webp') };
    case 30018: // 小牧線
      return { signPath: require('../assets/marks/meitetsu/km.webp') };
    case 30012: // 瀬戸線
      return { signPath: require('../assets/marks/meitetsu/st.webp') };
    case 30011: // 築港線
      return { signPath: require('../assets/marks/meitetsu/ch.webp') };
    // 南海
    case 32001: // 南海本線
    case 32003: // 南海和歌山港線
    case 32004: // 南海高師浜線
    case 32005: // 南海加太線
    case 32006: // 南海多奈川線
      return { signPath: require('../assets/marks/nankai/main.webp') };
    case 32002: // 南海空港線
      return { signPath: require('../assets/marks/nankai/airport.webp') };
    case 32007: // 南海高野線
    case 32008: // 南海高野山ケーブル
    case 32009: // 南海汐見橋線
      return { signPath: require('../assets/marks/nankai/koya.webp') };
    case 99616: // 泉北高速鉄道線
      return { signPath: require('../assets/marks/senhoku/sb.webp') };
    case 99629: // 阪堺線
    case 99628: // 上町線
      return { signPath: require('../assets/marks/hankai/hn.webp') };
    case 99610: // 京都市営地下鉄烏丸線
      return { signPath: require('../assets/marks/kyotomunicipal/k.webp') };
    case 99611: // 京都市営地下鉄東西線
      return { signPath: require('../assets/marks/kyotomunicipal/t.webp') };
    case 99618: // 大阪メトロ御堂筋線
      return { signPath: require('../assets/marks/osakametro/m.webp') };
    case 99619: // 大阪メトロ谷町線
      return { signPath: require('../assets/marks/osakametro/t.webp') };
    case 99620: // 大阪メトロ四つ橋線
      return { signPath: require('../assets/marks/osakametro/y.webp') };
    case 99621: // 大阪メトロ中央線
      return { signPath: require('../assets/marks/osakametro/c.webp') };
    case 99622: // 大阪メトロ千日前線
      return { signPath: require('../assets/marks/osakametro/s.webp') };
    case 99623: // 大阪メトロ堺筋線
      return { signPath: require('../assets/marks/osakametro/k.webp') };
    case 99624: // 大阪メトロ長堀鶴見緑地線
      return { signPath: require('../assets/marks/osakametro/n.webp') };
    case 99652: // 大阪メトロ今里筋線
      return { signPath: require('../assets/marks/osakametro/i.webp') };
    case 99625: // 南港ポートタウン線
      return { signPath: require('../assets/marks/osakametro/p.webp') };
    // 阪急線
    case 34001: // 神戸線
    case 34004: // 今津線
    case 34005: // 甲陽線
    case 34006: // 伊丹線
      return { signPath: require('../assets/marks/hankyu/kobe.webp') };
    case 34002: // 宝塚線
    case 34007: // 箕面線
      return { signPath: require('../assets/marks/hankyu/takarazuka.webp') };
    case 34003: // 京都線
    case 34008: // 千里線
    case 34009: // 嵐山線
      return { signPath: require('../assets/marks/hankyu/kyoto.webp') };
    // 阪神
    case 35001: // 本線
    case 35002: // なんば線
    case 35003: // 武庫川線
      return { signPath: require('../assets/marks/hanshin/hs.webp') };
    // 神戸市営地下鉄
    case 99645: // 西神線
    case 99646: // 山手線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin.webp'),
      };
    case 99647: // 海岸線
      return { signPath: require('../assets/marks/kobemunicipal/kaigan.webp') };
    case 99636: // 北神線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin.webp'),
      };
    case 99637: // 山陽電鉄本線
    case 99638: // 山陽電鉄網干線
      return { signPath: require('../assets/marks/sanyo/sy.webp') };
    // 能勢電鉄
    case 99615: // 妙見線
    case 99640: // 日生線
      return { signPath: require('../assets/marks/nose/ns.webp') };
    // 神戸高速
    case 99630: // 東西線
    case 99631: // 南北線
    case 99632: // 有馬線
    case 99633: // 三田線
    case 99634: // 公園都市線
    case 99635: // 粟生線
      return { signPath: require('../assets/marks/kobe/kb.webp') };
    // 京福
    case 99612: // 嵐山本線
      return { signPath: require('../assets/marks/keihuku/a.webp') };
    case 99613: // 北野線
      return { signPath: require('../assets/marks/keihuku/b.webp') };
    case 99203: // 弘南鉄道大鰐線
      return { signPath: require('../assets/marks/konan/kw.webp') };
    case 99501: // 伊豆急行線
      return { signPath: require('../assets/marks/izukyu/iz.webp') };
    default:
      return null;
  }
};

const getLineSymbolImageGrayscaleImage = (
  line: Line
): LineSymbolImageWithImage | null => {
  switch (line.id) {
    // 新幹線
    case 1002: // 東海道新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc_g.webp') };
    case 1003: // 山陽新幹線
    case 11901: // 博多南線（これは新幹線にするべきなんだろうか）
      return { signPath: require('../assets/marks/shinkansen/jrw_g.webp') };
    case 1004: // 東北新幹線
    case 1005: // 上越新幹線
    case 1006: // 上越新幹線(ガーラ湯沢支線)
    case 1007: // 山形新幹線
    case 1008: // 秋田新幹線
      return { signPath: require('../assets/marks/shinkansen/jre_g.webp') };
    case 1009: // 北陸新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc_g.webp') };
    case 1010: // 九州新幹線
    case 1012: // 西九州新幹線
      return { signPath: require('../assets/marks/shinkansen/jrk_g.webp') };
    case 1011:
      return { signPath: require('../assets/marks/shinkansen/jrh_g.webp') };
    // 札幌市営地下鉄
    case 99102: // 南北線
      return { signPath: require('../assets/marks/sapporosubway/n_g.webp') };
    case 99101: // 東西線
      return { signPath: require('../assets/marks/sapporosubway/t_g.webp') };
    case 99103: // 東豊線
      return { signPath: require('../assets/marks/sapporosubway/h_g.webp') };
    // JR東日本
    case 11301: // 東海道線（東日本区間）
      return { signPath: require('../assets/marks/jre/jt_g.webp') };
    case 11308: // 横須賀線
    case 11314: // 総武本線
    case 11327: // 成田線
      return { signPath: require('../assets/marks/jre/jo_g.webp') };
    case 11332: // 京浜東北線
    case 11307: // 根岸線
      return { signPath: require('../assets/marks/jre/jk_g.webp') };
    case 11306: // 横浜線
      return { signPath: require('../assets/marks/jre/jh_g.webp') };
    case 11303: // 南武線
      return { signPath: require('../assets/marks/jre/jn_g.webp') };
    case 11304: // 鶴見線
      return { signPath: require('../assets/marks/jre/ji_g.webp') };
    case 11302: // 山手線
      return { signPath: require('../assets/marks/jre/jy_g.webp') };
    case 11312: // 中央線快速
    case 11315: // 青梅線
    case 11316: // 五日市線
      return { signPath: require('../assets/marks/jre/jc_g.webp') };
    case 11311: // 中央本線
      return {
        signPath: require('../assets/marks/jre/jc_g.webp'),
        subSignPath: require('../assets/marks/jre/co_g.webp'),
      };
    case 11313: // 中央・総武線各駅停車
      return { signPath: require('../assets/marks/jre/jb_g.webp') };
    case 11319: // 宇都宮線
    case 11323: // 高崎線
    case 11343: // 上野東京ライン
      return { signPath: require('../assets/marks/jre/ju_g.webp') };
    case 11321: // 埼京線
      return { signPath: require('../assets/marks/jre/ja_g.webp') };
    case 11320: // 常磐線
      return { signPath: require('../assets/marks/jre/jl_g.webp') };
    case 11344: // JR常磐線(緩行線)
      return { signPath: require('../assets/marks/jre/jj_g.webp') };
    case 11326: // 京葉線
      return { signPath: require('../assets/marks/jre/je_g.webp') };
    case 11305: // 武蔵野線
      return { signPath: require('../assets/marks/jre/jm_g.webp') };
    case 11333: // 湘南新宿ライン
      return { signPath: require('../assets/marks/jre/js_g.webp') };
    case 11504: // 伊東線
      return { signPath: require('../assets/marks/jre/jt.webp') };
    case 99336: // 東京モノレール
      return { signPath: require('../assets/marks/tokyomonorail/mo_g.webp') };
    case 99337: // りんかい線
      return { signPath: require('../assets/marks/twr/r_g.webp') };
    // 西武線
    case 22001: // 池袋線
    case 22002: // 秩父線
    case 22003: // 有楽町線
    case 22004: // 豊島線
    case 22005: // 狭山線
      return { signPath: require('../assets/marks/seibu/si_g.webp') };
    case 22006: // 西武山口線
      return { signPath: require('../assets/marks/seibu/sy.webp') };
    case 22007: // 新宿線
    case 22008: // 拝島線
      return { signPath: require('../assets/marks/seibu/ss_g.webp') };
    case 22009: // 西武園線
    case 22010: // 国分寺線
      return { signPath: require('../assets/marks/seibu/sk_g.webp') };
    case 22011: // 多摩湖線
      return { signPath: require('../assets/marks/seibu/st_g.webp') };
    case 22012: // 多摩川線
      return { signPath: require('../assets/marks/seibu/sw_g.webp') };
    // 東武
    case 21001: // 東上線
    case 21007: // 越生線
      return { signPath: require('../assets/marks/tobu/tj_g.webp') };
    case 21002: // 伊勢崎線（スカイツリーライン）
      return {
        signPath: require('../assets/marks/tobu/ti_g.webp'),
        subSignPath: require('../assets/marks/tobu/ts_g.webp'),
      };
    case 21005: // 亀戸線
    case 21006: // 大師線
      return { signPath: require('../assets/marks/tobu/ts_g.webp') };
    case 21010: // 佐野線
    case 21011: // 桐生線
    case 21012: // 小泉線
      return { signPath: require('../assets/marks/tobu/ti_g.webp') };
    case 21003: // 日光線
    case 21008: // 宇都宮線
    case 21009: // 鬼怒川線
      return { signPath: require('../assets/marks/tobu/tn_g.webp') };
    case 21004: // 野田線
      return { signPath: require('../assets/marks/tobu/td_g.webp') };
    // 京急
    case 27001: // 本線
    case 27002: // 空港線
    case 27003: // 大師線
    case 27004: // 逗子線
    case 27005: // 久里浜線
      return { signPath: require('../assets/marks/keikyu/kk_g.webp') };
    // 東急
    case 26001: // 東横線
      return { signPath: require('../assets/marks/tokyu/ty_g.webp') };
    case 26002: // 目黒線
      return { signPath: require('../assets/marks/tokyu/mg_g.webp') };
    case 26003: // 田園都市線
      return { signPath: require('../assets/marks/tokyu/dt_g.webp') };
    case 26004: // 大井町線
      return { signPath: require('../assets/marks/tokyu/om_g.webp') };
    case 26005: // 池上線
      return { signPath: require('../assets/marks/tokyu/ik_g.webp') };
    case 26006: // 多摩川線
      return { signPath: require('../assets/marks/tokyu/tm_g.webp') };
    case 26007: // 世田谷線
      return { signPath: require('../assets/marks/tokyu/sg_g.webp') };
    case 26008: // こどもの国線
      return { signPath: require('../assets/marks/tokyu/kd_g.webp') };
    case 26009: // 東急新横浜線
      return { signPath: require('../assets/marks/tokyu/sh_g.webp') };
    case 99310: // みなとみらい線
      return { signPath: require('../assets/marks/minatomirai/mm_g.webp') };
    // 相鉄
    case 29001: // 本線
    case 29002: // いずみ野線
    case 29003: // 新横浜線
      return { signPath: require('../assets/marks/sotetsu/so_g.webp') };
    // 横浜市交通局
    case 99316: // ブルーライン
      return {
        signPath: require('../assets/marks/yokohamamunicipal/b_g.webp'),
      };
    case 99343: // グリーンライン
      return {
        signPath: require('../assets/marks/yokohamamunicipal/g_g.webp'),
      };
    case 99320: // 江ノ電
      return { signPath: require('../assets/marks/enoden/en_g.webp') };
    case 99338: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/toyorapid/tr_g.webp') };
    case 99307: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/saitamarapid/sr_g.webp') };
    case 99334: // 多摩都市モノレール
      return { signPath: require('../assets/marks/tamamonorail/tt_g.webp') };
    case 99321: // ニューシャトル
      return { signPath: require('../assets/marks/newshuttle/ns_g.webp') };
    case 99335: // 銚子電鉄線
      return { signPath: require('../assets/marks/choshi/cd_g.webp') };
    case 99331: // 千葉都市モノレール
    case 99332: // 千葉都市モノレール
      return { signPath: require('../assets/marks/chibamonorail/cm_g.webp') };
    case 28001: // 東京メトロ銀座線
      return { signPath: require('../assets/marks/tokyometro/g_g.webp') };
    case 28002: // 東京メトロ丸ノ内線
      return { signPath: require('../assets/marks/tokyometro/m_g.webp') };
    case 28003: // 東京メトロ日比谷線
      return { signPath: require('../assets/marks/tokyometro/h_g.webp') };
    case 28004: // 東京メトロ東西線
      return { signPath: require('../assets/marks/tokyometro/t_g.webp') };
    case 28005: // 東京メトロ千代田線
      return { signPath: require('../assets/marks/tokyometro/c_g.webp') };
    case 28006: // 東京メトロ有楽町線
      return { signPath: require('../assets/marks/tokyometro/y_g.webp') };
    case 28008: // 東京メトロ半蔵門線
      return { signPath: require('../assets/marks/tokyometro/z_g.webp') };
    case 28009: // 東京メトロ南北線
      return { signPath: require('../assets/marks/tokyometro/n_g.webp') };
    case 28010: // 東京メトロ副都心線
      return { signPath: require('../assets/marks/tokyometro/f_g.webp') };
    case 99302: // 都営浅草線
      return { signPath: require('../assets/marks/toei/a_g.webp') };
    case 99303: // 都営三田線
      return { signPath: require('../assets/marks/toei/i_g.webp') };
    case 99304: // 都営新宿線
      return { signPath: require('../assets/marks/toei/s_g.webp') };
    case 99301: // 都営大江戸線
      return { signPath: require('../assets/marks/toei/e_g.webp') };
    case 99311: // ゆりかもめ
      return { signPath: require('../assets/marks/yurikamome/u_g.webp') };
    case 99305: // 都電荒川線
      return { signPath: require('../assets/marks/toden/sa_g.webp') };
    case 99342: // 日暮里舎人ライナー
      return {
        signPath: require('../assets/marks/nippori-toneri-liner/nt_g.webp'),
      };
    // 京王線
    case 24001:
    case 24002:
    case 24003:
    case 24004:
    case 24005:
    case 24007:
      return { signPath: require('../assets/marks/keio/ko_g.webp') };
    case 24006: // 井の頭線
      return { signPath: require('../assets/marks/keio/in_g.webp') };
    case 25001: // 小田急小田原線
      return { signPath: require('../assets/marks/odakyu/oh_g.webp') };
    case 25002: // 小田急江ノ島線
      return { signPath: require('../assets/marks/odakyu/oe_g.webp') };
    case 25003: // 小田急多摩線
      return { signPath: require('../assets/marks/odakyu/ot_g.webp') };
    case 99339: // 箱根登山鉄道鉄道線
      return { signPath: require('../assets/marks/hakone/oh_g.webp') };
    // 京成
    case 23001: // 本線
    case 23002: // 押上
    case 23003: // 金町
    case 23004: // 千葉
    case 23005: // 千原
      return { signPath: require('../assets/marks/keisei/ks_g.webp') };
    case 23006: // 成田スカイアクセス
      return {
        signPath: require('../assets/marks/keisei/ks2_g.webp'),
        subSignPath: require('../assets/marks/hokuso/hs_g.webp'),
      };
    case 99329: // 新京成
      return { signPath: require('../assets/marks/keisei/ks_g.webp') };
    case 99340: // 北総線
      return { signPath: require('../assets/marks/hokuso/hs_g.webp') };
    case 99324: // 芝山線
      return { signPath: require('../assets/marks/shibayama/sr_g.webp') };
    // JR西日本
    case 11405: // 北陸線
    case 11415:
    case 11601: // 琵琶湖線
    case 11602: // 京都線
    case 11603: // 神戸線
    case 11608: // 山陽線
      return { signPath: require('../assets/marks/jrw/a_g.webp') };
    case 11609: // JR山陽本線(姫路～岡山)
      return { signPath: require('../assets/marks/jrw/s2_g.webp') };
    case 11610: // JR山陽本線(岡山～三原)
      return {
        signPath: require('../assets/marks/jrw/w_g.webp'),
        subSignPath: require('../assets/marks/jrw/x_g.webp'),
      };
    case 11709: // 宇野線
      return { signPath: require('../assets/marks/jrw/l2_g.webp') };
    case 11611: // JR山陽本線(三原～岩国)
      return {
        signPath: require('../assets/marks/jrw/g2_g.webp'),
        subSignPath: require('../assets/marks/jrw/r2_g.webp'),
      };
    case 11511: // 草津線
      return { signPath: require('../assets/marks/jrw/c_g.webp') };
    case 11705: // 境線
      return { signPath: require('../assets/marks/jrw/c2_g.webp') };
    case 11618: // 奈良線
      return { signPath: require('../assets/marks/jrw/d_g.webp') };
    case 11616: // JR山陰本線(豊岡～米子)
      return { signPath: require('../assets/marks/jrw/a2_g.webp') };
    case 11701: // JR山陰本線(米子～益田)
      return { signPath: require('../assets/marks/jrw/d_g.webp') };
    case 11614: // 嵯峨野線
    case 11615: // 山陰線
      return { signPath: require('../assets/marks/jrw/e_g.webp') };
    case 11641: // おおさか東線
      return { signPath: require('../assets/marks/jrw/f_g.webp') };
    case 11629: // 宝塚線
    case 11630: // 福知山線
      return {
        signPath: require('../assets/marks/jrw/g_g.webp'),
        subSignPath: require('../assets/marks/jrw/a_g.webp'),
      };
    case 11625: // 東西線
    case 11617: // 学研都市線
      return { signPath: require('../assets/marks/jrw/h_g.webp') };
    case 11632: // 加古川線
      return { signPath: require('../assets/marks/jrw/i_g.webp') };
    case 11635: // 播但線
      return { signPath: require('../assets/marks/jrw/j_g.webp') };
    case 11633: // 姫新線
    case 11634:
      return { signPath: require('../assets/marks/jrw/k_g.webp') };
    case 11622: // 舞鶴線
      return { signPath: require('../assets/marks/jrw/l_g.webp') };
    case 11623: // 大阪環状線
      return { signPath: require('../assets/marks/jrw/o_g.webp') };
    case 11624: // ゆめ咲線
      return { signPath: require('../assets/marks/jrw/p_g.webp') };
    case 11714: // 芸備線
      return { signPath: require('../assets/marks/jrw/p2_g.webp') };
    case 11607: // 大和路線
      return { signPath: require('../assets/marks/jrw/q_g.webp') };
    case 11626: // 阪和線
      return { signPath: require('../assets/marks/jrw/r_g.webp') };
    case 11628: // 関西空港線
      return { signPath: require('../assets/marks/jrw/s_g.webp') };
    case 11636: // 和歌山線
      return { signPath: require('../assets/marks/jrw/t_g.webp') };
    case 11637: // 万葉まほろば線
      return { signPath: require('../assets/marks/jrw/u_g.webp') };
    case 11509: // 関西線
      return { signPath: require('../assets/marks/jrw/v_g.webp') };
    case 11703: // 伯備線
      return { signPath: require('../assets/marks/jrw/v2_g.webp') };
    case 11639: // きのくに線
      return { signPath: require('../assets/marks/jrw/w2_g.webp') };
    case 11715: // 津山線
      return { signPath: require('../assets/marks/jrw/t2_g.webp') };
    case 11713: // 吉備線
      return { signPath: require('../assets/marks/jrw/u2_g.webp') };
    case 11720: // 福塩線
      return { signPath: require('../assets/marks/jrw/z_g.webp') };
    case 11710: // 瀬戸大橋線
      return { signPath: require('../assets/marks/jrw/m_g.webp') };
    case 11631: // 赤穂線
      return {
        signPath: require('../assets/marks/jrw/n_g.webp'),
        subSignPath: require('../assets/marks/jrw/a_g.webp'),
      };
    case 11704: // 因美線
      return { signPath: require('../assets/marks/jrw/b2_g.webp') };
    case 11717: // 可部線
      return { signPath: require('../assets/marks/jrw/b3_g.webp') };
    case 11605: // 湖西線
      return { signPath: require('../assets/marks/jrw/b_g.webp') };
    case 11706: // 木次線
      return { signPath: require('../assets/marks/jrw/e2_g.webp') };
    case 11716: // 呉線
      return { signPath: require('../assets/marks/jrw/y_g.webp') };
    // JR東海
    case 11501: // 東海道本線（熱海〜浜松）
    case 11502: // 東海道本線（浜松〜岐阜）
    case 11503: // 東海道本線（岐阜〜米原）
      return { signPath: require('../assets/marks/jrc/ca_g.webp') };
    case 11505: // 御殿場線
      return { signPath: require('../assets/marks/jrc/cb_g.webp') };
    case 11402: // 身延線
      return { signPath: require('../assets/marks/jrc/cc_g.webp') };
    case 11413: // 飯田線（豊橋～天竜峡）
    case 11414: // 飯田線（天竜峡～辰野）
      return { signPath: require('../assets/marks/jrc/cd_g.webp') };
    case 11506: // 武豊線
      return { signPath: require('../assets/marks/jrc/ce_g.webp') };
    case 11411: // 中央本線
      return { signPath: require('../assets/marks/jrc/cf_g.webp') };
    case 11416: // 高山本線
      return { signPath: require('../assets/marks/jrc/cg_g.webp') };
    case 11507: // 太多線
      return { signPath: require('../assets/marks/jrc/ci_g.webp') };
    case 11508: // 関西本線
      return { signPath: require('../assets/marks/jrc/cj_g.webp') };
    // 名古屋市営地下鉄
    case 99513: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/h_g.webp') };
    case 99514: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/m_g.webp') };
    case 99515: // 名港線
      return { signPath: require('../assets/marks/nagoyamunicipal/e_g.webp') };
    case 99516: // 鶴舞線
      return { signPath: require('../assets/marks/nagoyamunicipal/t_g.webp') };
    case 99517: // 桜通線
      return { signPath: require('../assets/marks/nagoyamunicipal/s_g.webp') };
    case 99518: // 上飯田線
      return { signPath: require('../assets/marks/nagoyamunicipal/k_g.webp') };
    // 名鉄
    case 30001: // 名古屋本線
      return { signPath: require('../assets/marks/meitetsu/nh_g.webp') };
    case 30002: // 豊川線
      return { signPath: require('../assets/marks/meitetsu/tk_g.webp') };
    case 30003: // 西尾線
    case 30004: // 蒲郡線
      return { signPath: require('../assets/marks/meitetsu/gn_g.webp') };
    case 30005: // 三河線
      return { signPath: require('../assets/marks/meitetsu/mu_g.webp') };
    case 30006: // 豊田線
      return { signPath: require('../assets/marks/meitetsu/tt_g.webp') };
    case 30008: // 常滑線
    case 30007: // 空港線
      return { signPath: require('../assets/marks/meitetsu/ta_g.webp') };
    case 30009: // 河和線
    case 30010: // 知多新線
      return { signPath: require('../assets/marks/meitetsu/kc_g.webp') };
    case 30013: // 津島線
    case 30014: // 尾西線
      return { signPath: require('../assets/marks/meitetsu/tb_g.webp') };
    case 30020: // 竹鼻線
    case 30021: // 羽島線
      return { signPath: require('../assets/marks/meitetsu/th_g.webp') };
    case 30015: // 犬山線
      return { signPath: require('../assets/marks/meitetsu/iy_g.webp') };
    case 30016: // 各務原線
      return { signPath: require('../assets/marks/meitetsu/kg_g.webp') };
    case 30017: // 広見線
      return { signPath: require('../assets/marks/meitetsu/hm_g.webp') };
    case 30018: // 小牧線
      return { signPath: require('../assets/marks/meitetsu/km_g.webp') };
    case 30012: // 瀬戸線
      return { signPath: require('../assets/marks/meitetsu/st_g.webp') };
    case 30011: // 築港線
      return { signPath: require('../assets/marks/meitetsu/ch_g.webp') };
    // 南海
    case 32001: // 南海本線
    case 32003: // 南海和歌山港線
    case 32004: // 南海高師浜線
    case 32005: // 南海加太線
    case 32006: // 南海多奈川線
      return { signPath: require('../assets/marks/nankai/main_g.webp') };
    case 32002: // 南海空港線
      return { signPath: require('../assets/marks/nankai/airport_g.webp') };
    case 32007: // 南海高野線
    case 32008: // 南海高野山ケーブル
    case 32009: // 南海汐見橋線
      return { signPath: require('../assets/marks/nankai/koya_g.webp') };
    case 99616: // 泉北高速鉄道線
      return { signPath: require('../assets/marks/senhoku/sb_g.webp') };
    case 99629: // 阪堺線
    case 99628: // 上町線
      return { signPath: require('../assets/marks/hankai/hn_g.webp') };
    case 99610: // 京都市営地下鉄烏丸線
      return { signPath: require('../assets/marks/kyotomunicipal/k_g.webp') };
    case 99611: // 京都市営地下鉄東西線
      return { signPath: require('../assets/marks/kyotomunicipal/t_g.webp') };
    case 99618: // 大阪メトロ御堂筋線
      return { signPath: require('../assets/marks/osakametro/m_g.webp') };
    case 99619: // 大阪メトロ谷町線
      return { signPath: require('../assets/marks/osakametro/t_g.webp') };
    case 99620: // 大阪メトロ四つ橋線
      return { signPath: require('../assets/marks/osakametro/y_g.webp') };
    case 99621: // 大阪メトロ中央線
      return { signPath: require('../assets/marks/osakametro/c_g.webp') };
    case 99622: // 大阪メトロ千日前線
      return { signPath: require('../assets/marks/osakametro/s_g.webp') };
    case 99623: // 大阪メトロ堺筋線
      return { signPath: require('../assets/marks/osakametro/k_g.webp') };
    case 99624: // 大阪メトロ長堀鶴見緑地線
      return { signPath: require('../assets/marks/osakametro/n_g.webp') };
    case 99652: // 大阪メトロ今里筋線
      return { signPath: require('../assets/marks/osakametro/i_g.webp') };
    case 99625: // 南港ポートタウン線
      return { signPath: require('../assets/marks/osakametro/p_g.webp') };
    // 阪急線
    case 34001: // 神戸線
    case 34004: // 今津線
    case 34005: // 甲陽線
    case 34006: // 伊丹線
      return { signPath: require('../assets/marks/hankyu/kobe_g.webp') };
    case 34002: // 宝塚線
    case 34007: // 箕面線
      return { signPath: require('../assets/marks/hankyu/takarazuka_g.webp') };
    case 34003: // 京都線
    case 34008: // 千里線
    case 34009: // 嵐山線
      return { signPath: require('../assets/marks/hankyu/kyoto_g.webp') };
    // 阪神
    case 35001: // 本線
    case 35002: // なんば線
    case 35003: // 武庫川線
      return { signPath: require('../assets/marks/hanshin/hs_g.webp') };
    // 神戸市営地下鉄
    case 99645: // 西神線
    case 99646: // 山手線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin_g.webp'),
      };
    case 99647: // 海岸線
      return {
        signPath: require('../assets/marks/kobemunicipal/kaigan_g.webp'),
      };
    case 99636: // 北神線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin_g.webp'),
      };
    case 99637: // 山陽電鉄本線
    case 99638: // 山陽電鉄網干線
      return { signPath: require('../assets/marks/sanyo/sy_g.webp') };
    // 能勢電鉄
    case 99615: // 妙見線
    case 99640: // 日生線
      return { signPath: require('../assets/marks/nose/ns_g.webp') };
    // 神戸高速
    case 99630: // 東西線
    case 99631: // 南北線
    case 99632: // 有馬線
    case 99633: // 三田線
    case 99634: // 公園都市線
    case 99635: // 粟生線
      return { signPath: require('../assets/marks/kobe/kb_g.webp') };
    // 京福
    case 99612: // 嵐山本線
      return { signPath: require('../assets/marks/keihuku/a_g.webp') };
    case 99613: // 北野線
      return { signPath: require('../assets/marks/keihuku/b_g.webp') };
    case 99203: // 弘南鉄道大鰐線
      return { signPath: require('../assets/marks/konan/kw_g.webp') };
    case 99501: // 伊豆急行線
      return { signPath: require('../assets/marks/izukyu/iz_g.webp') };
    default:
      return null;
  }
};

export const getLineSymbolImage = (
  line: Line,
  grayscale: boolean
): LineSymbolImage | null => {
  const lineMark = getLineSymbolImageWithColor(line);
  if (!grayscale) {
    return lineMark;
  }
  const lineMarkGrayscale = getLineSymbolImageGrayscaleImage(line);
  if (!lineMark) {
    return null;
  }
  return lineMarkGrayscale;
};

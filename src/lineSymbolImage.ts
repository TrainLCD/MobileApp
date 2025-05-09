import type { Line } from '../gen/proto/stationapi_pb';

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
      return { signPath: require('../assets/marks/shinkansen/jrc.png') };
    case 1003: // 山陽新幹線
    case 11901: // 博多南線（これは新幹線にするべきなんだろうか）
      return { signPath: require('../assets/marks/shinkansen/jrw.png') };
    case 1004: // 東北新幹線
    case 1005: // 上越新幹線
    case 1006: // 上越新幹線(ガーラ湯沢支線)
    case 1007: // 山形新幹線
    case 1008: // 秋田新幹線
      return { signPath: require('../assets/marks/shinkansen/jre.png') };
    case 1009: // 北陸新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc.png') };
    case 1010: // 九州新幹線
    case 1012: // 西九州新幹線
      return { signPath: require('../assets/marks/shinkansen/jrk.png') };
    case 1011:
      return { signPath: require('../assets/marks/shinkansen/jrh.png') };
    // 札幌市営地下鉄
    case 99102: // 南北線
      return { signPath: require('../assets/marks/sapporosubway/n.png') };
    case 99101: // 東西線
      return { signPath: require('../assets/marks/sapporosubway/t.png') };
    case 99103: // 東豊線
      return { signPath: require('../assets/marks/sapporosubway/h.png') };
    // JR東日本
    case 11301: // 東海道線（東日本区間）
      return { signPath: require('../assets/marks/jre/jt.png') };
    case 11308: // 横須賀線
    case 11314: // 総武本線
    case 11327: // 成田線
      return { signPath: require('../assets/marks/jre/jo.png') };
    case 11332: // 京浜東北線
    case 11307: // 根岸線
      return { signPath: require('../assets/marks/jre/jk.png') };
    case 11306: // 横浜線
      return { signPath: require('../assets/marks/jre/jh.png') };
    case 11303: // 南武線
      return { signPath: require('../assets/marks/jre/jn.png') };
    case 11304: // 鶴見線
      return { signPath: require('../assets/marks/jre/ji.png') };
    case 11302: // 山手線
      return { signPath: require('../assets/marks/jre/jy.png') };
    case 11312: // 中央線快速
    case 11315: // 青梅線
    case 11316: // 五日市線
      return { signPath: require('../assets/marks/jre/jc.png') };
    case 11311: // 中央本線
      return {
        signPath: require('../assets/marks/jre/jc.png'),
        subSignPath: require('../assets/marks/jre/co.png'),
      };
    case 11313: // 中央・総武線各駅停車
      return { signPath: require('../assets/marks/jre/jb.png') };
    case 11319: // 宇都宮線
    case 11323: // 高崎線
    case 11343: // 上野東京ライン
      return { signPath: require('../assets/marks/jre/ju.png') };
    case 11321: // 埼京線
      return { signPath: require('../assets/marks/jre/ja.png') };
    case 11229: // JR常磐線(取手～いわき)
      return { signPath: require('../assets/marks/jre/jj.png') };
    case 11320: // JR常磐線(上野～取手)
      return {
        signPath: require('../assets/marks/jre/jl.png'),
        subSignPath: require('../assets/marks/jre/jj.png'),
      };
    case 11326: // 京葉線
      return { signPath: require('../assets/marks/jre/je.png') };
    case 11305: // 武蔵野線
      return { signPath: require('../assets/marks/jre/jm.png') };
    case 11333: // 湘南新宿ライン
      return { signPath: require('../assets/marks/jre/js.png') };
    case 11504: // 伊東線
      return { signPath: require('../assets/marks/jre/jt.png') };
    case 99336: // 東京モノレール
      return { signPath: require('../assets/marks/tokyomonorail/mo.png') };
    case 99337: // りんかい線
      return { signPath: require('../assets/marks/twr/r.png') };
    // 西武線
    case 22001: // 池袋線
    case 22002: // 秩父線
    case 22003: // 有楽町線
    case 22004: // 豊島線
    case 22005: // 狭山線
      return { signPath: require('../assets/marks/seibu/si.png') };
    case 22006: // 西武山口線
      return { signPath: require('../assets/marks/seibu/sy.png') };
    case 22007: // 新宿線
    case 22008: // 拝島線
      return { signPath: require('../assets/marks/seibu/ss.png') };
    case 22009: // 西武園線
    case 22010: // 国分寺線
      return { signPath: require('../assets/marks/seibu/sk.png') };
    case 22011: // 多摩湖線
      return { signPath: require('../assets/marks/seibu/st.png') };
    case 22012: // 多摩川線
      return { signPath: require('../assets/marks/seibu/sw.png') };
    // 東武
    case 21001: // 東上線
    case 21007: // 越生線
      return { signPath: require('../assets/marks/tobu/tj.png') };
    case 21002: // 伊勢崎線（スカイツリーライン）
      return {
        signPath: require('../assets/marks/tobu/ti.png'),
        subSignPath: require('../assets/marks/tobu/ts.png'),
      };
    case 21005: // 亀戸線
    case 21006: // 大師線
      return { signPath: require('../assets/marks/tobu/ts.png') };
    case 21010: // 佐野線
    case 21011: // 桐生線
    case 21012: // 小泉線
      return { signPath: require('../assets/marks/tobu/ti.png') };
    case 21003: // 日光線
    case 21008: // 宇都宮線
    case 21009: // 鬼怒川線
      return { signPath: require('../assets/marks/tobu/tn.png') };
    case 21004: // 野田線
      return { signPath: require('../assets/marks/tobu/td.png') };
    // 京急
    case 27001: // 本線
    case 27002: // 空港線
    case 27003: // 大師線
    case 27004: // 逗子線
    case 27005: // 久里浜線
      return { signPath: require('../assets/marks/keikyu/kk.png') };
    // 東急
    case 26001: // 東横線
      return { signPath: require('../assets/marks/tokyu/ty.png') };
    case 26002: // 目黒線
      return { signPath: require('../assets/marks/tokyu/mg.png') };
    case 26003: // 田園都市線
      return { signPath: require('../assets/marks/tokyu/dt.png') };
    case 26004: // 大井町線
      return { signPath: require('../assets/marks/tokyu/om.png') };
    case 26005: // 池上線
      return { signPath: require('../assets/marks/tokyu/ik.png') };
    case 26006: // 多摩川線
      return { signPath: require('../assets/marks/tokyu/tm.png') };
    case 26007: // 世田谷線
      return { signPath: require('../assets/marks/tokyu/sg.png') };
    case 26008: // こどもの国線
      return { signPath: require('../assets/marks/tokyu/kd.png') };
    case 26009: // 東急新横浜線
      return { signPath: require('../assets/marks/tokyu/sh.png') };
    case 99310: // みなとみらい線
      return { signPath: require('../assets/marks/minatomirai/mm.png') };
    // 相鉄
    case 29001: // 本線
    case 29002: // いずみ野線
    case 29003: // 新横浜線
      return { signPath: require('../assets/marks/sotetsu/so.png') };
    // 横浜市交通局
    case 99316: // ブルーライン
      return { signPath: require('../assets/marks/yokohamamunicipal/b.png') };
    case 99343: // グリーンライン
      return { signPath: require('../assets/marks/yokohamamunicipal/g.png') };
    case 99320: // 江ノ電
      return { signPath: require('../assets/marks/enoden/en.png') };
    case 99338: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/toyorapid/tr.png') };
    case 99307: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/saitamarapid/sr.png') };
    case 99334: // 多摩都市モノレール
      return { signPath: require('../assets/marks/tamamonorail/tt.png') };
    case 99321: // ニューシャトル
      return { signPath: require('../assets/marks/newshuttle/ns.png') };
    case 99335: // 銚子電鉄線
      return { signPath: require('../assets/marks/choshi/cd.png') };
    case 99331: // 千葉都市モノレール
    case 99332: // 千葉都市モノレール
      return { signPath: require('../assets/marks/chibamonorail/cm.png') };
    case 28001: // 東京メトロ銀座線
      return { signPath: require('../assets/marks/tokyometro/g.png') };
    case 28002: // 東京メトロ丸ノ内線
      return { signPath: require('../assets/marks/tokyometro/m.png') };
    case 28003: // 東京メトロ日比谷線
      return { signPath: require('../assets/marks/tokyometro/h.png') };
    case 28004: // 東京メトロ東西線
      return { signPath: require('../assets/marks/tokyometro/t.png') };
    case 28005: // 東京メトロ千代田線
      return { signPath: require('../assets/marks/tokyometro/c.png') };
    case 28006: // 東京メトロ有楽町線
      return { signPath: require('../assets/marks/tokyometro/y.png') };
    case 28008: // 東京メトロ半蔵門線
      return { signPath: require('../assets/marks/tokyometro/z.png') };
    case 28009: // 東京メトロ南北線
      return { signPath: require('../assets/marks/tokyometro/n.png') };
    case 28010: // 東京メトロ副都心線
      return { signPath: require('../assets/marks/tokyometro/f.png') };
    case 99302: // 都営浅草線
      return { signPath: require('../assets/marks/toei/a.png') };
    case 99303: // 都営三田線
      return { signPath: require('../assets/marks/toei/i.png') };
    case 99304: // 都営新宿線
      return { signPath: require('../assets/marks/toei/s.png') };
    case 99301: // 都営大江戸線
      return { signPath: require('../assets/marks/toei/e.png') };
    case 99311: // ゆりかもめ
      return { signPath: require('../assets/marks/yurikamome/u.png') };
    case 99305: // 都電荒川線
      return { signPath: require('../assets/marks/toden/sa.png') };
    case 99342: // 日暮里舎人ライナー
      return {
        signPath: require('../assets/marks/nippori-toneri-liner/nt.png'),
      };
    // 京王線
    case 24001:
    case 24002:
    case 24003:
    case 24004:
    case 24005:
    case 24007:
      return { signPath: require('../assets/marks/keio/ko.png') };
    case 24006: // 井の頭線
      return { signPath: require('../assets/marks/keio/in.png') };
    case 25001: // 小田急小田原線
      return { signPath: require('../assets/marks/odakyu/oh.png') };
    case 25002: // 小田急江ノ島線
      return { signPath: require('../assets/marks/odakyu/oe.png') };
    case 25003: // 小田急多摩線
      return { signPath: require('../assets/marks/odakyu/ot.png') };
    case 99339: // 箱根登山鉄道鉄道線
      return { signPath: require('../assets/marks/hakone/oh.png') };
    // 京成
    case 23001: // 本線
    case 23002: // 押上
    case 23003: // 金町
    case 23004: // 千葉
    case 23005: // 千原
      return { signPath: require('../assets/marks/keisei/ks.png') };
    case 23006: // 成田スカイアクセス
      return {
        signPath: require('../assets/marks/keisei/ks2.png'),
        subSignPath: require('../assets/marks/hokuso/hs.png'),
      };
    case 99329: // 新京成
      return { signPath: require('../assets/marks/shinkeisei/sl.png') };
    case 99340: // 北総線
      return { signPath: require('../assets/marks/hokuso/hs.png') };

    case 99324: // 芝山線
      return { signPath: require('../assets/marks/shibayama/sr.png') };
    // JR西日本
    case 11405: // 北陸線
    case 11415:
    case 11601: // 琵琶湖線
    case 11602: // 京都線
    case 11603: // 神戸線
    case 11608: // 山陽線
      return { signPath: require('../assets/marks/jrw/a.png') };
    case 11609: // JR山陽本線(姫路～岡山)
      return { signPath: require('../assets/marks/jrw/s2.png') };
    case 11610: // JR山陽本線(岡山～三原)
      return {
        signPath: require('../assets/marks/jrw/w.png'),
        subSignPath: require('../assets/marks/jrw/x.png'),
      };
    case 11709: // 宇野線
      return { signPath: require('../assets/marks/jrw/l2.png') };
    case 11611: // JR山陽本線(三原～岩国)
      return {
        signPath: require('../assets/marks/jrw/g2.png'),
        subSignPath: require('../assets/marks/jrw/r2.png'),
      };
    case 11511: // 草津線
      return { signPath: require('../assets/marks/jrw/c.png') };
    case 11705: // 境線
      return { signPath: require('../assets/marks/jrw/c2.png') };
    case 11618: // 奈良線
      return { signPath: require('../assets/marks/jrw/d.png') };
    case 11616: // JR山陰本線(豊岡～米子)
      return { signPath: require('../assets/marks/jrw/a2.png') };
    case 11701: // JR山陰本線(米子～益田)
      return { signPath: require('../assets/marks/jrw/d.png') };
    case 11614: // 嵯峨野線
    case 11615: // 山陰線
      return { signPath: require('../assets/marks/jrw/e.png') };
    case 11641: // おおさか東線
      return { signPath: require('../assets/marks/jrw/f.png') };
    case 11629: // 宝塚線
    case 11630: // 福知山線
      return {
        signPath: require('../assets/marks/jrw/g.png'),
        subSignPath: require('../assets/marks/jrw/a.png'),
      };
    case 11625: // 東西線
    case 11617: // 学研都市線
      return { signPath: require('../assets/marks/jrw/h.png') };
    case 11632: // 加古川線
      return { signPath: require('../assets/marks/jrw/i.png') };
    case 11635: // 播但線
      return { signPath: require('../assets/marks/jrw/j.png') };
    case 11633: // 姫新線
    case 11634:
      return { signPath: require('../assets/marks/jrw/k.png') };
    case 11622: // 舞鶴線
      return { signPath: require('../assets/marks/jrw/l.png') };
    case 11623: // 大阪環状線
      return { signPath: require('../assets/marks/jrw/o.png') };
    case 11624: // ゆめ咲線
      return { signPath: require('../assets/marks/jrw/p.png') };
    case 11714: // 芸備線
      return { signPath: require('../assets/marks/jrw/p2.png') };
    case 11607: // 大和路線
      return { signPath: require('../assets/marks/jrw/q.png') };
    case 11626: // 阪和線
      return { signPath: require('../assets/marks/jrw/r.png') };
    case 11628: // 関西空港線
      return { signPath: require('../assets/marks/jrw/s.png') };
    case 11636: // 和歌山線
      return { signPath: require('../assets/marks/jrw/t.png') };
    case 11637: // 万葉まほろば線
      return { signPath: require('../assets/marks/jrw/u.png') };
    case 11509: // 関西線
      return { signPath: require('../assets/marks/jrw/v.png') };
    case 11703: // 伯備線
      return { signPath: require('../assets/marks/jrw/v2.png') };
    case 11639: // きのくに線
      return { signPath: require('../assets/marks/jrw/w2.png') };
    case 11715: // 津山線
      return { signPath: require('../assets/marks/jrw/t2.png') };
    case 11713: // 吉備線
      return { signPath: require('../assets/marks/jrw/u2.png') };
    case 11720: // 福塩線
      return { signPath: require('../assets/marks/jrw/z.png') };
    case 11710: // 瀬戸大橋線
      return { signPath: require('../assets/marks/jrw/m.png') };
    case 11631: // 赤穂線
      return {
        signPath: require('../assets/marks/jrw/n.png'),
        subSignPath: require('../assets/marks/jrw/a.png'),
      };
    case 11704: // 因美線
      return { signPath: require('../assets/marks/jrw/b2.png') };
    case 11717: // 可部線
      return { signPath: require('../assets/marks/jrw/b3.png') };
    case 11605: // 湖西線
      return { signPath: require('../assets/marks/jrw/b.png') };
    case 11706: // 木次線
      return { signPath: require('../assets/marks/jrw/e2.png') };
    case 11716: // 呉線
      return { signPath: require('../assets/marks/jrw/y.png') };
    // JR東海
    case 11501: // 東海道本線（熱海〜浜松）
    case 11502: // 東海道本線（浜松〜岐阜）
    case 11503: // 東海道本線（岐阜〜米原）
      return { signPath: require('../assets/marks/jrc/ca.png') };
    case 11505: // 御殿場線
      return { signPath: require('../assets/marks/jrc/cb.png') };
    case 11402: // 身延線
      return { signPath: require('../assets/marks/jrc/cc.png') };
    case 11413: // 飯田線（豊橋～天竜峡）
    case 11414: // 飯田線（天竜峡～辰野）
      return { signPath: require('../assets/marks/jrc/cd.png') };
    case 11506: // 武豊線
      return { signPath: require('../assets/marks/jrc/ce.png') };
    case 11411: // 中央本線
      return { signPath: require('../assets/marks/jrc/cf.png') };
    case 11416: // 高山本線
      return { signPath: require('../assets/marks/jrc/cg.png') };
    case 11507: // 太多線
      return { signPath: require('../assets/marks/jrc/ci.png') };
    case 11508: // 関西本線
      return { signPath: require('../assets/marks/jrc/cj.png') };
    // 名古屋市営地下鉄
    case 99513: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/h.png') };
    case 99514: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/m.png') };
    case 99515: // 名港線
      return { signPath: require('../assets/marks/nagoyamunicipal/e.png') };
    case 99516: // 鶴舞線
      return { signPath: require('../assets/marks/nagoyamunicipal/t.png') };
    case 99517: // 桜通線
      return { signPath: require('../assets/marks/nagoyamunicipal/s.png') };
    case 99518: // 上飯田線
      return { signPath: require('../assets/marks/nagoyamunicipal/k.png') };
    // 名鉄
    case 30001: // 名古屋本線
      return { signPath: require('../assets/marks/meitetsu/nh.png') };
    case 30002: // 豊川線
      return { signPath: require('../assets/marks/meitetsu/tk.png') };
    case 30003: // 西尾線
    case 30004: // 蒲郡線
      return { signPath: require('../assets/marks/meitetsu/gn.png') };
    case 30005: // 三河線
      return { signPath: require('../assets/marks/meitetsu/mu.png') };
    case 30006: // 豊田線
      return { signPath: require('../assets/marks/meitetsu/tt.png') };
    case 30008: // 常滑線
    case 30007: // 空港線
      return { signPath: require('../assets/marks/meitetsu/ta.png') };
    case 30009: // 河和線
    case 30010: // 知多新線
      return { signPath: require('../assets/marks/meitetsu/kc.png') };
    case 30013: // 津島線
    case 30014: // 尾西線
      return { signPath: require('../assets/marks/meitetsu/tb.png') };
    case 30020: // 竹鼻線
    case 30021: // 羽島線
      return { signPath: require('../assets/marks/meitetsu/th.png') };
    case 30015: // 犬山線
      return { signPath: require('../assets/marks/meitetsu/iy.png') };
    case 30016: // 各務原線
      return { signPath: require('../assets/marks/meitetsu/kg.png') };
    case 30017: // 広見線
      return { signPath: require('../assets/marks/meitetsu/hm.png') };
    case 30018: // 小牧線
      return { signPath: require('../assets/marks/meitetsu/km.png') };
    case 30012: // 瀬戸線
      return { signPath: require('../assets/marks/meitetsu/st.png') };
    case 30011: // 築港線
      return { signPath: require('../assets/marks/meitetsu/ch.png') };
    // 南海
    case 32001: // 南海本線
    case 32003: // 南海和歌山港線
    case 32004: // 南海高師浜線
    case 32005: // 南海加太線
    case 32006: // 南海多奈川線
      return { signPath: require('../assets/marks/nankai/main.png') };
    case 32002: // 南海空港線
      return { signPath: require('../assets/marks/nankai/airport.png') };
    case 32007: // 南海高野線
    case 32008: // 南海高野山ケーブル
    case 32009: // 南海汐見橋線
      return { signPath: require('../assets/marks/nankai/koya.png') };
    case 99616: // 泉北高速鉄道線
      return { signPath: require('../assets/marks/senhoku/sb.png') };
    case 99629: // 阪堺線
    case 99628: // 上町線
      return { signPath: require('../assets/marks/hankai/hn.png') };
    case 99610: // 京都市営地下鉄烏丸線
      return { signPath: require('../assets/marks/kyotomunicipal/k.png') };
    case 99611: // 京都市営地下鉄東西線
      return { signPath: require('../assets/marks/kyotomunicipal/t.png') };
    case 99618: // 大阪メトロ御堂筋線
      return { signPath: require('../assets/marks/osakametro/m.png') };
    case 99619: // 大阪メトロ谷町線
      return { signPath: require('../assets/marks/osakametro/t.png') };
    case 99620: // 大阪メトロ四つ橋線
      return { signPath: require('../assets/marks/osakametro/y.png') };
    case 99621: // 大阪メトロ中央線
      return { signPath: require('../assets/marks/osakametro/c.png') };
    case 99622: // 大阪メトロ千日前線
      return { signPath: require('../assets/marks/osakametro/s.png') };
    case 99623: // 大阪メトロ堺筋線
      return { signPath: require('../assets/marks/osakametro/k.png') };
    case 99624: // 大阪メトロ長堀鶴見緑地線
      return { signPath: require('../assets/marks/osakametro/n.png') };
    case 99652: // 大阪メトロ今里筋線
      return { signPath: require('../assets/marks/osakametro/i.png') };
    case 99625: // 南港ポートタウン線
      return { signPath: require('../assets/marks/osakametro/p.png') };
    // 阪急線
    case 34001: // 神戸線
    case 34004: // 今津線
    case 34005: // 甲陽線
    case 34006: // 伊丹線
      return { signPath: require('../assets/marks/hankyu/kobe.png') };
    case 34002: // 宝塚線
    case 34007: // 箕面線
      return { signPath: require('../assets/marks/hankyu/takarazuka.png') };
    case 34003: // 京都線
    case 34008: // 千里線
    case 34009: // 嵐山線
      return { signPath: require('../assets/marks/hankyu/kyoto.png') };
    // 阪神
    case 35001: // 本線
    case 35002: // なんば線
    case 35003: // 武庫川線
      return { signPath: require('../assets/marks/hanshin/hs.png') };
    // 神戸市営地下鉄
    case 99645: // 西神線
    case 99646: // 山手線
      return { signPath: require('../assets/marks/kobemunicipal/seishin.png') };
    case 99647: // 海岸線
      return { signPath: require('../assets/marks/kobemunicipal/kaigan.png') };
    case 99636: // 北神線
      return { signPath: require('../assets/marks/kobemunicipal/seishin.png') };
    case 99637: // 山陽電鉄本線
    case 99638: // 山陽電鉄網干線
      return { signPath: require('../assets/marks/sanyo/sy.png') };
    // 能勢電鉄
    case 99615: // 妙見線
    case 99640: // 日生線
      return { signPath: require('../assets/marks/nose/ns.png') };
    // 神戸高速
    case 99630: // 東西線
    case 99631: // 南北線
    case 99632: // 有馬線
    case 99633: // 三田線
    case 99634: // 公園都市線
    case 99635: // 粟生線
      return { signPath: require('../assets/marks/kobe/kb.png') };
    // 京福
    case 99612: // 嵐山本線
      return { signPath: require('../assets/marks/keihuku/a.png') };
    case 99613: // 北野線
      return { signPath: require('../assets/marks/keihuku/b.png') };
    case 99203: // 弘南鉄道大鰐線
      return { signPath: require('../assets/marks/konan/kw.png') };
    case 99501: // 伊豆急行線
      return { signPath: require('../assets/marks/izukyu/iz.png') };
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
      return { signPath: require('../assets/marks/shinkansen/jrc_g.png') };
    case 1003: // 山陽新幹線
    case 11901: // 博多南線（これは新幹線にするべきなんだろうか）
      return { signPath: require('../assets/marks/shinkansen/jrw_g.png') };
    case 1004: // 東北新幹線
    case 1005: // 上越新幹線
    case 1006: // 上越新幹線(ガーラ湯沢支線)
    case 1007: // 山形新幹線
    case 1008: // 秋田新幹線
      return { signPath: require('../assets/marks/shinkansen/jre_g.png') };
    case 1009: // 北陸新幹線
      return { signPath: require('../assets/marks/shinkansen/jrc_g.png') };
    case 1010: // 九州新幹線
    case 1012: // 西九州新幹線
      return { signPath: require('../assets/marks/shinkansen/jrk_g.png') };
    case 1011:
      return { signPath: require('../assets/marks/shinkansen/jrh_g.png') };
    // 札幌市営地下鉄
    case 99102: // 南北線
      return { signPath: require('../assets/marks/sapporosubway/n_g.png') };
    case 99101: // 東西線
      return { signPath: require('../assets/marks/sapporosubway/t_g.png') };
    case 99103: // 東豊線
      return { signPath: require('../assets/marks/sapporosubway/h_g.png') };
    // JR東日本
    case 11301: // 東海道線（東日本区間）
      return { signPath: require('../assets/marks/jre/jt_g.png') };
    case 11308: // 横須賀線
    case 11314: // 総武本線
    case 11327: // 成田線
      return { signPath: require('../assets/marks/jre/jo_g.png') };
    case 11332: // 京浜東北線
    case 11307: // 根岸線
      return { signPath: require('../assets/marks/jre/jk_g.png') };
    case 11306: // 横浜線
      return { signPath: require('../assets/marks/jre/jh_g.png') };
    case 11303: // 南武線
      return { signPath: require('../assets/marks/jre/jn_g.png') };
    case 11304: // 鶴見線
      return { signPath: require('../assets/marks/jre/ji_g.png') };
    case 11302: // 山手線
      return { signPath: require('../assets/marks/jre/jy_g.png') };
    case 11312: // 中央線快速
    case 11315: // 青梅線
    case 11316: // 五日市線
      return { signPath: require('../assets/marks/jre/jc_g.png') };
    case 11311: // 中央本線
      return {
        signPath: require('../assets/marks/jre/jc_g.png'),
        subSignPath: require('../assets/marks/jre/co_g.png'),
      };
    case 11313: // 中央・総武線各駅停車
      return { signPath: require('../assets/marks/jre/jb_g.png') };
    case 11319: // 宇都宮線
    case 11323: // 高崎線
    case 11343: // 上野東京ライン
      return { signPath: require('../assets/marks/jre/ju_g.png') };
    case 11321: // 埼京線
      return { signPath: require('../assets/marks/jre/ja_g.png') };
    case 11320: // 常磐線
      return {
        signPath: require('../assets/marks/jre/jl_g.png'),
        subSignPath: require('../assets/marks/jre/jj_g.png'),
      };
    case 11326: // 京葉線
      return { signPath: require('../assets/marks/jre/je_g.png') };
    case 11305: // 武蔵野線
      return { signPath: require('../assets/marks/jre/jm_g.png') };
    case 11333: // 湘南新宿ライン
      return { signPath: require('../assets/marks/jre/js_g.png') };
    case 11504: // 伊東線
      return { signPath: require('../assets/marks/jre/jt.png') };
    case 99336: // 東京モノレール
      return { signPath: require('../assets/marks/tokyomonorail/mo_g.png') };
    case 99337: // りんかい線
      return { signPath: require('../assets/marks/twr/r_g.png') };
    // 西武線
    case 22001: // 池袋線
    case 22002: // 秩父線
    case 22003: // 有楽町線
    case 22004: // 豊島線
    case 22005: // 狭山線
      return { signPath: require('../assets/marks/seibu/si_g.png') };
    case 22006: // 西武山口線
      return { signPath: require('../assets/marks/seibu/sy.png') };
    case 22007: // 新宿線
    case 22008: // 拝島線
      return { signPath: require('../assets/marks/seibu/ss_g.png') };
    case 22009: // 西武園線
    case 22010: // 国分寺線
      return { signPath: require('../assets/marks/seibu/sk_g.png') };
    case 22011: // 多摩湖線
      return { signPath: require('../assets/marks/seibu/st_g.png') };
    case 22012: // 多摩川線
      return { signPath: require('../assets/marks/seibu/sw_g.png') };
    // 東武
    case 21001: // 東上線
    case 21007: // 越生線
      return { signPath: require('../assets/marks/tobu/tj_g.png') };
    case 21002: // 伊勢崎線（スカイツリーライン）
      return {
        signPath: require('../assets/marks/tobu/ti_g.png'),
        subSignPath: require('../assets/marks/tobu/ts_g.png'),
      };
    case 21005: // 亀戸線
    case 21006: // 大師線
      return { signPath: require('../assets/marks/tobu/ts_g.png') };
    case 21010: // 佐野線
    case 21011: // 桐生線
    case 21012: // 小泉線
      return { signPath: require('../assets/marks/tobu/ti_g.png') };
    case 21003: // 日光線
    case 21008: // 宇都宮線
    case 21009: // 鬼怒川線
      return { signPath: require('../assets/marks/tobu/tn_g.png') };
    case 21004: // 野田線
      return { signPath: require('../assets/marks/tobu/td_g.png') };
    // 京急
    case 27001: // 本線
    case 27002: // 空港線
    case 27003: // 大師線
    case 27004: // 逗子線
    case 27005: // 久里浜線
      return { signPath: require('../assets/marks/keikyu/kk_g.png') };
    // 東急
    case 26001: // 東横線
      return { signPath: require('../assets/marks/tokyu/ty_g.png') };
    case 26002: // 目黒線
      return { signPath: require('../assets/marks/tokyu/mg_g.png') };
    case 26003: // 田園都市線
      return { signPath: require('../assets/marks/tokyu/dt_g.png') };
    case 26004: // 大井町線
      return { signPath: require('../assets/marks/tokyu/om_g.png') };
    case 26005: // 池上線
      return { signPath: require('../assets/marks/tokyu/ik_g.png') };
    case 26006: // 多摩川線
      return { signPath: require('../assets/marks/tokyu/tm_g.png') };
    case 26007: // 世田谷線
      return { signPath: require('../assets/marks/tokyu/sg_g.png') };
    case 26008: // こどもの国線
      return { signPath: require('../assets/marks/tokyu/kd_g.png') };
    case 26009: // 東急新横浜線
      return { signPath: require('../assets/marks/tokyu/sh_g.png') };
    case 99310: // みなとみらい線
      return { signPath: require('../assets/marks/minatomirai/mm_g.png') };
    // 相鉄
    case 29001: // 本線
    case 29002: // いずみ野線
    case 29003: // 新横浜線
      return { signPath: require('../assets/marks/sotetsu/so_g.png') };
    // 横浜市交通局
    case 99316: // ブルーライン
      return { signPath: require('../assets/marks/yokohamamunicipal/b_g.png') };
    case 99343: // グリーンライン
      return { signPath: require('../assets/marks/yokohamamunicipal/g_g.png') };
    case 99320: // 江ノ電
      return { signPath: require('../assets/marks/enoden/en_g.png') };
    case 99338: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/toyorapid/tr_g.png') };
    case 99307: // 東葉高速鉄道線
      return { signPath: require('../assets/marks/saitamarapid/sr_g.png') };
    case 99334: // 多摩都市モノレール
      return { signPath: require('../assets/marks/tamamonorail/tt_g.png') };
    case 99321: // ニューシャトル
      return { signPath: require('../assets/marks/newshuttle/ns_g.png') };
    case 99335: // 銚子電鉄線
      return { signPath: require('../assets/marks/choshi/cd_g.png') };
    case 99331: // 千葉都市モノレール
    case 99332: // 千葉都市モノレール
      return { signPath: require('../assets/marks/chibamonorail/cm_g.png') };
    case 28001: // 東京メトロ銀座線
      return { signPath: require('../assets/marks/tokyometro/g_g.png') };
    case 28002: // 東京メトロ丸ノ内線
      return { signPath: require('../assets/marks/tokyometro/m_g.png') };
    case 28003: // 東京メトロ日比谷線
      return { signPath: require('../assets/marks/tokyometro/h_g.png') };
    case 28004: // 東京メトロ東西線
      return { signPath: require('../assets/marks/tokyometro/t_g.png') };
    case 28005: // 東京メトロ千代田線
      return { signPath: require('../assets/marks/tokyometro/c_g.png') };
    case 28006: // 東京メトロ有楽町線
      return { signPath: require('../assets/marks/tokyometro/y_g.png') };
    case 28008: // 東京メトロ半蔵門線
      return { signPath: require('../assets/marks/tokyometro/z_g.png') };
    case 28009: // 東京メトロ南北線
      return { signPath: require('../assets/marks/tokyometro/n_g.png') };
    case 28010: // 東京メトロ副都心線
      return { signPath: require('../assets/marks/tokyometro/f_g.png') };
    case 99302: // 都営浅草線
      return { signPath: require('../assets/marks/toei/a_g.png') };
    case 99303: // 都営三田線
      return { signPath: require('../assets/marks/toei/i_g.png') };
    case 99304: // 都営新宿線
      return { signPath: require('../assets/marks/toei/s_g.png') };
    case 99301: // 都営大江戸線
      return { signPath: require('../assets/marks/toei/e_g.png') };
    case 99311: // ゆりかもめ
      return { signPath: require('../assets/marks/yurikamome/u_g.png') };
    case 99305: // 都電荒川線
      return { signPath: require('../assets/marks/toden/sa_g.png') };
    case 99342: // 日暮里舎人ライナー
      return {
        signPath: require('../assets/marks/nippori-toneri-liner/nt_g.png'),
      };
    // 京王線
    case 24001:
    case 24002:
    case 24003:
    case 24004:
    case 24005:
    case 24007:
      return { signPath: require('../assets/marks/keio/ko_g.png') };
    case 24006: // 井の頭線
      return { signPath: require('../assets/marks/keio/in_g.png') };
    case 25001: // 小田急小田原線
      return { signPath: require('../assets/marks/odakyu/oh_g.png') };
    case 25002: // 小田急江ノ島線
      return { signPath: require('../assets/marks/odakyu/oe_g.png') };
    case 25003: // 小田急多摩線
      return { signPath: require('../assets/marks/odakyu/ot_g.png') };
    case 99339: // 箱根登山鉄道鉄道線
      return { signPath: require('../assets/marks/hakone/oh_g.png') };
    // 京成
    case 23001: // 本線
    case 23002: // 押上
    case 23003: // 金町
    case 23004: // 千葉
    case 23005: // 千原
      return { signPath: require('../assets/marks/keisei/ks_g.png') };
    case 23006: // 成田スカイアクセス
      return {
        signPath: require('../assets/marks/keisei/ks2_g.png'),
        subSignPath: require('../assets/marks/hokuso/hs_g.png'),
      };
    case 99329: // 新京成
      return { signPath: require('../assets/marks/shinkeisei/sl_g.png') };
    case 99340: // 北総線
      return { signPath: require('../assets/marks/hokuso/hs_g.png') };
    case 99324: // 芝山線
      return { signPath: require('../assets/marks/shibayama/sr_g.png') };
    // JR西日本
    case 11405: // 北陸線
    case 11415:
    case 11601: // 琵琶湖線
    case 11602: // 京都線
    case 11603: // 神戸線
    case 11608: // 山陽線
      return { signPath: require('../assets/marks/jrw/a_g.png') };
    case 11609: // JR山陽本線(姫路～岡山)
      return { signPath: require('../assets/marks/jrw/s2_g.png') };
    case 11610: // JR山陽本線(岡山～三原)
      return {
        signPath: require('../assets/marks/jrw/w_g.png'),
        subSignPath: require('../assets/marks/jrw/x_g.png'),
      };
    case 11709: // 宇野線
      return { signPath: require('../assets/marks/jrw/l2_g.png') };
    case 11611: // JR山陽本線(三原～岩国)
      return {
        signPath: require('../assets/marks/jrw/g2_g.png'),
        subSignPath: require('../assets/marks/jrw/r2_g.png'),
      };
    case 11511: // 草津線
      return { signPath: require('../assets/marks/jrw/c_g.png') };
    case 11705: // 境線
      return { signPath: require('../assets/marks/jrw/c2_g.png') };
    case 11618: // 奈良線
      return { signPath: require('../assets/marks/jrw/d_g.png') };
    case 11616: // JR山陰本線(豊岡～米子)
      return { signPath: require('../assets/marks/jrw/a2_g.png') };
    case 11701: // JR山陰本線(米子～益田)
      return { signPath: require('../assets/marks/jrw/d_g.png') };
    case 11614: // 嵯峨野線
    case 11615: // 山陰線
      return { signPath: require('../assets/marks/jrw/e_g.png') };
    case 11641: // おおさか東線
      return { signPath: require('../assets/marks/jrw/f_g.png') };
    case 11629: // 宝塚線
    case 11630: // 福知山線
      return {
        signPath: require('../assets/marks/jrw/g_g.png'),
        subSignPath: require('../assets/marks/jrw/a_g.png'),
      };
    case 11625: // 東西線
    case 11617: // 学研都市線
      return { signPath: require('../assets/marks/jrw/h_g.png') };
    case 11632: // 加古川線
      return { signPath: require('../assets/marks/jrw/i_g.png') };
    case 11635: // 播但線
      return { signPath: require('../assets/marks/jrw/j_g.png') };
    case 11633: // 姫新線
    case 11634:
      return { signPath: require('../assets/marks/jrw/k_g.png') };
    case 11622: // 舞鶴線
      return { signPath: require('../assets/marks/jrw/l_g.png') };
    case 11623: // 大阪環状線
      return { signPath: require('../assets/marks/jrw/o_g.png') };
    case 11624: // ゆめ咲線
      return { signPath: require('../assets/marks/jrw/p_g.png') };
    case 11714: // 芸備線
      return { signPath: require('../assets/marks/jrw/p2_g.png') };
    case 11607: // 大和路線
      return { signPath: require('../assets/marks/jrw/q_g.png') };
    case 11626: // 阪和線
      return { signPath: require('../assets/marks/jrw/r_g.png') };
    case 11628: // 関西空港線
      return { signPath: require('../assets/marks/jrw/s_g.png') };
    case 11636: // 和歌山線
      return { signPath: require('../assets/marks/jrw/t_g.png') };
    case 11637: // 万葉まほろば線
      return { signPath: require('../assets/marks/jrw/u_g.png') };
    case 11509: // 関西線
      return { signPath: require('../assets/marks/jrw/v_g.png') };
    case 11703: // 伯備線
      return { signPath: require('../assets/marks/jrw/v2_g.png') };
    case 11639: // きのくに線
      return { signPath: require('../assets/marks/jrw/w2_g.png') };
    case 11715: // 津山線
      return { signPath: require('../assets/marks/jrw/t2_g.png') };
    case 11713: // 吉備線
      return { signPath: require('../assets/marks/jrw/u2_g.png') };
    case 11720: // 福塩線
      return { signPath: require('../assets/marks/jrw/z_g.png') };
    case 11710: // 瀬戸大橋線
      return { signPath: require('../assets/marks/jrw/m_g.png') };
    case 11631: // 赤穂線
      return {
        signPath: require('../assets/marks/jrw/n_g.png'),
        subSignPath: require('../assets/marks/jrw/a_g.png'),
      };
    case 11704: // 因美線
      return { signPath: require('../assets/marks/jrw/b2_g.png') };
    case 11717: // 可部線
      return { signPath: require('../assets/marks/jrw/b3_g.png') };
    case 11605: // 湖西線
      return { signPath: require('../assets/marks/jrw/b_g.png') };
    case 11706: // 木次線
      return { signPath: require('../assets/marks/jrw/e2_g.png') };
    case 11716: // 呉線
      return { signPath: require('../assets/marks/jrw/y_g.png') };
    // JR東海
    case 11501: // 東海道本線（熱海〜浜松）
    case 11502: // 東海道本線（浜松〜岐阜）
    case 11503: // 東海道本線（岐阜〜米原）
      return { signPath: require('../assets/marks/jrc/ca_g.png') };
    case 11505: // 御殿場線
      return { signPath: require('../assets/marks/jrc/cb_g.png') };
    case 11402: // 身延線
      return { signPath: require('../assets/marks/jrc/cc_g.png') };
    case 11413: // 飯田線（豊橋～天竜峡）
    case 11414: // 飯田線（天竜峡～辰野）
      return { signPath: require('../assets/marks/jrc/cd_g.png') };
    case 11506: // 武豊線
      return { signPath: require('../assets/marks/jrc/ce_g.png') };
    case 11411: // 中央本線
      return { signPath: require('../assets/marks/jrc/cf_g.png') };
    case 11416: // 高山本線
      return { signPath: require('../assets/marks/jrc/cg_g.png') };
    case 11507: // 太多線
      return { signPath: require('../assets/marks/jrc/ci_g.png') };
    case 11508: // 関西本線
      return { signPath: require('../assets/marks/jrc/cj_g.png') };
    // 名古屋市営地下鉄
    case 99513: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/h_g.png') };
    case 99514: // 東山線
      return { signPath: require('../assets/marks/nagoyamunicipal/m_g.png') };
    case 99515: // 名港線
      return { signPath: require('../assets/marks/nagoyamunicipal/e_g.png') };
    case 99516: // 鶴舞線
      return { signPath: require('../assets/marks/nagoyamunicipal/t_g.png') };
    case 99517: // 桜通線
      return { signPath: require('../assets/marks/nagoyamunicipal/s_g.png') };
    case 99518: // 上飯田線
      return { signPath: require('../assets/marks/nagoyamunicipal/k_g.png') };
    // 名鉄
    case 30001: // 名古屋本線
      return { signPath: require('../assets/marks/meitetsu/nh_g.png') };
    case 30002: // 豊川線
      return { signPath: require('../assets/marks/meitetsu/tk_g.png') };
    case 30003: // 西尾線
    case 30004: // 蒲郡線
      return { signPath: require('../assets/marks/meitetsu/gn_g.png') };
    case 30005: // 三河線
      return { signPath: require('../assets/marks/meitetsu/mu_g.png') };
    case 30006: // 豊田線
      return { signPath: require('../assets/marks/meitetsu/tt_g.png') };
    case 30008: // 常滑線
    case 30007: // 空港線
      return { signPath: require('../assets/marks/meitetsu/ta_g.png') };
    case 30009: // 河和線
    case 30010: // 知多新線
      return { signPath: require('../assets/marks/meitetsu/kc_g.png') };
    case 30013: // 津島線
    case 30014: // 尾西線
      return { signPath: require('../assets/marks/meitetsu/tb_g.png') };
    case 30020: // 竹鼻線
    case 30021: // 羽島線
      return { signPath: require('../assets/marks/meitetsu/th_g.png') };
    case 30015: // 犬山線
      return { signPath: require('../assets/marks/meitetsu/iy_g.png') };
    case 30016: // 各務原線
      return { signPath: require('../assets/marks/meitetsu/kg_g.png') };
    case 30017: // 広見線
      return { signPath: require('../assets/marks/meitetsu/hm_g.png') };
    case 30018: // 小牧線
      return { signPath: require('../assets/marks/meitetsu/km_g.png') };
    case 30012: // 瀬戸線
      return { signPath: require('../assets/marks/meitetsu/st_g.png') };
    case 30011: // 築港線
      return { signPath: require('../assets/marks/meitetsu/ch_g.png') };
    // 南海
    case 32001: // 南海本線
    case 32003: // 南海和歌山港線
    case 32004: // 南海高師浜線
    case 32005: // 南海加太線
    case 32006: // 南海多奈川線
      return { signPath: require('../assets/marks/nankai/main_g.png') };
    case 32002: // 南海空港線
      return { signPath: require('../assets/marks/nankai/airport_g.png') };
    case 32007: // 南海高野線
    case 32008: // 南海高野山ケーブル
    case 32009: // 南海汐見橋線
      return { signPath: require('../assets/marks/nankai/koya_g.png') };
    case 99616: // 泉北高速鉄道線
      return { signPath: require('../assets/marks/senhoku/sb_g.png') };
    case 99629: // 阪堺線
    case 99628: // 上町線
      return { signPath: require('../assets/marks/hankai/hn_g.png') };
    case 99610: // 京都市営地下鉄烏丸線
      return { signPath: require('../assets/marks/kyotomunicipal/k_g.png') };
    case 99611: // 京都市営地下鉄東西線
      return { signPath: require('../assets/marks/kyotomunicipal/t_g.png') };
    case 99618: // 大阪メトロ御堂筋線
      return { signPath: require('../assets/marks/osakametro/m_g.png') };
    case 99619: // 大阪メトロ谷町線
      return { signPath: require('../assets/marks/osakametro/t_g.png') };
    case 99620: // 大阪メトロ四つ橋線
      return { signPath: require('../assets/marks/osakametro/y_g.png') };
    case 99621: // 大阪メトロ中央線
      return { signPath: require('../assets/marks/osakametro/c_g.png') };
    case 99622: // 大阪メトロ千日前線
      return { signPath: require('../assets/marks/osakametro/s_g.png') };
    case 99623: // 大阪メトロ堺筋線
      return { signPath: require('../assets/marks/osakametro/k_g.png') };
    case 99624: // 大阪メトロ長堀鶴見緑地線
      return { signPath: require('../assets/marks/osakametro/n_g.png') };
    case 99652: // 大阪メトロ今里筋線
      return { signPath: require('../assets/marks/osakametro/i_g.png') };
    case 99625: // 南港ポートタウン線
      return { signPath: require('../assets/marks/osakametro/p_g.png') };
    // 阪急線
    case 34001: // 神戸線
    case 34004: // 今津線
    case 34005: // 甲陽線
    case 34006: // 伊丹線
      return { signPath: require('../assets/marks/hankyu/kobe_g.png') };
    case 34002: // 宝塚線
    case 34007: // 箕面線
      return { signPath: require('../assets/marks/hankyu/takarazuka_g.png') };
    case 34003: // 京都線
    case 34008: // 千里線
    case 34009: // 嵐山線
      return { signPath: require('../assets/marks/hankyu/kyoto_g.png') };
    // 阪神
    case 35001: // 本線
    case 35002: // なんば線
    case 35003: // 武庫川線
      return { signPath: require('../assets/marks/hanshin/hs_g.png') };
    // 神戸市営地下鉄
    case 99645: // 西神線
    case 99646: // 山手線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin_g.png'),
      };
    case 99647: // 海岸線
      return {
        signPath: require('../assets/marks/kobemunicipal/kaigan_g.png'),
      };
    case 99636: // 北神線
      return {
        signPath: require('../assets/marks/kobemunicipal/seishin_g.png'),
      };
    case 99637: // 山陽電鉄本線
    case 99638: // 山陽電鉄網干線
      return { signPath: require('../assets/marks/sanyo/sy_g.png') };
    // 能勢電鉄
    case 99615: // 妙見線
    case 99640: // 日生線
      return { signPath: require('../assets/marks/nose/ns_g.png') };
    // 神戸高速
    case 99630: // 東西線
    case 99631: // 南北線
    case 99632: // 有馬線
    case 99633: // 三田線
    case 99634: // 公園都市線
    case 99635: // 粟生線
      return { signPath: require('../assets/marks/kobe/kb_g.png') };
    // 京福
    case 99612: // 嵐山本線
      return { signPath: require('../assets/marks/keihuku/a_g.png') };
    case 99613: // 北野線
      return { signPath: require('../assets/marks/keihuku/b_g.png') };
    case 99203: // 弘南鉄道大鰐線
      return { signPath: require('../assets/marks/konan/kw_g.png') };
    case 99501: // 伊豆急行線
      return { signPath: require('../assets/marks/izukyu/iz_g.png') };
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

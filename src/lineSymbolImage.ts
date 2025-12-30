import type { Line } from '~/@types/graphql';

export type LineSymbolImage = {
  signPath?: number;
  subSignPath?: number;
  extraSignPath?: number;
};

export type LineSymbolImageWithImage = Partial<LineSymbolImage> & {
  signShape?: string;
};

const LINE_SYMBOL_IMAGE_WITH_COLOR: Record<number, LineSymbolImage> = {
  // 新幹線
  1002: { signPath: require('../assets/marks/shinkansen/jrc.webp') }, // 東海道新幹線
  1003: { signPath: require('../assets/marks/shinkansen/jrw.webp') }, // 山陽新幹線
  11901: { signPath: require('../assets/marks/shinkansen/jrw.webp') }, // 博多南線（これは新幹線にするべきなんだろうか）
  1004: { signPath: require('../assets/marks/shinkansen/jre.webp') }, // 東北新幹線
  1005: { signPath: require('../assets/marks/shinkansen/jre.webp') }, // 上越新幹線
  1006: { signPath: require('../assets/marks/shinkansen/jre.webp') }, // 上越新幹線(ガーラ湯沢支線)
  1007: { signPath: require('../assets/marks/shinkansen/jre.webp') }, // 山形新幹線
  1008: { signPath: require('../assets/marks/shinkansen/jre.webp') }, // 秋田新幹線
  1009: { signPath: require('../assets/marks/shinkansen/jrc.webp') }, // 北陸新幹線
  1010: { signPath: require('../assets/marks/shinkansen/jrk.webp') }, // 九州新幹線
  1012: { signPath: require('../assets/marks/shinkansen/jrk.webp') }, // 西九州新幹線
  1011: { signPath: require('../assets/marks/shinkansen/jrh.webp') },
  // 札幌市営地下鉄
  99102: { signPath: require('../assets/marks/sapporosubway/n.webp') }, // 南北線
  99101: { signPath: require('../assets/marks/sapporosubway/t.webp') }, // 東西線
  99103: { signPath: require('../assets/marks/sapporosubway/h.webp') }, // 東豊線
  // JR東日本
  11301: { signPath: require('../assets/marks/jre/jt.webp') }, // 東海道線（東日本区間）
  11308: { signPath: require('../assets/marks/jre/jo.webp') }, // 横須賀線
  11314: { signPath: require('../assets/marks/jre/jo.webp') }, // 総武本線
  11327: { signPath: require('../assets/marks/jre/jo.webp') }, // 成田線
  11332: { signPath: require('../assets/marks/jre/jk.webp') }, // 京浜東北線
  11307: { signPath: require('../assets/marks/jre/jk.webp') }, // 根岸線
  11306: { signPath: require('../assets/marks/jre/jh.webp') }, // 横浜線
  11303: { signPath: require('../assets/marks/jre/jn.webp') }, // 南武線
  11304: { signPath: require('../assets/marks/jre/ji.webp') }, // 鶴見線
  11302: { signPath: require('../assets/marks/jre/jy.webp') }, // 山手線
  11312: { signPath: require('../assets/marks/jre/jc.webp') }, // 中央線快速
  11315: { signPath: require('../assets/marks/jre/jc.webp') }, // 青梅線
  11316: { signPath: require('../assets/marks/jre/jc.webp') }, // 五日市線
  11311: {
    signPath: require('../assets/marks/jre/jc.webp'),
    subSignPath: require('../assets/marks/jre/co.webp'),
  }, // 中央本線
  11313: { signPath: require('../assets/marks/jre/jb.webp') }, // 中央・総武線各駅停車
  11319: { signPath: require('../assets/marks/jre/ju.webp') }, // 宇都宮線
  11323: { signPath: require('../assets/marks/jre/ju.webp') }, // 高崎線
  11343: { signPath: require('../assets/marks/jre/ju.webp') }, // 上野東京ライン
  11321: { signPath: require('../assets/marks/jre/ja.webp') }, // 埼京線
  11229: { signPath: require('../assets/marks/jre/jj.webp') }, // JR常磐線(取手～いわき)
  11320: { signPath: require('../assets/marks/jre/jj.webp') }, // JR常磐線(上野～取手)
  11344: { signPath: require('../assets/marks/jre/jl.webp') }, // JR常磐線(緩行線)
  11326: { signPath: require('../assets/marks/jre/je.webp') }, // 京葉線
  11305: { signPath: require('../assets/marks/jre/jm.webp') }, // 武蔵野線
  11333: { signPath: require('../assets/marks/jre/js.webp') }, // 湘南新宿ライン
  11504: { signPath: require('../assets/marks/jre/jt.webp') }, // 伊東線
  99336: { signPath: require('../assets/marks/tokyomonorail/mo.webp') }, // 東京モノレール
  99337: { signPath: require('../assets/marks/twr/r.webp') }, // りんかい線
  // 西武線
  22001: { signPath: require('../assets/marks/seibu/si.webp') }, // 池袋線
  22002: { signPath: require('../assets/marks/seibu/si.webp') }, // 秩父線
  22003: { signPath: require('../assets/marks/seibu/si.webp') }, // 有楽町線
  22004: { signPath: require('../assets/marks/seibu/si.webp') }, // 豊島線
  22005: { signPath: require('../assets/marks/seibu/si.webp') }, // 狭山線
  22006: { signPath: require('../assets/marks/seibu/sy.webp') }, // 西武山口線
  22007: { signPath: require('../assets/marks/seibu/ss.webp') }, // 新宿線
  22008: { signPath: require('../assets/marks/seibu/ss.webp') }, // 拝島線
  22009: { signPath: require('../assets/marks/seibu/sk.webp') }, // 西武園線
  22010: { signPath: require('../assets/marks/seibu/sk.webp') }, // 国分寺線
  22011: { signPath: require('../assets/marks/seibu/st.webp') }, // 多摩湖線
  22012: { signPath: require('../assets/marks/seibu/sw.webp') }, // 多摩川線
  // 東武
  21001: { signPath: require('../assets/marks/tobu/tj.webp') }, // 東上線
  21007: { signPath: require('../assets/marks/tobu/tj.webp') }, // 越生線
  21002: {
    signPath: require('../assets/marks/tobu/ti.webp'),
    subSignPath: require('../assets/marks/tobu/ts.webp'),
  }, // 伊勢崎線（スカイツリーライン）
  21005: { signPath: require('../assets/marks/tobu/ts.webp') }, // 亀戸線
  21006: { signPath: require('../assets/marks/tobu/ts.webp') }, // 大師線
  21010: { signPath: require('../assets/marks/tobu/ti.webp') }, // 佐野線
  21011: { signPath: require('../assets/marks/tobu/ti.webp') }, // 桐生線
  21012: { signPath: require('../assets/marks/tobu/ti.webp') }, // 小泉線
  21003: { signPath: require('../assets/marks/tobu/tn.webp') }, // 日光線
  21008: { signPath: require('../assets/marks/tobu/tn.webp') }, // 宇都宮線
  21009: { signPath: require('../assets/marks/tobu/tn.webp') }, // 鬼怒川線
  21004: { signPath: require('../assets/marks/tobu/td.webp') }, // 野田線
  // 京急
  27001: { signPath: require('../assets/marks/keikyu/kk.webp') }, // 本線
  27002: { signPath: require('../assets/marks/keikyu/kk.webp') }, // 空港線
  27003: { signPath: require('../assets/marks/keikyu/kk.webp') }, // 大師線
  27004: { signPath: require('../assets/marks/keikyu/kk.webp') }, // 逗子線
  27005: { signPath: require('../assets/marks/keikyu/kk.webp') }, // 久里浜線
  // 東急
  26001: { signPath: require('../assets/marks/tokyu/ty.webp') }, // 東横線
  26002: { signPath: require('../assets/marks/tokyu/mg.webp') }, // 目黒線
  26003: { signPath: require('../assets/marks/tokyu/dt.webp') }, // 田園都市線
  26004: { signPath: require('../assets/marks/tokyu/om.webp') }, // 大井町線
  26005: { signPath: require('../assets/marks/tokyu/ik.webp') }, // 池上線
  26006: { signPath: require('../assets/marks/tokyu/tm.webp') }, // 多摩川線
  26007: { signPath: require('../assets/marks/tokyu/sg.webp') }, // 世田谷線
  26008: { signPath: require('../assets/marks/tokyu/kd.webp') }, // こどもの国線
  26009: { signPath: require('../assets/marks/tokyu/sh.webp') }, // 東急新横浜線
  99310: { signPath: require('../assets/marks/minatomirai/mm.webp') }, // みなとみらい線
  // 相鉄
  29001: { signPath: require('../assets/marks/sotetsu/so.webp') }, // 本線
  29002: { signPath: require('../assets/marks/sotetsu/so.webp') }, // いずみ野線
  29003: { signPath: require('../assets/marks/sotetsu/so.webp') }, // 相鉄・JR直通線
  29004: { signPath: require('../assets/marks/sotetsu/so.webp') }, // 新横浜線
  // 横浜市交通局
  99316: { signPath: require('../assets/marks/yokohamamunicipal/b.webp') }, // ブルーライン
  99343: { signPath: require('../assets/marks/yokohamamunicipal/g.webp') }, // グリーンライン
  99320: { signPath: require('../assets/marks/enoden/en.webp') }, // 江ノ電
  99338: { signPath: require('../assets/marks/toyorapid/tr.webp') }, // 東葉高速鉄道線
  99307: { signPath: require('../assets/marks/saitamarapid/sr.webp') }, // 埼玉高速鉄道線
  99334: { signPath: require('../assets/marks/tamamonorail/tt.webp') }, // 多摩都市モノレール
  99321: { signPath: require('../assets/marks/newshuttle/ns.webp') }, // ニューシャトル
  99335: { signPath: require('../assets/marks/choshi/cd.webp') }, // 銚子電鉄線
  99331: { signPath: require('../assets/marks/chibamonorail/cm.webp') }, // 千葉都市モノレール
  99332: { signPath: require('../assets/marks/chibamonorail/cm.webp') }, // 千葉都市モノレール
  28001: { signPath: require('../assets/marks/tokyometro/g.webp') }, // 東京メトロ銀座線
  28002: { signPath: require('../assets/marks/tokyometro/m.webp') }, // 東京メトロ丸ノ内線
  28003: { signPath: require('../assets/marks/tokyometro/h.webp') }, // 東京メトロ日比谷線
  28004: { signPath: require('../assets/marks/tokyometro/t.webp') }, // 東京メトロ東西線
  28005: { signPath: require('../assets/marks/tokyometro/c.webp') }, // 東京メトロ千代田線
  28006: { signPath: require('../assets/marks/tokyometro/y.webp') }, // 東京メトロ有楽町線
  28008: { signPath: require('../assets/marks/tokyometro/z.webp') }, // 東京メトロ半蔵門線
  28009: { signPath: require('../assets/marks/tokyometro/n.webp') }, // 東京メトロ南北線
  28010: { signPath: require('../assets/marks/tokyometro/f.webp') }, // 東京メトロ副都心線
  99302: { signPath: require('../assets/marks/toei/a.webp') }, // 都営浅草線
  99303: { signPath: require('../assets/marks/toei/i.webp') }, // 都営三田線
  99304: { signPath: require('../assets/marks/toei/s.webp') }, // 都営新宿線
  99301: { signPath: require('../assets/marks/toei/e.webp') }, // 都営大江戸線
  99311: { signPath: require('../assets/marks/yurikamome/u.webp') }, // ゆりかもめ
  99305: { signPath: require('../assets/marks/toden/sa.webp') }, // 都電荒川線
  99342: {
    signPath: require('../assets/marks/nippori-toneri-liner/nt.webp'),
  }, // 日暮里舎人ライナー
  // 京王線
  24001: { signPath: require('../assets/marks/keio/ko.webp') },
  24002: { signPath: require('../assets/marks/keio/ko.webp') },
  24003: { signPath: require('../assets/marks/keio/ko.webp') },
  24004: { signPath: require('../assets/marks/keio/ko.webp') },
  24005: { signPath: require('../assets/marks/keio/ko.webp') },
  24007: { signPath: require('../assets/marks/keio/ko.webp') },
  24006: { signPath: require('../assets/marks/keio/in.webp') }, // 井の頭線
  25001: { signPath: require('../assets/marks/odakyu/oh.webp') }, // 小田急小田原線
  25002: { signPath: require('../assets/marks/odakyu/oe.webp') }, // 小田急江ノ島線
  25003: { signPath: require('../assets/marks/odakyu/ot.webp') }, // 小田急多摩線
  99339: { signPath: require('../assets/marks/hakone/oh.webp') }, // 箱根登山鉄道鉄道線
  // 京成
  23001: { signPath: require('../assets/marks/keisei/ks.webp') }, // 本線
  23002: { signPath: require('../assets/marks/keisei/ks.webp') }, // 押上
  23003: { signPath: require('../assets/marks/keisei/ks.webp') }, // 金町
  23004: { signPath: require('../assets/marks/keisei/ks.webp') }, // 千葉
  23005: { signPath: require('../assets/marks/keisei/ks.webp') }, // 千原
  23006: {
    signPath: require('../assets/marks/keisei/ks2.webp'),
    subSignPath: require('../assets/marks/hokuso/hs.webp'),
  }, // 成田スカイアクセス
  99329: { signPath: require('../assets/marks/keisei/ks.webp') }, // 新京成
  99340: { signPath: require('../assets/marks/hokuso/hs.webp') }, // 北総線
  99324: { signPath: require('../assets/marks/shibayama/sr.webp') }, // 芝山線
  // JR西日本
  11405: { signPath: require('../assets/marks/jrw/a.webp') }, // 北陸線
  11415: { signPath: require('../assets/marks/jrw/a.webp') },
  11601: { signPath: require('../assets/marks/jrw/a.webp') }, // 琵琶湖線
  11602: { signPath: require('../assets/marks/jrw/a.webp') }, // 京都線
  11603: { signPath: require('../assets/marks/jrw/a.webp') }, // 神戸線
  11608: { signPath: require('../assets/marks/jrw/a.webp') }, // 山陽線
  11609: { signPath: require('../assets/marks/jrw/s2.webp') }, // JR山陽本線(姫路～岡山)
  11610: {
    signPath: require('../assets/marks/jrw/w.webp'),
    subSignPath: require('../assets/marks/jrw/x.webp'),
  }, // JR山陽本線(岡山～三原)
  11709: { signPath: require('../assets/marks/jrw/l2.webp') }, // 宇野線
  11611: {
    signPath: require('../assets/marks/jrw/g2.webp'),
    subSignPath: require('../assets/marks/jrw/r2.webp'),
  }, // JR山陽本線(三原～岩国)
  11511: { signPath: require('../assets/marks/jrw/c.webp') }, // 草津線
  11705: { signPath: require('../assets/marks/jrw/c2.webp') }, // 境線
  11618: { signPath: require('../assets/marks/jrw/d.webp') }, // 奈良線
  11616: { signPath: require('../assets/marks/jrw/a2.webp') }, // JR山陰本線(豊岡～米子)
  11701: { signPath: require('../assets/marks/jrw/d.webp') }, // JR山陰本線(米子～益田)
  11614: { signPath: require('../assets/marks/jrw/e.webp') }, // 嵯峨野線
  11615: { signPath: require('../assets/marks/jrw/e.webp') }, // 山陰線
  11641: { signPath: require('../assets/marks/jrw/f.webp') }, // おおさか東線
  11629: {
    signPath: require('../assets/marks/jrw/g.webp'),
    subSignPath: require('../assets/marks/jrw/a.webp'),
  }, // 宝塚線
  11630: {
    signPath: require('../assets/marks/jrw/g.webp'),
    subSignPath: require('../assets/marks/jrw/a.webp'),
  }, // 福知山線
  11625: { signPath: require('../assets/marks/jrw/h.webp') }, // 東西線
  11617: { signPath: require('../assets/marks/jrw/h.webp') }, // 学研都市線
  11632: { signPath: require('../assets/marks/jrw/i.webp') }, // 加古川線
  11635: { signPath: require('../assets/marks/jrw/j.webp') }, // 播但線
  11633: { signPath: require('../assets/marks/jrw/k.webp') }, // 姫新線
  11634: { signPath: require('../assets/marks/jrw/k.webp') },
  11622: { signPath: require('../assets/marks/jrw/l.webp') }, // 舞鶴線
  11623: { signPath: require('../assets/marks/jrw/o.webp') }, // 大阪環状線
  11624: { signPath: require('../assets/marks/jrw/p.webp') }, // ゆめ咲線
  11714: { signPath: require('../assets/marks/jrw/p2.webp') }, // 芸備線
  11607: { signPath: require('../assets/marks/jrw/q.webp') }, // 大和路線
  11626: { signPath: require('../assets/marks/jrw/r.webp') }, // 阪和線
  11628: { signPath: require('../assets/marks/jrw/s.webp') }, // 関西空港線
  11636: { signPath: require('../assets/marks/jrw/t.webp') }, // 和歌山線
  11637: { signPath: require('../assets/marks/jrw/u.webp') }, // 万葉まほろば線
  11509: { signPath: require('../assets/marks/jrw/v.webp') }, // 関西線
  11703: { signPath: require('../assets/marks/jrw/v2.webp') }, // 伯備線
  11639: { signPath: require('../assets/marks/jrw/w2.webp') }, // きのくに線
  11715: { signPath: require('../assets/marks/jrw/t2.webp') }, // 津山線
  11713: { signPath: require('../assets/marks/jrw/u2.webp') }, // 吉備線
  11720: { signPath: require('../assets/marks/jrw/z.webp') }, // 福塩線
  11710: { signPath: require('../assets/marks/jrw/m.webp') }, // 瀬戸大橋線
  11631: {
    signPath: require('../assets/marks/jrw/n.webp'),
    subSignPath: require('../assets/marks/jrw/a.webp'),
  }, // 赤穂線
  11704: { signPath: require('../assets/marks/jrw/b2.webp') }, // 因美線
  11717: { signPath: require('../assets/marks/jrw/b3.webp') }, // 可部線
  11605: { signPath: require('../assets/marks/jrw/b.webp') }, // 湖西線
  11706: { signPath: require('../assets/marks/jrw/e2.webp') }, // 木次線
  11716: { signPath: require('../assets/marks/jrw/y.webp') }, // 呉線
  // JR東海
  11501: { signPath: require('../assets/marks/jrc/ca.webp') }, // 東海道本線（熱海〜浜松）
  11502: { signPath: require('../assets/marks/jrc/ca.webp') }, // 東海道本線（浜松〜岐阜）
  11503: { signPath: require('../assets/marks/jrc/ca.webp') }, // 東海道本線（岐阜〜米原）
  11505: { signPath: require('../assets/marks/jrc/cb.webp') }, // 御殿場線
  11402: { signPath: require('../assets/marks/jrc/cc.webp') }, // 身延線
  11413: { signPath: require('../assets/marks/jrc/cd.webp') }, // 飯田線（豊橋～天竜峡）
  11414: { signPath: require('../assets/marks/jrc/cd.webp') }, // 飯田線（天竜峡～辰野）
  11506: { signPath: require('../assets/marks/jrc/ce.webp') }, // 武豊線
  11411: { signPath: require('../assets/marks/jrc/cf.webp') }, // 中央本線
  11416: { signPath: require('../assets/marks/jrc/cg.webp') }, // 高山本線
  11507: { signPath: require('../assets/marks/jrc/ci.webp') }, // 太多線
  11508: { signPath: require('../assets/marks/jrc/cj.webp') }, // 関西本線
  // 名古屋市営地下鉄
  99513: { signPath: require('../assets/marks/nagoyamunicipal/h.webp') }, // 東山線
  99514: { signPath: require('../assets/marks/nagoyamunicipal/m.webp') }, // 名城線
  99515: { signPath: require('../assets/marks/nagoyamunicipal/e.webp') }, // 名港線
  99516: { signPath: require('../assets/marks/nagoyamunicipal/t.webp') }, // 鶴舞線
  99517: { signPath: require('../assets/marks/nagoyamunicipal/s.webp') }, // 桜通線
  99518: { signPath: require('../assets/marks/nagoyamunicipal/k.webp') }, // 上飯田線
  // 名鉄
  30001: { signPath: require('../assets/marks/meitetsu/nh.webp') }, // 名古屋本線
  30002: { signPath: require('../assets/marks/meitetsu/tk.webp') }, // 豊川線
  30003: { signPath: require('../assets/marks/meitetsu/gn.webp') }, // 西尾線
  30004: { signPath: require('../assets/marks/meitetsu/gn.webp') }, // 蒲郡線
  30005: { signPath: require('../assets/marks/meitetsu/mu.webp') }, // 三河線
  30006: { signPath: require('../assets/marks/meitetsu/tt.webp') }, // 豊田線
  30008: { signPath: require('../assets/marks/meitetsu/ta.webp') }, // 常滑線
  30007: { signPath: require('../assets/marks/meitetsu/ta.webp') }, // 空港線
  30009: { signPath: require('../assets/marks/meitetsu/kc.webp') }, // 河和線
  30010: { signPath: require('../assets/marks/meitetsu/kc.webp') }, // 知多新線
  30013: { signPath: require('../assets/marks/meitetsu/tb.webp') }, // 津島線
  30014: { signPath: require('../assets/marks/meitetsu/tb.webp') }, // 尾西線
  30020: { signPath: require('../assets/marks/meitetsu/th.webp') }, // 竹鼻線
  30021: { signPath: require('../assets/marks/meitetsu/th.webp') }, // 羽島線
  30015: { signPath: require('../assets/marks/meitetsu/iy.webp') }, // 犬山線
  30016: { signPath: require('../assets/marks/meitetsu/kg.webp') }, // 各務原線
  30017: { signPath: require('../assets/marks/meitetsu/hm.webp') }, // 広見線
  30018: { signPath: require('../assets/marks/meitetsu/km.webp') }, // 小牧線
  30012: { signPath: require('../assets/marks/meitetsu/st.webp') }, // 瀬戸線
  30011: { signPath: require('../assets/marks/meitetsu/ch.webp') }, // 築港線
  // 南海
  32001: { signPath: require('../assets/marks/nankai/main.webp') }, // 南海本線
  32003: { signPath: require('../assets/marks/nankai/main.webp') }, // 南海和歌山港線
  32004: { signPath: require('../assets/marks/nankai/main.webp') }, // 南海高師浜線
  32005: { signPath: require('../assets/marks/nankai/main.webp') }, // 南海加太線
  32006: { signPath: require('../assets/marks/nankai/main.webp') }, // 南海多奈川線
  32002: { signPath: require('../assets/marks/nankai/airport.webp') }, // 南海空港線
  32007: { signPath: require('../assets/marks/nankai/koya.webp') }, // 南海高野線
  32008: { signPath: require('../assets/marks/nankai/koya.webp') }, // 南海高野山ケーブル
  32009: { signPath: require('../assets/marks/nankai/koya.webp') }, // 南海汐見橋線
  99616: { signPath: require('../assets/marks/senhoku/sb.webp') }, // 泉北高速鉄道線
  99629: { signPath: require('../assets/marks/hankai/hn.webp') }, // 阪堺線
  99628: { signPath: require('../assets/marks/hankai/hn.webp') }, // 上町線
  99610: { signPath: require('../assets/marks/kyotomunicipal/k.webp') }, // 京都市営地下鉄烏丸線
  99611: { signPath: require('../assets/marks/kyotomunicipal/t.webp') }, // 京都市営地下鉄東西線
  99618: { signPath: require('../assets/marks/osakametro/m.webp') }, // 大阪メトロ御堂筋線
  99619: { signPath: require('../assets/marks/osakametro/t.webp') }, // 大阪メトロ谷町線
  99620: { signPath: require('../assets/marks/osakametro/y.webp') }, // 大阪メトロ四つ橋線
  99621: { signPath: require('../assets/marks/osakametro/c.webp') }, // 大阪メトロ中央線
  99622: { signPath: require('../assets/marks/osakametro/s.webp') }, // 大阪メトロ千日前線
  99623: { signPath: require('../assets/marks/osakametro/k.webp') }, // 大阪メトロ堺筋線
  99624: { signPath: require('../assets/marks/osakametro/n.webp') }, // 大阪メトロ長堀鶴見緑地線
  99652: { signPath: require('../assets/marks/osakametro/i.webp') }, // 大阪メトロ今里筋線
  99625: { signPath: require('../assets/marks/osakametro/p.webp') }, // 南港ポートタウン線
  // 阪急線
  34001: { signPath: require('../assets/marks/hankyu/kobe.webp') }, // 神戸線
  34004: { signPath: require('../assets/marks/hankyu/kobe.webp') }, // 今津線
  34005: { signPath: require('../assets/marks/hankyu/kobe.webp') }, // 甲陽線
  34006: { signPath: require('../assets/marks/hankyu/kobe.webp') }, // 伊丹線
  34002: { signPath: require('../assets/marks/hankyu/takarazuka.webp') }, // 宝塚線
  34007: { signPath: require('../assets/marks/hankyu/takarazuka.webp') }, // 箕面線
  34003: { signPath: require('../assets/marks/hankyu/kyoto.webp') }, // 京都線
  34008: { signPath: require('../assets/marks/hankyu/kyoto.webp') }, // 千里線
  34009: { signPath: require('../assets/marks/hankyu/kyoto.webp') }, // 嵐山線
  // 阪神
  35001: { signPath: require('../assets/marks/hanshin/hs.webp') }, // 本線
  35002: { signPath: require('../assets/marks/hanshin/hs.webp') }, // なんば線
  35003: { signPath: require('../assets/marks/hanshin/hs.webp') }, // 武庫川線
  // 神戸市営地下鉄
  99645: {
    signPath: require('../assets/marks/kobemunicipal/seishin.webp'),
  }, // 西神線
  99646: {
    signPath: require('../assets/marks/kobemunicipal/seishin.webp'),
  }, // 山手線
  99647: { signPath: require('../assets/marks/kobemunicipal/kaigan.webp') }, // 海岸線
  99636: {
    signPath: require('../assets/marks/kobemunicipal/seishin.webp'),
  }, // 北神線
  99637: { signPath: require('../assets/marks/sanyo/sy.webp') }, // 山陽電鉄本線
  99638: { signPath: require('../assets/marks/sanyo/sy.webp') }, // 山陽電鉄網干線
  // 能勢電鉄
  99615: { signPath: require('../assets/marks/nose/ns.webp') }, // 妙見線
  99640: { signPath: require('../assets/marks/nose/ns.webp') }, // 日生線
  // 神戸高速
  99630: { signPath: require('../assets/marks/kobe/kb.webp') }, // 東西線
  99631: { signPath: require('../assets/marks/kobe/kb.webp') }, // 南北線
  99632: { signPath: require('../assets/marks/kobe/kb.webp') }, // 有馬線
  99633: { signPath: require('../assets/marks/kobe/kb.webp') }, // 三田線
  99634: { signPath: require('../assets/marks/kobe/kb.webp') }, // 公園都市線
  99635: { signPath: require('../assets/marks/kobe/kb.webp') }, // 粟生線
  // 京福
  99612: { signPath: require('../assets/marks/keihuku/a.webp') }, // 嵐山本線
  99613: { signPath: require('../assets/marks/keihuku/b.webp') }, // 北野線
  99203: { signPath: require('../assets/marks/konan/kw.webp') }, // 弘南鉄道大鰐線
  99501: { signPath: require('../assets/marks/izukyu/iz.webp') }, // 伊豆急行線
};

const LINE_SYMBOL_IMAGE_GRAYSCALE: Record<number, LineSymbolImageWithImage> = {
  // 新幹線
  1002: { signPath: require('../assets/marks/shinkansen/jrc_g.webp') }, // 東海道新幹線
  1003: { signPath: require('../assets/marks/shinkansen/jrw_g.webp') }, // 山陽新幹線
  11901: { signPath: require('../assets/marks/shinkansen/jrw_g.webp') }, // 博多南線（これは新幹線にするべきなんだろうか）
  1004: { signPath: require('../assets/marks/shinkansen/jre_g.webp') }, // 東北新幹線
  1005: { signPath: require('../assets/marks/shinkansen/jre_g.webp') }, // 上越新幹線
  1006: { signPath: require('../assets/marks/shinkansen/jre_g.webp') }, // 上越新幹線(ガーラ湯沢支線)
  1007: { signPath: require('../assets/marks/shinkansen/jre_g.webp') }, // 山形新幹線
  1008: { signPath: require('../assets/marks/shinkansen/jre_g.webp') }, // 秋田新幹線
  1009: { signPath: require('../assets/marks/shinkansen/jrc_g.webp') }, // 北陸新幹線
  1010: { signPath: require('../assets/marks/shinkansen/jrk_g.webp') }, // 九州新幹線
  1012: { signPath: require('../assets/marks/shinkansen/jrk_g.webp') }, // 西九州新幹線
  1011: { signPath: require('../assets/marks/shinkansen/jrh_g.webp') },
  // 札幌市営地下鉄
  99102: { signPath: require('../assets/marks/sapporosubway/n_g.webp') }, // 南北線
  99101: { signPath: require('../assets/marks/sapporosubway/t_g.webp') }, // 東西線
  99103: { signPath: require('../assets/marks/sapporosubway/h_g.webp') }, // 東豊線
  // JR東日本
  11301: { signPath: require('../assets/marks/jre/jt_g.webp') }, // 東海道線（東日本区間）
  11308: { signPath: require('../assets/marks/jre/jo_g.webp') }, // 横須賀線
  11314: { signPath: require('../assets/marks/jre/jo_g.webp') }, // 総武本線
  11327: { signPath: require('../assets/marks/jre/jo_g.webp') }, // 成田線
  11332: { signPath: require('../assets/marks/jre/jk_g.webp') }, // 京浜東北線
  11307: { signPath: require('../assets/marks/jre/jk_g.webp') }, // 根岸線
  11306: { signPath: require('../assets/marks/jre/jh_g.webp') }, // 横浜線
  11303: { signPath: require('../assets/marks/jre/jn_g.webp') }, // 南武線
  11304: { signPath: require('../assets/marks/jre/ji_g.webp') }, // 鶴見線
  11302: { signPath: require('../assets/marks/jre/jy_g.webp') }, // 山手線
  11312: { signPath: require('../assets/marks/jre/jc_g.webp') }, // 中央線快速
  11315: { signPath: require('../assets/marks/jre/jc_g.webp') }, // 青梅線
  11316: { signPath: require('../assets/marks/jre/jc_g.webp') }, // 五日市線
  11311: {
    signPath: require('../assets/marks/jre/jc_g.webp'),
    subSignPath: require('../assets/marks/jre/co_g.webp'),
  }, // 中央本線
  11313: { signPath: require('../assets/marks/jre/jb_g.webp') }, // 中央・総武線各駅停車
  11319: { signPath: require('../assets/marks/jre/ju_g.webp') }, // 宇都宮線
  11323: { signPath: require('../assets/marks/jre/ju_g.webp') }, // 高崎線
  11343: { signPath: require('../assets/marks/jre/ju_g.webp') }, // 上野東京ライン
  11321: { signPath: require('../assets/marks/jre/ja_g.webp') }, // 埼京線
  11320: { signPath: require('../assets/marks/jre/jl_g.webp') }, // 常磐線
  11344: { signPath: require('../assets/marks/jre/jj_g.webp') }, // JR常磐線(緩行線)
  11326: { signPath: require('../assets/marks/jre/je_g.webp') }, // 京葉線
  11305: { signPath: require('../assets/marks/jre/jm_g.webp') }, // 武蔵野線
  11333: { signPath: require('../assets/marks/jre/js_g.webp') }, // 湘南新宿ライン
  11504: { signPath: require('../assets/marks/jre/jt.webp') }, // 伊東線
  99336: { signPath: require('../assets/marks/tokyomonorail/mo_g.webp') }, // 東京モノレール
  99337: { signPath: require('../assets/marks/twr/r_g.webp') }, // りんかい線
  // 西武線
  22001: { signPath: require('../assets/marks/seibu/si_g.webp') }, // 池袋線
  22002: { signPath: require('../assets/marks/seibu/si_g.webp') }, // 秩父線
  22003: { signPath: require('../assets/marks/seibu/si_g.webp') }, // 有楽町線
  22004: { signPath: require('../assets/marks/seibu/si_g.webp') }, // 豊島線
  22005: { signPath: require('../assets/marks/seibu/si_g.webp') }, // 狭山線
  22006: { signPath: require('../assets/marks/seibu/sy.webp') }, // 西武山口線
  22007: { signPath: require('../assets/marks/seibu/ss_g.webp') }, // 新宿線
  22008: { signPath: require('../assets/marks/seibu/ss_g.webp') }, // 拝島線
  22009: { signPath: require('../assets/marks/seibu/sk_g.webp') }, // 西武園線
  22010: { signPath: require('../assets/marks/seibu/sk_g.webp') }, // 国分寺線
  22011: { signPath: require('../assets/marks/seibu/st_g.webp') }, // 多摩湖線
  22012: { signPath: require('../assets/marks/seibu/sw_g.webp') }, // 多摩川線
  // 東武
  21001: { signPath: require('../assets/marks/tobu/tj_g.webp') }, // 東上線
  21007: { signPath: require('../assets/marks/tobu/tj_g.webp') }, // 越生線
  21002: {
    signPath: require('../assets/marks/tobu/ti_g.webp'),
    subSignPath: require('../assets/marks/tobu/ts_g.webp'),
  }, // 伊勢崎線（スカイツリーライン）
  21005: { signPath: require('../assets/marks/tobu/ts_g.webp') }, // 亀戸線
  21006: { signPath: require('../assets/marks/tobu/ts_g.webp') }, // 大師線
  21010: { signPath: require('../assets/marks/tobu/ti_g.webp') }, // 佐野線
  21011: { signPath: require('../assets/marks/tobu/ti_g.webp') }, // 桐生線
  21012: { signPath: require('../assets/marks/tobu/ti_g.webp') }, // 小泉線
  21003: { signPath: require('../assets/marks/tobu/tn_g.webp') }, // 日光線
  21008: { signPath: require('../assets/marks/tobu/tn_g.webp') }, // 宇都宮線
  21009: { signPath: require('../assets/marks/tobu/tn_g.webp') }, // 鬼怒川線
  21004: { signPath: require('../assets/marks/tobu/td_g.webp') }, // 野田線
  // 京急
  27001: { signPath: require('../assets/marks/keikyu/kk_g.webp') }, // 本線
  27002: { signPath: require('../assets/marks/keikyu/kk_g.webp') }, // 空港線
  27003: { signPath: require('../assets/marks/keikyu/kk_g.webp') }, // 大師線
  27004: { signPath: require('../assets/marks/keikyu/kk_g.webp') }, // 逗子線
  27005: { signPath: require('../assets/marks/keikyu/kk_g.webp') }, // 久里浜線
  // 東急
  26001: { signPath: require('../assets/marks/tokyu/ty_g.webp') }, // 東横線
  26002: { signPath: require('../assets/marks/tokyu/mg_g.webp') }, // 目黒線
  26003: { signPath: require('../assets/marks/tokyu/dt_g.webp') }, // 田園都市線
  26004: { signPath: require('../assets/marks/tokyu/om_g.webp') }, // 大井町線
  26005: { signPath: require('../assets/marks/tokyu/ik_g.webp') }, // 池上線
  26006: { signPath: require('../assets/marks/tokyu/tm_g.webp') }, // 多摩川線
  26007: { signPath: require('../assets/marks/tokyu/sg_g.webp') }, // 世田谷線
  26008: { signPath: require('../assets/marks/tokyu/kd_g.webp') }, // こどもの国線
  26009: { signPath: require('../assets/marks/tokyu/sh_g.webp') }, // 東急新横浜線
  99310: { signPath: require('../assets/marks/minatomirai/mm_g.webp') }, // みなとみらい線
  // 相鉄
  29001: { signPath: require('../assets/marks/sotetsu/so_g.webp') }, // 本線
  29002: { signPath: require('../assets/marks/sotetsu/so_g.webp') }, // いずみ野線
  29003: { signPath: require('../assets/marks/sotetsu/so_g.webp') }, // 新横浜線
  // 横浜市交通局
  99316: {
    signPath: require('../assets/marks/yokohamamunicipal/b_g.webp'),
  }, // ブルーライン
  99343: {
    signPath: require('../assets/marks/yokohamamunicipal/g_g.webp'),
  }, // グリーンライン
  99320: { signPath: require('../assets/marks/enoden/en_g.webp') }, // 江ノ電
  99338: { signPath: require('../assets/marks/toyorapid/tr_g.webp') }, // 東葉高速鉄道線
  99307: { signPath: require('../assets/marks/saitamarapid/sr_g.webp') }, // 埼玉高速鉄道線
  99334: { signPath: require('../assets/marks/tamamonorail/tt_g.webp') }, // 多摩都市モノレール
  99321: { signPath: require('../assets/marks/newshuttle/ns_g.webp') }, // ニューシャトル
  99335: { signPath: require('../assets/marks/choshi/cd_g.webp') }, // 銚子電鉄線
  99331: { signPath: require('../assets/marks/chibamonorail/cm_g.webp') }, // 千葉都市モノレール
  99332: { signPath: require('../assets/marks/chibamonorail/cm_g.webp') }, // 千葉都市モノレール
  28001: { signPath: require('../assets/marks/tokyometro/g_g.webp') }, // 東京メトロ銀座線
  28002: { signPath: require('../assets/marks/tokyometro/m_g.webp') }, // 東京メトロ丸ノ内線
  28003: { signPath: require('../assets/marks/tokyometro/h_g.webp') }, // 東京メトロ日比谷線
  28004: { signPath: require('../assets/marks/tokyometro/t_g.webp') }, // 東京メトロ東西線
  28005: { signPath: require('../assets/marks/tokyometro/c_g.webp') }, // 東京メトロ千代田線
  28006: { signPath: require('../assets/marks/tokyometro/y_g.webp') }, // 東京メトロ有楽町線
  28008: { signPath: require('../assets/marks/tokyometro/z_g.webp') }, // 東京メトロ半蔵門線
  28009: { signPath: require('../assets/marks/tokyometro/n_g.webp') }, // 東京メトロ南北線
  28010: { signPath: require('../assets/marks/tokyometro/f_g.webp') }, // 東京メトロ副都心線
  99302: { signPath: require('../assets/marks/toei/a_g.webp') }, // 都営浅草線
  99303: { signPath: require('../assets/marks/toei/i_g.webp') }, // 都営三田線
  99304: { signPath: require('../assets/marks/toei/s_g.webp') }, // 都営新宿線
  99301: { signPath: require('../assets/marks/toei/e_g.webp') }, // 都営大江戸線
  99311: { signPath: require('../assets/marks/yurikamome/u_g.webp') }, // ゆりかもめ
  99305: { signPath: require('../assets/marks/toden/sa_g.webp') }, // 都電荒川線
  99342: {
    signPath: require('../assets/marks/nippori-toneri-liner/nt_g.webp'),
  }, // 日暮里舎人ライナー
  // 京王線
  24001: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24002: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24003: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24004: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24005: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24007: { signPath: require('../assets/marks/keio/ko_g.webp') },
  24006: { signPath: require('../assets/marks/keio/in_g.webp') }, // 井の頭線
  25001: { signPath: require('../assets/marks/odakyu/oh_g.webp') }, // 小田急小田原線
  25002: { signPath: require('../assets/marks/odakyu/oe_g.webp') }, // 小田急江ノ島線
  25003: { signPath: require('../assets/marks/odakyu/ot_g.webp') }, // 小田急多摩線
  99339: { signPath: require('../assets/marks/hakone/oh_g.webp') }, // 箱根登山鉄道鉄道線
  // 京成
  23001: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 本線
  23002: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 押上
  23003: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 金町
  23004: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 千葉
  23005: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 千原
  23006: {
    signPath: require('../assets/marks/keisei/ks2_g.webp'),
    subSignPath: require('../assets/marks/hokuso/hs_g.webp'),
  }, // 成田スカイアクセス
  99329: { signPath: require('../assets/marks/keisei/ks_g.webp') }, // 新京成
  99340: { signPath: require('../assets/marks/hokuso/hs_g.webp') }, // 北総線
  99324: { signPath: require('../assets/marks/shibayama/sr_g.webp') }, // 芝山線
  // JR西日本
  11405: { signPath: require('../assets/marks/jrw/a_g.webp') }, // 北陸線
  11415: { signPath: require('../assets/marks/jrw/a_g.webp') },
  11601: { signPath: require('../assets/marks/jrw/a_g.webp') }, // 琵琶湖線
  11602: { signPath: require('../assets/marks/jrw/a_g.webp') }, // 京都線
  11603: { signPath: require('../assets/marks/jrw/a_g.webp') }, // 神戸線
  11608: { signPath: require('../assets/marks/jrw/a_g.webp') }, // 山陽線
  11609: { signPath: require('../assets/marks/jrw/s2_g.webp') }, // JR山陽本線(姫路～岡山)
  11610: {
    signPath: require('../assets/marks/jrw/w_g.webp'),
    subSignPath: require('../assets/marks/jrw/x_g.webp'),
  }, // JR山陽本線(岡山～三原)
  11709: { signPath: require('../assets/marks/jrw/l2_g.webp') }, // 宇野線
  11611: {
    signPath: require('../assets/marks/jrw/g2_g.webp'),
    subSignPath: require('../assets/marks/jrw/r2_g.webp'),
  }, // JR山陽本線(三原～岩国)
  11511: { signPath: require('../assets/marks/jrw/c_g.webp') }, // 草津線
  11705: { signPath: require('../assets/marks/jrw/c2_g.webp') }, // 境線
  11618: { signPath: require('../assets/marks/jrw/d_g.webp') }, // 奈良線
  11616: { signPath: require('../assets/marks/jrw/a2_g.webp') }, // JR山陰本線(豊岡～米子)
  11701: { signPath: require('../assets/marks/jrw/d_g.webp') }, // JR山陰本線(米子～益田)
  11614: { signPath: require('../assets/marks/jrw/e_g.webp') }, // 嵯峨野線
  11615: { signPath: require('../assets/marks/jrw/e_g.webp') }, // 山陰線
  11641: { signPath: require('../assets/marks/jrw/f_g.webp') }, // おおさか東線
  11629: {
    signPath: require('../assets/marks/jrw/g_g.webp'),
    subSignPath: require('../assets/marks/jrw/a_g.webp'),
  }, // 宝塚線
  11630: {
    signPath: require('../assets/marks/jrw/g_g.webp'),
    subSignPath: require('../assets/marks/jrw/a_g.webp'),
  }, // 福知山線
  11625: { signPath: require('../assets/marks/jrw/h_g.webp') }, // 東西線
  11617: { signPath: require('../assets/marks/jrw/h_g.webp') }, // 学研都市線
  11632: { signPath: require('../assets/marks/jrw/i_g.webp') }, // 加古川線
  11635: { signPath: require('../assets/marks/jrw/j_g.webp') }, // 播但線
  11633: { signPath: require('../assets/marks/jrw/k_g.webp') }, // 姫新線
  11634: { signPath: require('../assets/marks/jrw/k_g.webp') },
  11622: { signPath: require('../assets/marks/jrw/l_g.webp') }, // 舞鶴線
  11623: { signPath: require('../assets/marks/jrw/o_g.webp') }, // 大阪環状線
  11624: { signPath: require('../assets/marks/jrw/p_g.webp') }, // ゆめ咲線
  11714: { signPath: require('../assets/marks/jrw/p2_g.webp') }, // 芸備線
  11607: { signPath: require('../assets/marks/jrw/q_g.webp') }, // 大和路線
  11626: { signPath: require('../assets/marks/jrw/r_g.webp') }, // 阪和線
  11628: { signPath: require('../assets/marks/jrw/s_g.webp') }, // 関西空港線
  11636: { signPath: require('../assets/marks/jrw/t_g.webp') }, // 和歌山線
  11637: { signPath: require('../assets/marks/jrw/u_g.webp') }, // 万葉まほろば線
  11509: { signPath: require('../assets/marks/jrw/v_g.webp') }, // 関西線
  11703: { signPath: require('../assets/marks/jrw/v2_g.webp') }, // 伯備線
  11639: { signPath: require('../assets/marks/jrw/w2_g.webp') }, // きのくに線
  11715: { signPath: require('../assets/marks/jrw/t2_g.webp') }, // 津山線
  11713: { signPath: require('../assets/marks/jrw/u2_g.webp') }, // 吉備線
  11720: { signPath: require('../assets/marks/jrw/z_g.webp') }, // 福塩線
  11710: { signPath: require('../assets/marks/jrw/m_g.webp') }, // 瀬戸大橋線
  11631: {
    signPath: require('../assets/marks/jrw/n_g.webp'),
    subSignPath: require('../assets/marks/jrw/a_g.webp'),
  }, // 赤穂線
  11704: { signPath: require('../assets/marks/jrw/b2_g.webp') }, // 因美線
  11717: { signPath: require('../assets/marks/jrw/b3_g.webp') }, // 可部線
  11605: { signPath: require('../assets/marks/jrw/b_g.webp') }, // 湖西線
  11706: { signPath: require('../assets/marks/jrw/e2_g.webp') }, // 木次線
  11716: { signPath: require('../assets/marks/jrw/y_g.webp') }, // 呉線
  // JR東海
  11501: { signPath: require('../assets/marks/jrc/ca_g.webp') }, // 東海道本線（熱海〜浜松）
  11502: { signPath: require('../assets/marks/jrc/ca_g.webp') }, // 東海道本線（浜松〜岐阜）
  11503: { signPath: require('../assets/marks/jrc/ca_g.webp') }, // 東海道本線（岐阜〜米原）
  11505: { signPath: require('../assets/marks/jrc/cb_g.webp') }, // 御殿場線
  11402: { signPath: require('../assets/marks/jrc/cc_g.webp') }, // 身延線
  11413: { signPath: require('../assets/marks/jrc/cd_g.webp') }, // 飯田線（豊橋～天竜峡）
  11414: { signPath: require('../assets/marks/jrc/cd_g.webp') }, // 飯田線（天竜峡～辰野）
  11506: { signPath: require('../assets/marks/jrc/ce_g.webp') }, // 武豊線
  11411: { signPath: require('../assets/marks/jrc/cf_g.webp') }, // 中央本線
  11416: { signPath: require('../assets/marks/jrc/cg_g.webp') }, // 高山本線
  11507: { signPath: require('../assets/marks/jrc/ci_g.webp') }, // 太多線
  11508: { signPath: require('../assets/marks/jrc/cj_g.webp') }, // 関西本線
  // 名古屋市営地下鉄
  99513: { signPath: require('../assets/marks/nagoyamunicipal/h_g.webp') }, // 東山線
  99514: { signPath: require('../assets/marks/nagoyamunicipal/m_g.webp') }, // 名城線
  99515: { signPath: require('../assets/marks/nagoyamunicipal/e_g.webp') }, // 名港線
  99516: { signPath: require('../assets/marks/nagoyamunicipal/t_g.webp') }, // 鶴舞線
  99517: { signPath: require('../assets/marks/nagoyamunicipal/s_g.webp') }, // 桜通線
  99518: { signPath: require('../assets/marks/nagoyamunicipal/k_g.webp') }, // 上飯田線
  // 名鉄
  30001: { signPath: require('../assets/marks/meitetsu/nh_g.webp') }, // 名古屋本線
  30002: { signPath: require('../assets/marks/meitetsu/tk_g.webp') }, // 豊川線
  30003: { signPath: require('../assets/marks/meitetsu/gn_g.webp') }, // 西尾線
  30004: { signPath: require('../assets/marks/meitetsu/gn_g.webp') }, // 蒲郡線
  30005: { signPath: require('../assets/marks/meitetsu/mu_g.webp') }, // 三河線
  30006: { signPath: require('../assets/marks/meitetsu/tt_g.webp') }, // 豊田線
  30008: { signPath: require('../assets/marks/meitetsu/ta_g.webp') }, // 常滑線
  30007: { signPath: require('../assets/marks/meitetsu/ta_g.webp') }, // 空港線
  30009: { signPath: require('../assets/marks/meitetsu/kc_g.webp') }, // 河和線
  30010: { signPath: require('../assets/marks/meitetsu/kc_g.webp') }, // 知多新線
  30013: { signPath: require('../assets/marks/meitetsu/tb_g.webp') }, // 津島線
  30014: { signPath: require('../assets/marks/meitetsu/tb_g.webp') }, // 尾西線
  30020: { signPath: require('../assets/marks/meitetsu/th_g.webp') }, // 竹鼻線
  30021: { signPath: require('../assets/marks/meitetsu/th_g.webp') }, // 羽島線
  30015: { signPath: require('../assets/marks/meitetsu/iy_g.webp') }, // 犬山線
  30016: { signPath: require('../assets/marks/meitetsu/kg_g.webp') }, // 各務原線
  30017: { signPath: require('../assets/marks/meitetsu/hm_g.webp') }, // 広見線
  30018: { signPath: require('../assets/marks/meitetsu/km_g.webp') }, // 小牧線
  30012: { signPath: require('../assets/marks/meitetsu/st_g.webp') }, // 瀬戸線
  30011: { signPath: require('../assets/marks/meitetsu/ch_g.webp') }, // 築港線
  // 南海
  32001: { signPath: require('../assets/marks/nankai/main_g.webp') }, // 南海本線
  32003: { signPath: require('../assets/marks/nankai/main_g.webp') }, // 南海和歌山港線
  32004: { signPath: require('../assets/marks/nankai/main_g.webp') }, // 南海高師浜線
  32005: { signPath: require('../assets/marks/nankai/main_g.webp') }, // 南海加太線
  32006: { signPath: require('../assets/marks/nankai/main_g.webp') }, // 南海多奈川線
  32002: { signPath: require('../assets/marks/nankai/airport_g.webp') }, // 南海空港線
  32007: { signPath: require('../assets/marks/nankai/koya_g.webp') }, // 南海高野線
  32008: { signPath: require('../assets/marks/nankai/koya_g.webp') }, // 南海高野山ケーブル
  32009: { signPath: require('../assets/marks/nankai/koya_g.webp') }, // 南海汐見橋線
  99616: { signPath: require('../assets/marks/senhoku/sb_g.webp') }, // 泉北高速鉄道線
  99629: { signPath: require('../assets/marks/hankai/hn_g.webp') }, // 阪堺線
  99628: { signPath: require('../assets/marks/hankai/hn_g.webp') }, // 上町線
  99610: { signPath: require('../assets/marks/kyotomunicipal/k_g.webp') }, // 京都市営地下鉄烏丸線
  99611: { signPath: require('../assets/marks/kyotomunicipal/t_g.webp') }, // 京都市営地下鉄東西線
  99618: { signPath: require('../assets/marks/osakametro/m_g.webp') }, // 大阪メトロ御堂筋線
  99619: { signPath: require('../assets/marks/osakametro/t_g.webp') }, // 大阪メトロ谷町線
  99620: { signPath: require('../assets/marks/osakametro/y_g.webp') }, // 大阪メトロ四つ橋線
  99621: { signPath: require('../assets/marks/osakametro/c_g.webp') }, // 大阪メトロ中央線
  99622: { signPath: require('../assets/marks/osakametro/s_g.webp') }, // 大阪メトロ千日前線
  99623: { signPath: require('../assets/marks/osakametro/k_g.webp') }, // 大阪メトロ堺筋線
  99624: { signPath: require('../assets/marks/osakametro/n_g.webp') }, // 大阪メトロ長堀鶴見緑地線
  99652: { signPath: require('../assets/marks/osakametro/i_g.webp') }, // 大阪メトロ今里筋線
  99625: { signPath: require('../assets/marks/osakametro/p_g.webp') }, // 南港ポートタウン線
  // 阪急線
  34001: { signPath: require('../assets/marks/hankyu/kobe_g.webp') }, // 神戸線
  34004: { signPath: require('../assets/marks/hankyu/kobe_g.webp') }, // 今津線
  34005: { signPath: require('../assets/marks/hankyu/kobe_g.webp') }, // 甲陽線
  34006: { signPath: require('../assets/marks/hankyu/kobe_g.webp') }, // 伊丹線
  34002: { signPath: require('../assets/marks/hankyu/takarazuka_g.webp') }, // 宝塚線
  34007: { signPath: require('../assets/marks/hankyu/takarazuka_g.webp') }, // 箕面線
  34003: { signPath: require('../assets/marks/hankyu/kyoto_g.webp') }, // 京都線
  34008: { signPath: require('../assets/marks/hankyu/kyoto_g.webp') }, // 千里線
  34009: { signPath: require('../assets/marks/hankyu/kyoto_g.webp') }, // 嵐山線
  // 阪神
  35001: { signPath: require('../assets/marks/hanshin/hs_g.webp') }, // 本線
  35002: { signPath: require('../assets/marks/hanshin/hs_g.webp') }, // なんば線
  35003: { signPath: require('../assets/marks/hanshin/hs_g.webp') }, // 武庫川線
  // 神戸市営地下鉄
  99645: {
    signPath: require('../assets/marks/kobemunicipal/seishin_g.webp'),
  }, // 西神線
  99646: {
    signPath: require('../assets/marks/kobemunicipal/seishin_g.webp'),
  }, // 山手線
  99647: {
    signPath: require('../assets/marks/kobemunicipal/kaigan_g.webp'),
  }, // 海岸線
  99636: {
    signPath: require('../assets/marks/kobemunicipal/seishin_g.webp'),
  }, // 北神線
  99637: { signPath: require('../assets/marks/sanyo/sy_g.webp') }, // 山陽電鉄本線
  99638: { signPath: require('../assets/marks/sanyo/sy_g.webp') }, // 山陽電鉄網干線
  // 能勢電鉄
  99615: { signPath: require('../assets/marks/nose/ns_g.webp') }, // 妙見線
  99640: { signPath: require('../assets/marks/nose/ns_g.webp') }, // 日生線
  // 神戸高速
  99630: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 東西線
  99631: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 南北線
  99632: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 有馬線
  99633: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 三田線
  99634: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 公園都市線
  99635: { signPath: require('../assets/marks/kobe/kb_g.webp') }, // 粟生線
  // 京福
  99612: { signPath: require('../assets/marks/keihuku/a_g.webp') }, // 嵐山本線
  99613: { signPath: require('../assets/marks/keihuku/b_g.webp') }, // 北野線
  99203: { signPath: require('../assets/marks/konan/kw_g.webp') }, // 弘南鉄道大鰐線
  99501: { signPath: require('../assets/marks/izukyu/iz_g.webp') }, // 伊豆急行線
};

/**
 * 直接使わず、getLineSymbolImageを使う
 */
const getLineSymbolImageWithColor = (line: Line): LineSymbolImage | null => {
  if (line?.id == null) {
    return null;
  }
  return LINE_SYMBOL_IMAGE_WITH_COLOR[line.id] ?? null;
};

const getLineSymbolImageGrayscaleImage = (
  line: Line
): LineSymbolImageWithImage | null => {
  if (line?.id == null) {
    return null;
  }
  return LINE_SYMBOL_IMAGE_GRAYSCALE[line.id] ?? null;
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

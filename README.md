# 今晚點揀？ 🎡

**兩個人決定所** — 幫情侶／同居二人組解決「今晚食乜、去邊、睇乜、邊個做家務」嘅選擇困難。Mobile-first PWA，可以加落手機主畫面，兩個人傳住一部手機用。

👉 **Live**: https://blackmi-pp.github.io/tonight-we-pick/

## 功能

- 🍜 **今晚食乜** — 兩人輪流秘密投票（❤️ 特別想／👍 想／😐 可以／👎 唔想），再答預算、距離、模式、狀態
- 🗺️ **今日去邊** — 按時間、天氣、感覺、交通加權，結果一鍵開 Google／Apple Maps
- 📺 **今晚睇乜** — 按剩餘時間同心情加權，可以存片單
- ⚖️ **邊個負責** — 家務公平引擎：本星期分少嗰位做；打和就睇邊個耐啲冇做過；免做卡每人每月 2 張
- 🎲 **自訂決定** — 任何臨時二人爭議，投票＋轉盤
- 😴 **唔想揀模式** — 答三條問題直接出建議

## 核心概念：公平又有道理

每次揀嘢總有一個人遷就。呢個 app 會記住邊個遷就咗，下次補返佢。

- **遷就帳簿**（`src/engine/fairness.ts`）：每個有投票嘅結果，用兩個人對贏家嘅投票計邊個開心啲（最近 10 次、60 日內）。差距 ≥ 2 分，遷就多咗嗰位下次嘅 ❤️👍 會加成（最多 ×1.5），結果畫面會講明。
- **自己嘅選項 + 標籤**：可以加「樓下茶記」再貼「平・近・快」，條件就會影響佢。
- **食完評分**：之後彈出 👍／👎，👎 會降低嗰個選項之後嘅機率。

## 免費 API（唔使 key、零後端）

| 用途 | 來源 | 點 call |
| --- | --- | --- |
| 「今日去邊」自動填天氣、首頁氣溫 | [香港天文台開放數據](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation_tc.pdf) | `fetch`（CORS） |
| 附近餐廳／地方 | OpenStreetMap [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)（有後備伺服器） | `fetch` POST |
| 地圖 | Google Maps 內嵌（唔使 key）＋ Google／Apple Maps 導航 link | iframe／link |
| 揀戲建議 | [iTunes Search API](https://performance-partners.apple.com/search-api)（香港區） | JSONP（佢冇 CORS） |

全部失敗時都會退返去「開地圖搜尋」或者收埋，唔會令 app 用唔到。位置只喺撳「搵附近」嗰陣攞一次，唔會儲低。

## 小遊戲對決

包剪揼（三局兩勝、輪流秘密出）、撳快啲（8 秒）、停錶挑戰（盲停 5.00 秒）。可以喺首頁自由對決，結果唔服可以對決一次（贏家話事接受定重轉），家務唔服都可以對決（輸咗做）。

## 加權引擎（`src/engine/weights.ts`）

```
權重 = 投票（含遷就加成）× 條件 × 冷卻期 × 評分        機率 = 權重 / 全部權重總和
```

| 因素 | 規則 |
| --- | --- |
| 投票 | 兩人分數相乘：❤️ 3・👍 2・😐 1・冇投 = 1・👎 任何一方 = 出局（0%） |
| 條件 | 內置選項有標籤（例如火鍋 = `pricey`, `celebrate`），條件答案對應倍數（`src/data/rules.ts`）。自己加嘅選項冇標籤，條件唔會郁佢 |
| 冷卻期 | 接受結果嗰日起計：當日 ×0.2，線性回升到冷卻期完結 ×1；隔好耐冇揀（例如食 30 日）×1.3 |
| 評分 | 最近 3 次評分：👍 ×1.15、👎 ×0.6，夾喺 0.3–1.4 之間 |
| 遷就加成 | 遷就多咗嗰位嘅投票分數：1 + (分 − 1) × 加成，所以「可以接受」唔變，❤️ 先有效 |

轉盤每格嘅大小 **就係** 呢個機率，抽獎用同一組數字（`drawIndex`），轉盤停喺抽中嗰格入面（`targetRotation`）。結果理由全部由引擎實際用過嘅數字同歷史紀錄生成。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173/tonight-we-pick/
npm test         # vitest：引擎、遷就帳簿、家務、儲存
npm run build    # typecheck + production build → dist/
```

Stack：Vite + React + TypeScript、vite-plugin-pwa（offline + 加到主畫面）。

## 部署

Push 去 `main` 會由 GitHub Actions 自動 test、build 同部署。第一次要喺 repo **Settings → Pages → Source** 揀 **GitHub Actions**。

## 私隱

- 零後端、零帳號：所有資料（名字、選項、歷史、分數）只存喺你部機嘅 localStorage，key 係 `twp:v1`
- 舊版（`jdw-*`）資料第一次開會自動搬過嚟
- 設定入面可以匯出／匯入 JSON 備份（換手機或者兩部機共用）
- 冇 analytics、冇 cookies；字體經 Google Fonts／jsDelivr 載入

## 吉祥物

隻黑貓係 [sipp.](https://sipp.com.hk) 嘅吉祥物，版權屬 sipp.，唔包喺 MIT 授權入面。

## 授權

程式碼 MIT — 見 [LICENSE](LICENSE)

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

## 加權引擎（`src/engine/weights.ts`）

```
權重 = 投票 × 條件 × 冷卻期        機率 = 權重 / 全部權重總和
```

| 因素 | 規則 |
| --- | --- |
| 投票 | 兩人分數相乘：❤️ 3・👍 2・😐 1・冇投 = 1・👎 任何一方 = 出局（0%） |
| 條件 | 內置選項有標籤（例如火鍋 = `pricey`, `celebrate`），條件答案對應倍數（`src/data/rules.ts`）。自己加嘅選項冇標籤，條件唔會郁佢 |
| 冷卻期 | 接受結果嗰日起計：當日 ×0.2，線性回升到冷卻期完結 ×1；隔好耐冇揀（例如食 30 日）×1.3 |

轉盤每格嘅大小 **就係** 呢個機率，抽獎用同一組數字（`drawIndex`），轉盤停喺抽中嗰格入面（`targetRotation`）。結果理由全部由引擎實際用過嘅數字同歷史紀錄生成。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173/tonight-we-pick/
npm test         # vitest：引擎、家務、儲存
npm run build    # typecheck + production build → dist/
```

Stack：Vite + React + TypeScript、vite-plugin-pwa（offline + 加到主畫面）。

## 部署

Push 去 `main` 會由 GitHub Actions 自動 test、build 同部署。第一次要喺 repo **Settings → Pages → Source** 揀 **GitHub Actions**。

## 私隱

- 零後端、零帳號：所有資料（名字、選項、歷史、分數）只存喺你部機嘅 localStorage，key 係 `twp:v1`
- 舊版（`jdw-*`）資料第一次開會自動搬過嚟
- 冇 analytics、冇 cookies；字體經 Google Fonts／jsDelivr 載入

## 吉祥物

隻黑貓係 [sipp.](https://sipp.com.hk) 嘅吉祥物，版權屬 sipp.，唔包喺 MIT 授權入面。

## 授權

程式碼 MIT — 見 [LICENSE](LICENSE)

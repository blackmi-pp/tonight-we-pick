# 今晚點揀？ 🎡

**兩個人決定所** — 幫情侶／同居二人組解決「今晚食乜、去邊、睇乜、邊個做家務」嘅選擇困難。

👉 **Live Demo**: https://blackmi-pp.github.io/tonight-we-pick/

## 功能

- 🍜 **今晚食乜** — 兩人輪流秘密投票（特別想食／OK／今日唔想），再答預算、距離、模式等條件，轉盤按投票同條件加權抽出結果
- 🗺️ **今日去邊** — 按時間、天氣、想要嘅感覺、交通出建議，結果一鍵開 Google／Apple Maps
- 📺 **今晚睇乜** — 按剩餘時間同心情轉盤，結果可以手動輸入戲名存入片單
- ⚖️ **邊個負責** — 家務公平引擎：自訂家務同分數，分少嗰位優先被抽；支援「免做卡」（每人 2 張）同「提出交換」
- 🎲 **自訂決定** — 任何臨時二人爭議都可以快速建盤
- 😴 **唔想揀模式** — 答三條問題直接出建議，唔使轉盤

## 特色

- 零後端、零帳號：所有資料（名字、選項、歷史、分數）只存喺你部機嘅瀏覽器 localStorage
- 首次使用有兩步設定：輸入兩位名字、揀選項
- 決定歷史自動記錄；「設定」入面可以隨時重設所有資料
- 搵餐廳用官方 Maps URL 跳轉，零 API 成本，唔收集位置

## 本地運行

唔使 build、唔使裝任何嘢：

```bash
git clone https://github.com/blackmi-pp/tonight-we-pick.git
cd tonight-we-pick
python3 -m http.server 8000
# 開 http://localhost:8000
```

> 直接 double-click `index.html` 都可以，但部分瀏覽器對 `file://` 有限制，建議用靜態伺服器。

## 部署到 GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source 揀 **Deploy from a branch**，Branch 揀 `main`、資料夾 `/(root)`
3. 等一分鐘，網址就係 `https://<你的用戶名>.github.io/<repo名>/`

## 私隱

- 唔會上傳任何資料去伺服器
- 冇 analytics、冇 cookies
- 字體經公開 CDN（Google Fonts／jsDelivr）載入

## 授權

MIT — 見 [LICENSE](LICENSE)

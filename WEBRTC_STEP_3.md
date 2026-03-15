# WebRTC Step 3 (Detailed)

今階段目標：喺後端 K8s 已穩定後，正式將前端由 MJPEG `<img>` 切換到 WebRTC `<video>`，並把 SDP 握手邏輯搬入 React lifecycle。

## 今次改動內容

1. `StreamView` 由 MJPEG `<img>` 改為 WebRTC `<video>`
- 檔案：`src/webUI/mantaray-control-interface/components/StreamView.tsx`
- 核心改動：
  - 移除原本 `imgRef + onLoad/onError + timestamp cache busting` MJPEG 流程
  - 改用 `<video ...>` 顯示遠端串流
  - 第一個鏡頭 (`rov-feed`) 用固定 DOM id：`camA`
  - 保留 `autoPlay playsInline muted`
- 結果：前端畫面骨架已由 HTTP MJPEG 轉為 WebRTC 播放器模式。

2. 新增 WebRTC React Hook，承接 SDP Offer/Answer
- 檔案：`src/webUI/mantaray-control-interface/hooks/useWebRTC.ts`
- 主要行為：
  - `useEffect` 內建立 `RTCPeerConnection`
  - `addTransceiver('video', { direction: 'recvonly' })`
  - `createOffer -> setLocalDescription`
  - `fetch(signalUrl)` POST offer 到後端 `/offer`
  - 讀取 answer 並 `setRemoteDescription`
  - `ontrack` 將遠端 stream attach 到 `<video>`
  - 連線失敗時自動重試（預設 2 秒）
  - cleanup 階段關閉 peer connection、釋放 video srcObject

3. 把串流 URL 預設切換成 WebRTC signaling endpoint
- 檔案：`src/webUI/mantaray-control-interface/hooks/useStreams.ts`
- 改動：
  - `ROV Camera Feed` 預設改為 `http://rov:8080/offer`
  - `ROV-CAM Camera Feed` 預設改為 `http://rov-cam:8080/offer`

4. 保留原有 UI 操作能力
- `Refresh` 仍可手動觸發重連（呼叫 `reconnect()`）
- `Snap` 改為從 `<video>` 畫面擷取到 canvas，再下載 PNG
- URL 編輯面板保持可用，方便臨場改 signal URL

## 為何咁改

1. WebRTC 係低延遲串流，對控制型 UI 更合適。
2. 握手邏輯放入 Hook，生命週期可控，重用性高。
3. 前端組件只負責展示與操作，連線細節由 Hook 抽離，維護更清晰。

## Testing 指南

### A. 前置檢查

1. 後端 Pod 已跑 `webrtc_streamer.py` 並可回應 `/offer`
2. 前端可連到後端 host（DNS 或 IP 可達）
3. Browser 開發者工具可觀察 console/network

### B. 本地 UI 構建檢查

1. 進入 `src/webUI/mantaray-control-interface`
2. 執行 `npm install`
3. 執行 `npm run build`
4. 預期：build 成功，無 TypeScript 錯誤

### C. 功能測試（單路 camA）

1. 開啟 Dashboard
2. 確認畫面中 `ROV Camera Feed` 的 `<video id="camA">` 出現
3. 觀察狀態由 `CONNECTING...` 轉 `LIVE`
4. 在 Network 面板確認對 `/offer` 有 POST 請求且回應 200
5. 喺 Console 確認無 `Signal server returned xxx` 或 `setRemoteDescription` error

### D. 連線異常測試

1. 暫停後端 streamer，前端應顯示 `CONNECTION LOST` 並自動重試
2. 恢復後端 streamer，前端應自動回復 `LIVE`
3. 手動改錯 URL，確認錯誤訊息有出現
4. 按 `Refresh`，確認會重新發起握手

### E. Snapshot 測試

1. 畫面已 LIVE 時按 `Snap`
2. 確認下載 PNG 檔成功
3. 檢查圖像內容係當前視頻幀

## 已知限制

1. 今步主要針對 camA 轉換，camB 要完全生效取決於 `rov-cam` 端是否亦部署 WebRTC streamer。
2. 未加入 STUN/TURN；跨 NAT 或複雜網絡情況下可能仍需補齊 ICE 基建。
3. `hostNetwork` 下請避免 `8080` 端口碰撞。

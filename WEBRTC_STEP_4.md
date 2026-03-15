# WebRTC Step 4 (Detailed)

今階段目標：完成 Camera B 由 MJPEG 遷移到 WebRTC，並打通 K8s + UI 雙路串流（camA:8080, camB:8081）。

## 今次改動內容

1. K8s 藍圖新增/切換 Camera B WebRTC Deployment
- 檔案：`ansible/k8s/manta-ray-deployment.yaml.j2`
- 改動：
  - 原本 Camera B 區塊改為 `webrtc-streamer-b-deployment`
  - selector/label 同步改為 `webrtc-streamer-b`
  - container name 改為 `webrtc-streamer-b-container`
  - 啟動命令改為：
    - `python3 webrtc_streamer.py --device /dev/video1 --port 8081`
  - 在 pod spec 加入 `hostNetwork: true`
- 重點：camB 使用 8081，避免與 camA 的 8080 衝突。

2. React 前端補上 camB 對應 video id
- 檔案：`src/webUI/mantaray-control-interface/components/StreamView.tsx`
- 改動：
  - `rov-feed` 對應 `<video id="camA" ...>`
  - `rov-cam-feed` 對應 `<video id="camB" ...>`
- 結果：DOM 層面可清楚區分兩路鏡頭元素，方便 debug/定位。

3. Hook 連線目標補上第二路 8081
- 檔案：`src/webUI/mantaray-control-interface/hooks/useStreams.ts`
- 改動：
  - camA 保持 `http://rov:8080/offer`
  - camB 改為 `http://rov-cam:8081/offer`
- 說明：`useWebRTC` hook 本身每個 `StreamView` instance 都會建立一組獨立 `RTCPeerConnection`。
  因為 Dashboard 同時渲染兩個 `StreamView`，實際上已經有兩組連線邏輯，分別指向 8080 / 8081。

## 最終部署

你要求執行：

`ansible-playbook ansible/playbook-app.yaml`

此命令會依據新模板重新套用 deployment，令 camB WebRTC 版本生效。

## Testing 指南

### A. 部署後健康檢查

1. `kubectl get pods -o wide | findstr streamer`
2. 確認至少以下 pod Running：
   - `http-streamer-a-deployment`（camA / 8080）
   - `webrtc-streamer-b-deployment`（camB / 8081）
3. `kubectl logs deployment/webrtc-streamer-b-deployment --tail=100`
   - 預期：見到 WebRTC signaling 啟動訊息，無 device open error。

### B. 服務端口檢查（Node/Host）

1. 在對應節點檢查 8080/8081 是否被 streamer 監聽。
2. 確保 8081 無其他服務佔用。

### C. 前端雙路功能測試

1. 開啟 Dashboard。
2. 檢查兩個 `<video>` 元素：
   - camA: `<video id="camA">`
   - camB: `<video id="camB">`
3. Network 面板檢查兩條 POST：
   - `http://rov:8080/offer`
   - `http://rov-cam:8081/offer`
4. 兩路都應由 `CONNECTING...` 轉 `LIVE`。

### D. 故障注入測試

1. 停掉 camB deployment：
   - `kubectl scale deployment webrtc-streamer-b-deployment --replicas=0`
2. 預期 UI：camB 轉 `CONNECTION LOST` 並持續重試。
3. 恢復 deployment：
   - `kubectl scale deployment webrtc-streamer-b-deployment --replicas=1`
4. 預期 UI：camB 回復 LIVE。

### E. Snapshot 測試

1. camA/camB 都在 LIVE 時按 `Snap`。
2. 確認可成功下載 PNG。
3. 兩路畫面內容應與當前對應 video 一致。

## 風險與注意事項

1. `/dev/video1` 會受硬件枚舉順序影響，必要時改成穩定 udev path。
2. `hostNetwork: true` 下，8081 與 node 其他程式共享 namespace，撞 port 會導致 pod 啟動失敗。
3. 跨網段/複雜 NAT 場景仍建議加 STUN/TURN。

# WebRTC Step 1

今個階段只做咗脫殼測試所需改動，未碰 Kubernetes Deployment、Service 或前端正式 React 畫面。

改動如下：

1. 喺 `docker/pyproject.toml` 加入 `aiohttp`、`aiortc`、`av`、`opencv-python`，俾容器內 Python 可以起 WebRTC signal server 同讀鏡頭。
2. 新增 `src/http_streamer/webrtc_streamer.py`，提供一個最細可用嘅 WebRTC streamer：
   - 支援 `--device` 指定鏡頭 index 或裝置路徑。
   - 支援 `--port` 指定 HTTP signaling port。
   - 提供 `POST /offer` 做 SDP offer/answer 交換。
   - 提供 `GET /health` 做基本健康檢查。
   - 加入 CORS header，方便由獨立 HTML 頁直接測試。
3. 新增 `src/webUI/test_webrtc.html`，用最少量 JavaScript：
   - 建立 `RTCPeerConnection`。
   - 發送 SDP offer 去 Python server。
   - 接收 SDP answer。
   - 將遠端視訊 attach 去 `<video>`。

建議測試方式：

1. 喺 streamer 主機執行：`python src/http_streamer/webrtc_streamer.py --device 0 --port 8080`
2. 喺 land-pc 打開 `src/webUI/test_webrtc.html`
3. 將頁面內 signal URL 指向 streamer 主機，例如 `http://rov.local:8080/offer`
4. 撳 `Connect`，確認畫面成功出現

如果今步 work，下一階段先值得處理：

1. STUN/TURN 設定
2. React 正式 UI 整合
3. K8s Service / Ingress / Deployment 改造
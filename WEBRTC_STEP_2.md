# WebRTC Step 2 (Detailed)

今階段已經由「本機脫殼測試」進一步去到「可部署版本」。
目標係令 `http-streamer-a-deployment` 真正改用 WebRTC，而且避免 node network 封鎖 UDP。

## 今次實際改咗乜

1. 更新容器內容，確保 WebRTC Python 腳本真係喺 runtime image 入面存在。
   - 檔案：`docker/Dockerfile`
   - 改動：新增以下 copy
     - `COPY --from=builder /ros2_ws/src/http_streamer/webrtc_streamer.py /ros2_ws/webrtc_streamer.py`
   - 原因：你要求 deployment 用 `python3 webrtc_streamer.py ...`，如果唔 copy 去 runtime，Pod 會 `No such file or directory`。

2. 修改 Ansible 部署藍圖，將 Camera A 由舊 MJPEG 程式改為 WebRTC。
   - 檔案：`ansible/k8s/manta-ray-deployment.yaml.j2`
   - 目標區段：`http-streamer-a-deployment`
   - 改動：
     - 將 container 啟動改為：
       - `command: ["python3", "webrtc_streamer.py", "--device", "/dev/video0", "--port", "8080"]`
     - 喺 `template.spec` 加入：
       - `hostNetwork: true`

3. `hostNetwork: true` 的作用（今次重點）
   - Pod 直接使用 host network namespace。
   - WebRTC 所需 UDP 封包唔再經 CNI/NAT 二次轉發，有助降低連線失敗率同 latency。
   - 同時要留意：host port 會同 node 上其他程序共享，避免 port collision。

## Build 與發佈

你要求執行 `build_and_copy_to_local_registry.sh`。腳本內容係：

1. `docker buildx build ... --push` 推到 DockerHub (`zkinhang/manta-ray-ros:latest`)
2. `skopeo copy ...` 複製去 `mantaray.local:5000/manta-ray-ros:latest`

本步重點係 image 內容已對齊 WebRTC 改動（依賴 + `webrtc_streamer.py` + deployment command）。

### 今次執行結果（本地環境）

已執行 `bash ./build_and_copy_to_local_registry.sh`，但未能完成推送，阻塞原因如下：

1. WSL/bash 環境未接通 Docker Desktop daemon（`docker could not be found in this WSL 2 distro`）。
2. `skopeo` 未安裝（`skopeo: command not found`）。
3. 腳本檔案行尾喺 bash 下出現 `\r` 相關錯誤（`$'\r': command not found`）。

所以今次係「配置與代碼已就緒」，但「image build/publish 未完成」。

## 部署後你應該見到嘅行為

1. `http-streamer-a` Pod 起動後，應該執行 Python WebRTC signal server。
2. `GET /health` 會回傳 `status/device/peers`。
3. 使用 `test_webrtc.html` 發 offer 去 `http://<rov-main-ip>:8080/offer`，應可收到 answer 並顯示畫面。

## 風險與注意事項

1. Camera A 目前 device 固定為 `/dev/video0`，如果 udev 次序改變，需同步修改 command。
2. `hostNetwork: true` 下，port `8080` 係 node-level port；同 node 上其他服務衝突會導致 Pod 啟動失敗。
3. 如果跨網段測試，下一步仍建議補 STUN/TURN 設定。

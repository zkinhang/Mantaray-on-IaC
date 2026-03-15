# Mantaray-on-IaC 項目結構說明

本文件詳細介紹每個資料夾同每個檔案嘅用途。

---

## 根目錄檔案

| 檔案 | 用途 |
|------|------|
| `README.md` | 項目主文件，包含 Ansible Playbook 快速指令、各 Playbook 功能說明同常見使用場景 |
| `build_and_copy_to_local_registry.sh` | 用 `docker buildx` 建構多架構 (amd64/arm64) Docker 映像並推送到 DockerHub，再用 `skopeo` 複製到本地 Registry (`mantaray.local:5000`) |
| `kube_permission.sh` | 將 K3s 產生嘅 `k3s.yaml` 複製到 `~/.kube/config` 並修正檔案權限，讓當前用戶可以使用 `kubectl` |
| `pyproject.toml` | 宿主機開發環境嘅 Python 依賴配置（用 `uv` 管理），包括 `ansible`、`kubernetes` 等工具 |
| `requirements.txt` | Python 依賴清單（同 pyproject.toml 互補） |
| `WEBRTC_STEP_1.md` | WebRTC 第一階段改動記錄，說明脫殼測試階段新增咗乜同點樣驗證 |
| `.python-version` | 指定 uv/pyenv 使用嘅 Python 版本 |
| `uv.lock` | `uv` 鎖定檔，確保所有人安裝完全一樣嘅依賴版本 |
| `.gitignore` | 指定唔需要納入 Git 版本控制嘅檔案 |
| `.gitattributes` | 設定 Git 嘅換行符處理方式（LF/CRLF） |
| `.dockerignore` | 指定 Docker build 時唔需要複製入映像嘅檔案 |

---

## `ansible/` — 自動化部署

用 Ansible 自動化整個 ROV 系統嘅安裝、配置同更新。

### 主要 Playbook

| 檔案 | 用途 |
|------|------|
| `playbook-infra-airgap.yaml` | **完整集群安裝**（離線/Air-gapped 環境）。從頭安裝 K3s Server 同 Agent、配置本地 Docker Registry、設置 DNS、貼標籤畀各個節點。只喺初次設置或重建集群時用 |
| `playbook-app.yaml` | **部署/更新應用程式**。讀取 `robot_params.json` 更新 Kubernetes ConfigMap，然後 apply 所有 ROS 2 應用嘅 Deployment。日常開發改完參數就跑呢個 |
| `playbook-dashboard-setup.yaml` | **部署 Kubernetes Dashboard**。安裝用嚟睇集群狀態嘅 Web UI |
| `playbook-network-switch.yaml` | **切換網絡模式**（Wi-Fi ↔ 有線）。重新配置集群嘅網絡接口，切換後需要重新跑 `playbook-app.yaml` |

### Inventory 清單

| 檔案 | 用途 |
|------|------|
| `inventory.ini` | **應用層 Inventory**：只包含 `localhost`（本機），用於部署 K8s 應用（`playbook-app.yaml` 使用） |
| `inventory_infra.ini` | **基礎設施 Inventory**：包含所有節點（`mantaray.local`、`rov.local`、`rov-cam.local`）嘅 IP 地址同用戶名，用於集群安裝 |

### `ansible/config/`

| 檔案 | 用途 |
|------|------|
| `robot_params.json` | **ROV 核心參數配置**。包含所有 ROS 2 節點嘅運行參數，例如 PID 增益值（Kp/Ki/Kd）、夾爪 PWM 範圍、推進器映射等。`playbook-app.yaml` 會讀呢個檔案並建立 Kubernetes ConfigMap 分發到各個 Pod |

### `ansible/vars/`

| 檔案 | 用途 |
|------|------|
| `deployment-vars.yaml` | 應用部署變數：Docker 映像名稱（`main_ros_image`、`microros_image`）、所有需要部署嘅 Deployment 名稱清單 |
| `hardware-paths.yaml` | 硬件路徑配置：攝像頭設備路徑（`/dev/video1`）、IMU 路徑（`/dev/imu`）、micro-ROS 串口（`/dev/ttyUSB0`）等 |
| `infra-vars.yaml` | 基礎設施路徑配置：K3s 安裝路徑、Docker 配置目錄、本地 Registry 數據目錄等 |

### `ansible/k8s/`

| 檔案 | 用途 |
|------|------|
| `manta-ray-deployment.yaml.j2` | **Kubernetes Deployment 主模板**（Jinja2 格式）。定義所有 ROS 2 節點嘅 Pod 規格，包括：`controller-deployment`（搖桿讀取）、`receiver-deployment`（夾爪控制）、`thrusterboard-deployment`、`pid-system-deployment`、`microros-agent-deployment`、`foxglove-bridge-deployment`、`http-streamer-a/b-deployment` 等。使用 `vars/deployment-vars.yaml` 同 `vars/hardware-paths.yaml` 嘅變數 |
| `robot-configmap.yaml.j2` | Kubernetes ConfigMap 模板，將 `robot_params.json` 嘅內容注入到集群，讓各個 Pod 可以讀取參數 |
| `dns-service.yaml` | Kubernetes Service 配置，提供 DNS 解析服務畀集群內部通信 |
| `cluster-services/dashboard-setup.yaml` | Kubernetes Dashboard 嘅 Service Account 同 ClusterRoleBinding |
| `cluster-services/dashboard-source.yaml` | Kubernetes Dashboard 嘅主要資源定義（Deployment、Service 等） |

---

## `docker/` — Docker 映像

### 主映像（ROSJazzy 應用）

| 檔案 | 用途 |
|------|------|
| `Dockerfile` | **多階段 Docker build**。Builder stage 安裝編譯工具（libevdev、OpenCV、libcurl）同 Python 套件，然後編譯所有 ROS 2 套件；Runtime stage 複製編譯結果建立輕量映像。基礎映像：`ros:jazzy-ros-base` |
| `entrypoint.sh` | Container 啟動腳本，source ROS 2 環境（`/opt/ros/jazzy/setup.bash`）同工作空間後執行傳入嘅指令 |
| `pyproject.toml` | Container 內 Python 環境嘅依賴配置，包含控制節點所需套件，以及 WebRTC 脫殼測試用嘅 `aiohttp`、`aiortc`、`av`、`opencv-python` |

### `docker/microros/`

| 檔案 | 用途 |
|------|------|
| `Dockerfile` | 建構 micro-ROS Agent 映像，包含 ESP32 刷機工具 (`esptool`)，讓 micro-ROS Agent 可以同 ESP32 microcontroller 通訊 |

---

## `k3s-setup/` — K3s 離線安裝包

| 路徑 | 用途 |
|------|------|
| `install.sh` | K3s 官方安裝腳本（離線版），支持環境變數控制安裝模式（Server/Agent）、版本等 |
| `files/k3s` | K3s amd64 二進制檔案（離線安裝用） |
| `files/k3s-arm64` | K3s ARM64 二進制檔案（ROV 板載電腦用） |
| `files/k3s-airgap-images-amd64.tar.zst` | K3s 離線映像包 (amd64)，包含 K3s 運行所需嘅所有容器映像 |
| `files/k3s-airgap-images-arm64.tar.zst` | K3s 離線映像包 (ARM64)，同上但係 ARM64 架構 |

---

## `src/` — 源代碼

### `src/ros2/` — ROS 2 套件

#### `controller_pkg/` — 搖桿控制器

| 檔案 | 用途 |
|------|------|
| `controller_pkg/joystick_reader.py` | **主要節點**。讀取 Xbox 搖桿輸入（用 `pygame`），將搖桿數據轉換成 `Twist` 消息發布到 `/controller/console` 话題，同時處理推進器啟用/停用邏輯 |
| `controller_pkg/thruster_init.py` | 向所有推進器發送中立 PWM 值（初始化信號），確保推進器安全啟動 |
| `controller_pkg/movement_test.py` | 推進器移動測試腳本，用於調試同驗證推進器配置 |
| `controller_pkg/testing.py` | 其他控制邏輯測試代碼 |
| `controller_pkg/joystick_reader_backup.py` | `joystick_reader.py` 嘅備份版本 |
| `package.xml` | ROS 2 套件描述：依賴聲明（`rclpy`、`geometry_msgs`、`custom_interfaces`、`pygame`） |

#### `control_system_pkg/` — 控制系統

| 檔案 | 用途 |
|------|------|
| `control_system_pkg/pid_system.py` | **PID 控制節點**。使用 `simple_pid` 庫對俯仰角（Pitch）、偏航角（Yaw）、滾轉角（Roll）同深度進行閉環控制，訂閱 IMU 數據同深度傳感器，輸出修正後嘅推進器指令 |
| `control_system_pkg/msg_converter.py` | **消息轉換節點**。將 `ControlSystemStatus` 複合消息拆解成獨立話題（`/system/depth`、`/system/orientation` 等），方便其他節點訂閱 |
| `control_system_pkg/configuration.py` | 控制系統嘅靜態配置參數（推進器矩陣、物理參數等） |
| `control_system_pkg/pitch_Compensation.py` | 俯仰角補償算法腳本，計算在傾斜狀態下如何補償推進力方向 |
| `control_system_pkg/visualizer.ipynb` | Jupyter Notebook，用於可視化控制系統數據同調試 PID 參數 |
| `package.xml` | ROS 2 套件描述：依賴 `rclpy`、`sensor_msgs`、`custom_interfaces`、`simple_pid` |

#### `receiver_pkg/` — 指令接收器

| 檔案 | 用途 |
|------|------|
| `receiver_pkg/gripper_decomposer.py` | **夾爪控制節點**。訂閱 `/controller/console` 的 `Twist` 消息，解析 D-pad 同按鍵輸入，轉換成 PWM 值通過 `Float32MultiArray` 發送給 micro-ROS（ESP32），控制夾爪嘅開合同旋轉。參數從 `robot_params.json` 讀取 |
| `package.xml` | ROS 2 套件描述 |

#### `thrusterboard_pkg/` — 推進器板驅動

| 檔案 | 用途 |
|------|------|
| `thrusterboard_pkg/ThrusterBoard_API.py` | **推進器板底層 API**。通過串口（Serial）同推進器控制板通訊，發送 PWM 值控制 8 個推進器，處理推進器映射（thruster mapping）同比例設置 |
| `thrusterboard_pkg/thrusterboard_rosserial.py` | **ROS 2 推進器節點**。訂閱推進器指令話題，調用 `ThrusterBoard_API` 通過串口驅動推進器 |
| `thrusterboard_pkg/Configuration.py` | 推進器板配置：端口、波特率、推進器映射關係 |
| `package.xml` | ROS 2 套件描述 |

#### `custom_interfaces/` — 自定義消息類型

| 檔案 | 用途 |
|------|------|
| `msg/ThrusterBoardStatus.msg` | 推進器板狀態消息（推進器 PWM 值等） |
| `msg/ControlSystemStatus.msg` | 控制系統綜合狀態（深度、IMU、模式等） |
| `msg/AutomationStatus.msg` | 自動化任務狀態 |
| `msg/Detector.msg` | 視覺檢測結果消息 |
| `msg/PowerLimit.msg` | 功率限制消息（配合搖桿觸發器控制推進器功率上限） |
| `msg/Tracker.msg` | 目標追蹤消息 |
| `msg/VisionSystem.msg` | 視覺系統綜合狀態 |
| `CMakeLists.txt` | CMake 構建配置，用於編譯自定義消息類型 |
| `package.xml` | ROS 2 套件描述 |

#### `debug_pkg/` — 調試工具

| 檔案 | 用途 |
|------|------|
| `debug_pkg/serial_test.py` | 串口測試節點。掃描可用串口，根據硬件 ID（`1A86:7523`）自動識別 microcontroller，測試串口讀寫通訊 |
| `debug_pkg/microros_test.py` | micro-ROS 連接測試腳本 |
| `package.xml` | ROS 2 套件描述 |

#### `fdilink_ahrs_ROS2/` — IMU 驅動

| 路徑 | 用途 |
|------|------|
| `src/` | FDILink AHRS IMU 傳感器嘅 ROS 2 C++ 驅動源碼，發布 `sensor_msgs/Imu` 話題（加速度、陀螺儀、姿態四元數） |
| `launch/` | ROS 2 launch 檔案，用於啟動 IMU 驅動節點 |
| `include/` | C++ 頭文件 |
| `wheeltec_udev.sh` | 設置 IMU 設備 udev 規則，確保設備始終以 `/dev/imu` 出現 |
| `package.xml` | ROS 2 套件描述（C++ 套件） |

#### `serial_ros2/` — 串口通訊庫

| 路徑 | 用途 |
|------|------|
| `src/` | ROS 2 串口通訊 C++ 庫源碼，為其他套件提供串口讀寫功能（被 `thrusterboard_pkg` 等依賴） |
| `include/` | C++ 頭文件 |
| `README.md` | 庫嘅使用說明 |
| `package.xml` | ROS 2 套件描述（C++ 套件） |

---

### `src/http_streamer/` — 視頻串流服務

| 檔案 | 用途 |
|------|------|
| `httpStreamer.cpp` | **主要串流服務**。用 OpenCV 捕捉攝像頭影像（自動掃描 `/dev/video0` 到 `/dev/video9`），通過 `httplib` 以 MJPEG 格式通過 HTTP 提供視頻串流 |
| `httpStreamer_poe.cpp` | PoE 攝像頭版本嘅串流服務（通過以太網供電攝像頭） |
| `httpGetImage.cpp` / `httpGetImage.py` | 從 HTTP 串流獲取單幀圖像嘅工具 |
| `httpGetImage_cam.cpp` | 直接從攝像頭獲取圖像嘅版本 |
| `httpStreamer.py` | Python 版本嘅 HTTP 串流服務 |
| `webrtc_streamer.py` | **WebRTC 脫殼測試串流腳本**。用 Python `aiortc` + `aiohttp` 開鏡頭並提供 `/offer` SDP 信令接口，支援 `--device` 同 `--port` 參數 |
| `include/` | C++ 頭文件（`httplib.h` 等） |
| `CMakeLists.txt` | CMake 構建配置 |

---

### `src/microRos/` — ESP32 固件

| 檔案 | 用途 |
|------|------|
| `main.cpp` | **ESP32 固件**。運行 micro-ROS，訂閱來自 ROS 2 嘅 `Float32MultiArray` 消息（夾爪 PWM 指令），用 `ESP32Servo` 控制多個舵機，同時控制 NeoPixel LED 燈。通過 Arduino Serial 傳輸協議同 micro-ROS Agent 通訊 |
| `platformio.ini` | PlatformIO 項目配置：目標板（ESP32）、所需庫（micro_ros_platformio、ESP32Servo、Adafruit NeoPixel） |
| `lib/` | 項目私有庫 |
| `examples/` | 參考示例代碼 |

---

### `src/launch_file/` — 啟動腳本

| 檔案 | 用途 |
|------|------|
| `launch_thruster.py` | ROS 2 launch 文件，用於同時啟動推進器相關嘅多個節點 |

---

### `src/webUI/` — Web 控制界面

#### `prototype.html`
早期原型版本嘅單頁控制界面（純 HTML）。

#### `test_webrtc.html`
最細可用嘅 WebRTC 測試頁，俾 land-pc 直接發 SDP offer 去 `webrtc_streamer.py` 並喺 `<video>` 顯示回傳畫面。

#### `mantaray-control-interface/` — 正式 React 應用

基於 **React + TypeScript + Vite + TailwindCSS** 嘅完整控制面板。

| 路徑 | 用途 |
|------|------|
| `index.tsx` | React 應用入口點 |
| `App.tsx` | 根組件，設置路由同全局狀態 |
| `types.ts` | TypeScript 類型定義（消息格式、狀態類型等） |
| `index.html` | HTML 模板 |
| `package.json` | Node.js 依賴配置（React、ROSLIB、TailwindCSS 等） |
| `vite.config.ts` | Vite 構建工具配置 |
| `tailwind.config.js` | TailwindCSS 樣式配置 |
| `tsconfig.json` | TypeScript 編譯器配置 |

**`components/`** — UI 組件

| 檔案 | 用途 |
|------|------|
| `Header.tsx` | 頂部導航欄，顯示連接狀態 |
| `Layout.tsx` | 頁面佈局包裝器 |
| `Navigation.tsx` | 側邊/頂部導航菜單 |
| `ControlPanel.tsx` | 主控制面板組件（推進器、PID 開關等） |
| `MovementControl.tsx` | 移動控制 UI（方向按鈕、搖桿可視化） |
| `StreamView.tsx` | 顯示 MJPEG 視頻串流嘅組件 |
| `TerminalLogs.tsx` | 實時 ROS 日誌顯示終端組件 |
| `CountdownTimer.tsx` | 比賽倒計時計時器組件 |

**`pages/`** — 頁面

| 檔案 | 用途 |
|------|------|
| `LandingPage.tsx` | 首頁/連接頁面，輸入 ROS Bridge 地址 |
| `DashboardPage.tsx` | 主儀表板頁面，整合視頻串流同控制面板 |
| `TelemetryPage.tsx` | 遙測數據頁面，顯示 IMU、深度、推進器狀態等數據 |
| `SettingsPage.tsx` | 設置頁面，配置連接參數 |

**`services/`**

| 檔案 | 用途 |
|------|------|
| `rosService.ts` | **ROS 連接服務**。使用 `roslib.js` 通過 WebSocket 連接到 ROS Bridge Server，管理 `/controller/console` 話題嘅發布同 PID 開關訂閱，處理重連邏輯 |

**`context/`**

| 檔案 | 用途 |
|------|------|
| `RosContext.tsx` | React Context，在整個應用中共享 ROS 連接狀態 |

**`hooks/`**

| 檔案 | 用途 |
|------|------|
| `useStreams.ts` | 自定義 Hook，管理 MJPEG 視頻串流嘅 URL 同連接狀態 |

---

### `src/Archived_for_demo/` — 舊版代碼存檔

包含早期用於比賽演示嘅套件，已不再主動維護：

| 資料夾 | 原用途 |
|--------|--------|
| `automation_pkg/` | 自動化任務執行套件（自動巡航、任務完成等） |
| `converter_pkg/` | 消息格式轉換套件 |
| `cpp_streaming/` | 舊版 C++ 視頻串流實現 |
| `morsecode_pkg/` | 摩斯密碼燈光控制套件 |
| `sender_pkg/` | 指令發送套件 |
| `streaming_pkg/` | 舊版串流套件 |
| `opencv/` | OpenCV 電腦視覺任務（AUV 資格賽任務） |

---

## `skills/` — Copilot 技能

### `skills/mantaray-consultant/`

| 路徑 | 用途 |
|------|------|
| `SKILL.md` | 定義 GitHub Copilot 自定義技能嘅指令，使 Copilot 了解本項目嘅背景知識 |
| `references/hardware.md` | ROV 硬件清單同接線說明參考文件 |
| `references/ros2-packages.md` | ROS 2 套件說明同話題清單參考文件 |
| `references/troubleshooting.md` | 常見問題排查指南 |
| `scripts/debug_info.sh` | 收集調試信息嘅腳本（K8s 狀態、Pod 日誌等） |
| `scripts/get_params.sh` | 從集群讀取當前 robot_params ConfigMap 值嘅腳本 |

---

## `archived-scripts/` — 舊版腳本存檔

| 檔案 | 原用途（已棄用） |
|------|---------------|
| `air-gapped-k3s.sh` | 舊版手動離線安裝 K3s 腳本（已被 Ansible Playbook 取代） |
| `create_remote_builder.sh` | 建立遠程 Docker Builder 嘅腳本 |
| `display_init.sh` | 初始化 X11 顯示環境嘅腳本 |
| `local_registry_push.sh` | 舊版推送映像到本地 Registry 嘅腳本 |
| `microros_image_build.sh` | 舊版建構 micro-ROS 映像嘅腳本 |

---

## 系統架構概覽

```
[搖桿 / Web UI]
       ↓
 controller_pkg (joystick_reader)
       ↓ /controller/console (Twist)
       ├─→ receiver_pkg (gripper_decomposer) → micro-ROS Agent → ESP32 → 夾爪舵機
       ├─→ control_system_pkg (pid_system) ← IMU (fdilink_ahrs) / 深度傳感器
       │         ↓ 修正指令
       └─→ thrusterboard_pkg → 串口 → 推進器控制板 → 8 個推進器
       
[攝像頭 A/B] → http_streamer → MJPEG HTTP → Web UI (StreamView)
[ROS 話題]   → foxglove-bridge / rosbridge-server → Web UI (rosService.ts)
[K8s 集群]   ← Ansible playbooks 管理部署
```

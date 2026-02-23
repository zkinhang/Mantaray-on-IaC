# --- Build Stage ---
# This stage installs dependencies, builds the workspace, and installs Python packages.
FROM ros:jazzy-ros-base AS builder

# Copy uv from official image
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /bin/uv

# Install build tools and pip
RUN apt-get update && apt-get install -y \
    libevdev-dev \
    ros-dev-tools \
    # Add C++ dependencies from your CMakeLists.txt
    libopencv-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ros2_ws

# use uv sync with pyproject.toml
ENV VENV_PATH=/ros2_ws/.venv
COPY docker/pyproject.toml ./pyproject.toml
COPY docker/uv.lock ./uv.lock
RUN uv sync --frozen --no-dev --no-install-project


RUN rm -rf .venv/lib/python3.12/site-packages/numpy* \
    && rm -rf .venv/lib/python3.12/site-packages/yaml* \
    && rm -rf .venv/lib/python3.12/site-packages/PyYAML* \
    && rm -rf .venv/lib/python3.12/site-packages/tornado* \
    && rm -rf .venv/lib/python3.12/site-packages/setuptools* \
    && rm -rf .venv/lib/python3.12/site-packages/wheel* \
    && find .venv -name "__pycache__" -type d -exec rm -rf {} +

COPY ./src/ros2/serial_ros2 ./src/serial/ros2/serial_ros2

RUN ["/bin/bash", "-c", " \
    source /opt/ros/jazzy/setup.bash && \
    echo '--- Building serial dependency (Cached Layer) ---' && \
    colcon build --packages-select serial \
"]

# Copy and build the ROS 2 workspace
COPY ./src ./src
# Build serial first, then source and build the rest
RUN ["/bin/bash", "-c", " \
    source /opt/ros/jazzy/setup.bash && \
    source install/setup.bash && \
    echo '--- Building remaining packages ---' && \
    colcon build --packages-skip serial \
"]

# Build the C++ nodes
RUN strip --strip-unneeded install/http_streamer/lib/http_streamer/* || true

# --- Final Stage ---
# This stage creates the small, final image for running the nodes.
FROM ros:jazzy-ros-core

# Install only the RUNTIME dependencies needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-opencv \
    python3-numpy \
    python3-gi \
    gir1.2-gst-plugins-base-1.0 \
    gir1.2-gst-plugins-bad-1.0 \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libcurl4 \
    libssl3 \
    ros-jazzy-cv-bridge \
    ros-jazzy-foxglove-bridge \
    ros-jazzy-rosbridge-server \
    net-tools \
    iputils-ping \
    vim-tiny \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/vim.tiny /usr/bin/vim

# # Create the 'input' group with the specific GID to match the host
RUN groupadd --gid 995 input

WORKDIR /ros2_ws

# Copy installed Python packages from the builder's virtual environment
COPY --from=builder /ros2_ws/.venv /ros2_ws/.venv

# Copy the built ROS 2 workspace from the builder stage
COPY --from=builder /ros2_ws/install ./install

# Copy the other launch files to run directly in src
COPY --from=builder /ros2_ws/src/launch_file /ros2_ws/src/launch_file

# WebRTC sender scripts
COPY --from=builder /ros2_ws/src/webrtc /ros2_ws/src/webrtc

# Copy the microros folder
# COPY --from=builder /ros2_ws/src/microRos /ros2_ws/src/microRos

# Copy and set up the entrypoint script
ENV PATH="/ros2_ws/.venv/bin:$PATH"
ENV PYTHONPATH="/usr/lib/python3/dist-packages:/ros2_ws/.venv/lib/python3.12/site-packages:$PYTHONPATH"

# Install runtime Python deps in the venv
RUN /ros2_ws/.venv/bin/pip install --no-cache-dir websockets

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
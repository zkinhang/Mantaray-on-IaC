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

# Copy and build the ROS 2 workspace
COPY ./src ./src
# Build serial first, then source and build the rest
RUN ["/bin/bash", "-c", " \
    source /opt/ros/jazzy/setup.bash && \
    echo '--- Building serial dependency first ---' && \
    colcon build --packages-select serial && \
    echo '--- Sourcing the local workspace to find the new package ---' && \
    source install/setup.bash && \
    echo '--- Building all remaining packages ---' && \
    colcon build && \
    source install/setup.bash \
"]

# Build the C++ nodes
RUN strip --strip-unneeded install/http_streamer/lib/http_streamer/* || true

# --- Final Stage ---
# This stage creates the small, final image for running the nodes.
FROM ros:jazzy-ros-core

# Install only the RUNTIME dependencies needed
RUN apt-get update && apt-get install -y \
    libopencv-core* \
    libopencv-imgproc* \
    libopencv-imgcodecs* \
    libopencv-highgui* \
    libcurl4 \
    libssl3 \
    ros-jazzy-foxglove-bridge \
    net-tools \
    iputils-ping \
    vim \
    && rm -rf /var/lib/apt/lists/*

# # Create the 'input' group with the specific GID to match the host
RUN groupadd --gid 995 input

WORKDIR /ros2_ws

# Copy installed Python packages from the builder's virtual environment
COPY --from=builder /ros2_ws/.venv /ros2_ws/.venv

# Copy the built ROS 2 workspace from the builder stage
COPY --from=builder /ros2_ws/install ./install

# Copy the other launch files to run directly in src
COPY --from=builder /ros2_ws/src/launch_file /ros2_ws/src/launch_file

# Copy the microros folder
# COPY --from=builder /ros2_ws/src/microRos /ros2_ws/src/microRos

# Copy and set up the entrypoint script
ENV PATH="/ros2_ws/.venv/bin:$PATH"
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
# Start from the base image
FROM microros/micro-ros-agent:jazzy

# Install the tool needed to create a Python virtual environment
RUN apt-get update && apt-get install -y python3-venv && rm -rf /var/lib/apt/lists/*

# Create a virtual environment in /opt/venv
ENV VENV_PATH=/opt/venv
RUN python3 -m venv $VENV_PATH && \
    # Use the pip from the venv to install the complete esptool package
    $VENV_PATH/bin/pip install esptool

# Add the virtual environment's bin directory to the system's PATH
# This makes the `esptool` command available directly.
ENV PATH="$VENV_PATH/bin:$PATH"
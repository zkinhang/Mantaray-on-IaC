# Build the main image and push to remote registry (dockerhub)
docker buildx build --platform linux/amd64,linux/arm64 -f docker/common/Dockerfile -t zkinhang/manta-ray-ros:latest --push .

# Build the microRos image and push to remote registry (dockerhub)
docker buildx build --platform linux/amd64,linux/arm64 -f docker/microros/Dockerfile -t zkinhang/microros-with-esptool:latest --push .

# Copy the main image from dockerhub to local registry
skopeo copy --all docker://docker.io/zkinhang/manta-ray-ros:latest docker://mantaray.local:5000/manta-ray-ros:latest --dest-tls-verify=false

# Copy the microRos image from dockerhub to local registry
skopeo copy --all docker://docker.io/zkinhang/microros-with-esptool:latest docker://mantaray.local:5000/microros-with-esptool:latest --dest-tls-verify=false
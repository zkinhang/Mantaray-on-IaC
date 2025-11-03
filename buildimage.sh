docker buildx build --platform linux/amd64,linux/arm64 -f docker/Dockerfile -t zkinhang/manta-ray-ros:latest --push .

docker buildx build --platform linux/arm64 -t zkinhang/microros-with-esptool:0.1 -f docker/microros/Dockerfile . --push
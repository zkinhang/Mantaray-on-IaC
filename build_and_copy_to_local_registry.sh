# Build the main image and push to remote registry (dockerhub)
docker buildx build --platform linux/amd64,linux/arm64 -f docker/Dockerfile -t zkinhang/manta-ray-ros:latest --push .

# Copy the image from dockerhub to local registry
skopeo copy --all docker://docker.io/zkinhang/manta-ray-ros:latest docker://mantaray.local:5000/manta-ray-ros:latest --dest-tls-verify=false
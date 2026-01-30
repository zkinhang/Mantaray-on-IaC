docker buildx build --platform linux/amd64,linux/arm64 -f docker/Dockerfile -t zkinhang/manta-ray-ros:latest --push .

skopeo copy --all docker://docker.io/zkinhang/manta-ray-ros:latest docker://mantaray.local:5000/manta-ray-ros:latest --dest-tls-verify=false
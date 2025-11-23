docker build -f docker/Dockerfile -t mantaray.local:5000/manta-ray-ros:amd64 .

docker buildx build --platform linux/arm64 . -f docker/Dockerfile -t mantaray.local:5000/manta-ray-ros:arm64 --load

docker push mantaray.local:5000/manta-ray-ros:arm64
docker push mantaray.local:5000/manta-ray-ros:amd64

docker pull mantaray.local:5000/manta-ray-ros:amd64
docker pull mantaray.local:5000/manta-ray-ros:arm64

docker manifest rm mantaray.local:5000/manta-ray-ros:latest || true

docker manifest create mantaray.local:5000/manta-ray-ros:latest --amend mantaray.local:5000/manta-ray-ros:amd64 --amend mantaray.local:5000/manta-ray-ros:arm64 --insecure

docker manifest push mantaray.local:5000/manta-ray-ros:latest
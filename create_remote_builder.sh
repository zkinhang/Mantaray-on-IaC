docker buildx create --name mantaray_builder --node mantaray_builder --platform linux/amd64 --driver-opt env.BUILDKI
T_STEP_LOG_MAX_SIZE=10000000   --driver-opt env.BUILDKIT_STEP_LOG_MAX_SPEED=10000000 --config /home/edwin/buildkitd.toml

docker buildx create --name mantaray_builder --append --node raspbuilder --platform linux/arm64 ssh://EEC@docker-bui
lder.local --driver-opt env.BUILDKIT_STEP_LOG_MAX_SIZE=10000000   --driver-opt env.BUILDKIT_STEP_LOG_MAX_SPEED=10000000 --config /home/edwin/buildkitd.toml

docker buildx use mantaray_builder

docker buildx inspect --bootstrap
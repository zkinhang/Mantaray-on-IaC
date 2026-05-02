FROM python:3.12-slim

# Install uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency definition
COPY src/param_configurator/pyproject.toml ./

# Install dependencies using uv directly into the system environment to keep the container slim
RUN uv pip install --system -r pyproject.toml

# Copy application code
COPY src/param_configurator/ ./

EXPOSE 5000

CMD ["python", "app.py"]

FROM python:3.13-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir .

ENV PORT=8080
EXPOSE 8080

# uvicorn sirve la app FastAPI definida como `app` en main.py
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]

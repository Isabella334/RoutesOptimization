# Imagen base oficial de Python 3.13 slim (menor tamaño que full)
FROM python:3.13-slim

WORKDIR /app

# Copiar todo el proyecto al contenedor
COPY . .

# Instalar dependencias del proyecto (incluyendo los paquetes locales src/)
# --no-cache-dir reduce el tamaño de la imagen final
RUN pip install --no-cache-dir .

# Cloud Run inyecta el puerto en la variable de entorno PORT
ENV PORT=8080
EXPOSE 8080

# functions-framework arranca el servidor HTTP apuntando a la función `main`
CMD ["sh", "-c", "functions-framework --target=main --port=$PORT"]

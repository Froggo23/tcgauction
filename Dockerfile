# Use Eclipse Temurin JDK 17 (same pattern as working Railway template)
FROM eclipse-temurin:17-jdk-alpine

# Create and change to the app directory
WORKDIR /app

# Copy files to the container image
COPY . ./

# Make gradlew executable
RUN chmod +x ./gradlew

# Build the app
RUN ./gradlew clean build -x test --no-daemon

# Run the app
CMD ["sh", "-c", "java -jar build/libs/*.jar"]

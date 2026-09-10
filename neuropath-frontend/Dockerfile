FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy project files
COPY . .

EXPOSE 5173

# Run Vite dev server, binding to all network interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

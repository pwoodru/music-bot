FROM node:20-slim

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip && \
    pip3 install -U yt-dlp && \
    apt-get clean

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

CMD ["npm", "run", "dev"]

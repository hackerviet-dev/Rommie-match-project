FROM golang:1.25-alpine AS build
WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/roomiematch-chat .

FROM alpine:3.22
RUN addgroup -S roomiematch && adduser -S roomiematch -G roomiematch
WORKDIR /app
COPY --from=build /out/roomiematch-chat ./roomiematch-chat
USER roomiematch
EXPOSE 8081
ENTRYPOINT ["./roomiematch-chat"]

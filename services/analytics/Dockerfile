FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /analytics ./cmd/api

FROM alpine:3.20
RUN adduser -D -H analytics
USER analytics
COPY --from=build /analytics /analytics
EXPOSE 8081
ENTRYPOINT ["/analytics"]

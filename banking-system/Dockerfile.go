FROM golang:1.21-alpine

WORKDIR /app

COPY go/ .
RUN go mod download
RUN go build -o banking-service main.go

EXPOSE 50051

CMD ["./banking-service"]

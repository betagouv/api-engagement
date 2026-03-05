FROM alpine:3

RUN apk add --no-cache bash postgresql-client

COPY sync.sh /sync.sh
RUN chmod +x /sync.sh

CMD ["/sync.sh"]

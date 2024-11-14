build:
	docker build . -t fashion-socket-server:latest --no-cache

run:	
	docker ps -a -q -f name=fashion-socket-server | grep -q . && docker rm -f fashion-socket-server || echo "Container not running or doesn't exist"
	docker run -p 8001:8001 --name fashion-socket-server -d fashion-socket-server:latest
# Spielesammlung

## Neue Spiele anlegen

- Ordner in Root hinzufügen
- in Ordner index.html hinzufügen
- node generate.js ausführen um Spiel auf Landing-Page anzuzeigen

# Server Konfiguration

```shell
server {
    root /var/www/html;

    # Add index.php to the list if you are using PHP
    index index.html index.htm index.nginx-debian.html;

    server_name mrx3k1.de www.mrx3k1.de 69.62.121.168;

    location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to displaying a 404.
        try_files $uri $uri/ =404;
    }

    location /gta/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /stuff/linux-terminal-simulator/ {
        alias /var/www/html/stuff/linux-terminal-simulator/build/;
        try_files $uri $uri/ /stuff/linux-terminal-simulator/index.html;
    }

    location /greystone/ {
        alias /var/www/html/greystone/;
        try_files $uri $uri.html $uri/ =404;
    }

    location /games/ {
        alias /var/www/html/games/;
        try_files $uri $uri.html $uri/ =404;
    }

    location /stuff/ {
        alias /var/www/html/stuff/;
        try_files $uri $uri.html $uri/ =404;
    }

    # WebSocket-Proxy für den Pong-Signaling-Server
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL-Konfiguration
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/mrx3k1.de/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/mrx3k1.de/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.mrx3k1.de) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = mrx3k1.de) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80 default_server;

    server_name mrx3k1.de www.mrx3k1.de 69.62.121.168;
    return 404; # managed by Certbot
}
```
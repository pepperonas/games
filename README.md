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

    server_name mrx3k1.de www.mrx3k1.de;

    # Globale CORS-Header
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    # Generischer /games/ Block für andere Spiele (keine Überschneidung mit brain-buster)
    location ~ ^/games/(?!brain-buster).+$ {
        alias /var/www/html/games/;
        try_files $uri $uri.html $uri/ =404;
    }

    # Brain-Buster SPA - KLARE PFADZUORDNUNG
    location /games/brain-buster/ {
        alias /var/www/html/games/brain-buster/;
        try_files $uri $uri/ /games/brain-buster/index.html;
    }
    
    # WebSocket-Proxy für den BrainBuster-Multiplayer-Server
location /socket-api/ {
    proxy_pass http://localhost:4999/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}    
 
    # Rest deiner bestehenden Konfiguration...
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

    # Spezifische Konfiguration für linux-terminal-simulator
    location /linux-terminal-simulator/ {
        alias /var/www/html/linux-terminal-simulator/build/;
        try_files $uri $uri/ /linux-terminal-simulator/index.html;
    }

    location /sm-downloader/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    location /greystone/ {
        alias /var/www/html/greystone/;
        try_files $uri $uri.html $uri/ =404;
    }

    location /weather/ {
        alias /var/www/html/weather/build/;
        try_files $uri $uri/ /weather/index.html;
    }

    # Generischer Fallback-Block
    location / {
        alias /var/www/html/;
        try_files $uri $uri/ @spa_fallback;
    }

    # SPA-Fallback für alle /stuff/-Unterordner
    location @spa_fallback {
        set $subdirectory "";
        if ($request_uri ~ "^/([^/]+)") {
            set $subdirectory $1;
        }

        # Prüfe zuerst auf build/index.html (für SPAs mit Build-Struktur)
        if (-f $document_root/$subdirectory/build/index.html) {
            rewrite ^/([^/]+)(.*)$ /$1/build/index.html break;
        }

        # Fallback auf direkte index.html im Unterordner
        if (-f $document_root/$subdirectory/index.html) {
            rewrite ^/([^/]+)(.*)$ /$1/index.html break;
        }

        # Wenn keine der beiden Dateien existiert, 404 zurückgeben
        return 404;
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SSL-Konfiguration
    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/mrx3k1.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mrx3k1.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.mrx3k1.de) {
        return 301 https://$host$request_uri;
    }

    if ($host = mrx3k1.de) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80 default_server;

    server_name mrx3k1.de www.mrx3k1.de;
    return 404;
}
```
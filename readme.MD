
nano 82.112.234.248

server {
    listen 80;
    root /root/FlexiWork/frontend/build;

    location / {
        try_files $uri $uri/ =404;
    }
}

ln -s ../sites-available/82.112.234.248.conf

cp 82.112.234.248.conf flexiworkhub.com.conf

server {
    listen 80;
    server_name flexiworkhub.com www.flexiworkhub.com;
    root /root/FlexiWork/frontend/build;

    location / {
            try_files $uri $uri/ /index.html;
    }
}

ln -s ../sites-available/flexiworkhub.com.conf

server {
        listen 80;
	server_name api.flexiworkhub.com www.api.flexiworkhub.com;

        location / {
                proxy_pass http:localhost:4050;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
        }
}

ln -s ../sites-available/api.flexiworkhub.com.conf

sudo certbot --nginx -d flexiworkhub.com -d www.flexiworkhub.com
sudo certbot --nginx -d api.flexiworkhub.com -d www.api.flexiworkhub.com

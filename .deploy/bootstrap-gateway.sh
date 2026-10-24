#!/bin/bash
set -euxo pipefail
exec > >(tee -a /var/log/shop4me-bootstrap.log) 2>&1

apt-get update
apt-get install -y ca-certificates curl git unzip nginx
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs
npm install -g pm2
mkdir -p /opt/shop4me
chown ubuntu:ubuntu /opt/shop4me
systemctl enable nginx
systemctl start nginx
node --version
npm --version
pm2 --version

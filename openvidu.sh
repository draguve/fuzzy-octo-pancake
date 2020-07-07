#!/bin/bash
sudo docker run -p 4443:4443 --rm -e DOMAIN_OR_PUBLIC_IP=192.168.43.64 -e OPENVIDU_SECRET=pioneer123 openvidu/openvidu-server-kms:2.14.0

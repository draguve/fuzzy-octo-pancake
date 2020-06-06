#!/bin/bash
sudo docker run -p 4443:4443 --rm -e OPENVIDU_SECRET=pioneer123 openvidu/openvidu-server-kms:2.14.0
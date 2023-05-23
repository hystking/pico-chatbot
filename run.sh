#!/bin/sh

cd `dirname $0`

while true
do
  env $(cat .env) node index.js
  sleep 10
done

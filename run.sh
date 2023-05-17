#!/bin/bash

while true
do
  env $(cat .env) node index.js
  sleep 10
done
```
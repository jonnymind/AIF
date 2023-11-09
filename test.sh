#!/bin/sh
export REACT_APP_NODE_ENV=test 
export REACT_APP_OPENAI_API_KEY=$(cat secret)
npm start

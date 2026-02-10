#!/bin/bash
# Simple script to run the trend radar pipeline
cd "$(dirname "$0")/trend_engine"
python3 main.py --run

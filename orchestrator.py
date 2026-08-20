#!/usr/bin/env python3
import sys
import os
import shlex

# Forward execution arguments to factory.py framework
args = " ".join(shlex.quote(arg) for arg in sys.argv[1:])
os.system(f"/home/wasa/.local/bin/factory.py {args} --cwd /home/wasa/projeler/enterprise-aps")

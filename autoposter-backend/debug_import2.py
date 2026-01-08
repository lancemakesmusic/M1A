import traceback
import importlib
import sys
import os

print('cwd:', os.getcwd())
print('sys.path[0]:', sys.path[0])
print('PYTHONPATH entries:')
for p in sys.path:
    print(' -', p)

try:
    importlib.import_module('robust_api')
    print('IMPORT OK')
except Exception:
    traceback.print_exc()

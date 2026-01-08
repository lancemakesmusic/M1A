import traceback

try:
    import robust_api
    print('IMPORT OK')
except Exception:
    traceback.print_exc()

# scripts/diag_db_signature.py
import inspect, importlib.util, pathlib

p = pathlib.Path(__file__).resolve().parent / 'db.py'
spec = importlib.util.spec_from_file_location('db', p)
db = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(db)

print("db module path:", db.__file__)
print("add_job signature:", inspect.signature(db.add_job))

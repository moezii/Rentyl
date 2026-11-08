"""
Test doubles shared by the route tests.

``FakeSupabase`` mimics the small part of the supabase-py query builder the
backend uses (table().select/insert/update/delete/eq/in_/order/range/limit/
single().execute(), rpc().execute(), storage.from_()). Every executed query is
recorded so tests can assert on table names and filters (e.g. that a
``company_id`` filter was applied), and results come from a responder function.
"""
from types import SimpleNamespace
from typing import Any, Callable, Dict, List, Optional


class FakeQuery:
    def __init__(self, client: "FakeSupabase", table: str):
        self.client = client
        self.table = table
        self.action = "select"
        self.payload: Any = None
        self.filters: List[tuple] = []
        self.is_single = False
        self.columns: Optional[str] = None

    # --- builders -------------------------------------------------------
    def select(self, *args, **_kwargs):
        self.action = "select"
        self.columns = args[0] if args else "*"
        return self

    def insert(self, payload):
        self.action, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.action, self.payload = "update", payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self.filters.append(("in", column, list(values)))
        return self

    def lt(self, column, value):
        self.filters.append(("lt", column, value))
        return self

    def order(self, *_args, **_kwargs):
        return self

    def range(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def single(self):
        self.is_single = True
        return self

    # --- helpers for assertions ----------------------------------------
    def filter_value(self, column) -> Optional[Any]:
        for _op, col, value in self.filters:
            if col == column:
                return value
        return None

    def execute(self):
        self.client.queries.append(self)
        data = self.client.responder(self)
        return SimpleNamespace(data=data, count=None)


class FakeStorageBucket:
    def __init__(self, client: "FakeSupabase", bucket: str):
        self.client = client
        self.bucket = bucket

    def upload(self, path=None, file=None, file_options=None, **kwargs):
        path = path if path is not None else kwargs.get("path")
        self.client.uploads.append({"bucket": self.bucket, "path": path, "file": file, "options": file_options})
        return {"Key": path}

    def get_public_url(self, path):
        return f"https://storage.example/{self.bucket}/{path}"

    def create_signed_url(self, path, ttl):
        return {"signedURL": f"https://storage.example/sign/{self.bucket}/{path}?ttl={ttl}"}

    def remove(self, paths):
        return []


class FakeStorage:
    def __init__(self, client: "FakeSupabase"):
        self.client = client

    def from_(self, bucket):
        return FakeStorageBucket(self.client, bucket)


class FakeSupabase:
    def __init__(self, responder: Optional[Callable[[FakeQuery], Any]] = None):
        self.queries: List[FakeQuery] = []
        self.uploads: List[Dict[str, Any]] = []
        self.responder = responder or (lambda q: [])
        self.storage = FakeStorage(self)
        self.rpc_calls: List[tuple] = []
        self.rpc_result: Any = []

    def table(self, name):
        return FakeQuery(self, name)

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return SimpleNamespace(execute=lambda: SimpleNamespace(data=self.rpc_result))

    # convenience
    def queries_for(self, table: str, action: Optional[str] = None) -> List[FakeQuery]:
        return [q for q in self.queries if q.table == table and (action is None or q.action == action)]

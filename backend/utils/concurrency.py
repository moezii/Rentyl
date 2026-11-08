"""
Run blocking route handlers off the event loop.

Most handlers are ``async def`` but their work is synchronous (the supabase-py
client, ReportLab, Resend): while one of them waits on the database, the whole
server waits. ``@offload`` turns such a handler into a plain function that
FastAPI runs in its threadpool; the original coroutine runs to completion on a
private event loop in that worker thread, so ``await`` inside it (services,
``UploadFile.read()``, ``asyncio.sleep``) keeps working and the response is
unchanged.
"""
import asyncio
import functools
import inspect


def offload(handler):
    if not inspect.iscoroutinefunction(handler):
        raise TypeError("@offload is for async handlers")

    def sync_handler(*args, **kwargs):
        return asyncio.run(handler(*args, **kwargs))

    functools.update_wrapper(sync_handler, handler)
    # FastAPI follows __wrapped__ to decide whether to await the endpoint;
    # keep the signature (parameters/dependencies) but present a sync function.
    del sync_handler.__wrapped__
    sync_handler.__signature__ = inspect.signature(handler)
    return sync_handler

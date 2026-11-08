# app/supabase/client.py

from supabase import create_client, Client, ClientOptions
from backend.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY

supabase_url = SUPABASE_URL
if supabase_url and not supabase_url.endswith("/"):
    supabase_url = f"{supabase_url}/"

# Shared server-side client: uses the SERVICE-ROLE key, so it bypasses RLS.
# Tenant isolation is enforced in the backend (every company-scoped query
# filters on the caller's company_id), and the public `anon` role has no direct
# table access (migrations/revoke_anon_table_access.sql). The anon key is only
# used for Supabase Auth calls (new_auth_client below). Never send this key, or
# data read with it, to the browser without filtering.
supabase: Client = create_client(supabase_url, SUPABASE_SERVICE_ROLE_KEY)

# Kept for the storage code that refers to it by this name
supabase_admin: Client = supabase


def new_auth_client() -> Client:
    """A throw-away anon-key client for one auth call (sign-in, sign-up, password reset).

    supabase-py switches a client's Authorization header to the user's token
    after sign-in/sign-up. Doing that on the shared ``supabase`` client made every
    later query (for every user) run as whoever signed in last, so auth calls
    must use their own client. Nothing is persisted or auto-refreshed.
    """
    return create_client(
        supabase_url,
        SUPABASE_KEY,
        options=ClientOptions(auto_refresh_token=False, persist_session=False),
    )

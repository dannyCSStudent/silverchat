import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL:
    raise Exception("Missing SUPABASE_URL")

if not SUPABASE_SERVICE_KEY:
    raise Exception("Missing SUPABASE_SERVICE_KEY")

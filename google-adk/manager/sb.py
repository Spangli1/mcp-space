import os

from supabase import create_client, Client
from dotenv import load_dotenv


load_dotenv()

# Initialize the Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(url, key)


username = os.getenv("DB_USERNAME")
password = os.getenv("DB_PASSWORD")
dbname = os.getenv("DB_NAME")
port = int(os.getenv("DB_PORT", 6543))  # Default to 6543 if not set
host = os.getenv("DB_HOST")

db_url = f"postgresql+psycopg2://{username}:{password}@{dbname}:{port}/{host}"



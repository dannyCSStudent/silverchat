from pathlib import Path


def main() -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    print("SilverChat uses apps/api/schema.sql as the initial seed source.")
    print(f"Apply this file in Supabase SQL editor: {schema_path}")


if __name__ == "__main__":
    main()

import time

import httpx


def execute_with_retry(query, retries: int = 3, delay_seconds: float = 0.15):
    last_error: Exception | None = None

    for attempt in range(retries):
        try:
            return query.execute()
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(delay_seconds * (attempt + 1))

    if last_error:
        raise last_error

    return query.execute()

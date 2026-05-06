const defaultUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const endpoints = ["/health", "/health/db"];

async function ping(url) {
  try {
    const response = await fetch(`${url}${endpoints[0]}`, { cache: "no-store" });
    return response.json();
  } catch {
    return { status: "unreachable" };
  }
}

async function pingDb(url) {
  try {
    const response = await fetch(`${url}${endpoints[1]}`, { cache: "no-store" });
    return response.json();
  } catch {
    return { status: "unreachable" };
  }
}

async function main() {
  const baseUrl = defaultUrl.endsWith("/") ? defaultUrl.slice(0, -1) : defaultUrl;
  console.log(`Checking health of ${baseUrl}`);

  const [api, db] = await Promise.all([ping(baseUrl), pingDb(baseUrl)]);

  console.log("API:", JSON.stringify(api, null, 2));
  console.log("DB:", JSON.stringify(db, null, 2));

  const healthy = api.status === "ok" && db.status === "ok";
  process.exit(healthy ? 0 : 1);
}

main();

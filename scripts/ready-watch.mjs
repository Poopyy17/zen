const services = [
  { name: "web", port: 3000 },
  { name: "core-service", port: 3001 },
  { name: "staff-management", port: 3002 },
  { name: "case-management", port: 3003 },
  { name: "gateway", port: 3004 },
];

async function isUp(port) {
  try {
    await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

async function waitForAll() {
  const pending = new Set(services.map((s) => s.port));
  while (pending.size > 0) {
    for (const service of services) {
      if (pending.has(service.port) && (await isUp(service.port))) {
        pending.delete(service.port);
      }
    }
    if (pending.size > 0) await new Promise((r) => setTimeout(r, 500));
  }
}

await waitForAll();

console.log("");
console.log("🎉 All services are running!");
console.log("👉 Open http://localhost:3000 in your browser");
console.log("");

// Keep this task alive so it behaves as a normal persistent turbo task
// (no cleanup needed on Ctrl+C — turbo forwards the signal, we hold nothing).
// A plain interval avoids Node's "unsettled top-level await" warning.
setInterval(() => {}, 1 << 30);

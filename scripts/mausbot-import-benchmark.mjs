import { performance } from 'node:perf_hooks';
import { parseMausbotPackage } from '../src/mausbot-import.ts';

/** Run with: node scripts/mausbot-import-benchmark.mjs
 * Only measures JSON package parsing/mapping; it does not measure native
 * Tauri startup, model tokens/s, bot creation IPC or model throughput.
 */
function fixture(count) {
  const agents = Array.from({ length: count }, (_, i) => ({
    key: 'bot-' + i, name: 'Bot ' + i, title: 'Researcher',
    description: 'Read and compare claims; return citations.',
    soul: 'Keep claims falsifiable.', playbooks: ['verify'],
  }));
  const rooms = Array.from({ length: Math.ceil(count / 8) }, (_, i) => ({
    name: 'Department ' + i, members: agents.slice(i * 8, (i + 1) * 8).map(bot => bot.key),
  }));
  return {
    format: 'openmaus.package', version: 2,
    package: {
      name: 'Benchmark ' + count,
      team: { brief: 'Every claim requires evidence.' },
      agents,
      playbooks: [{ key: 'verify', instructions: 'Verify claims independently.' }],
      rooms,
    },
  };
}

for (const count of [1, 8, 32]) {
  const input = fixture(count);
  for (let i = 0; i < 250; i++) parseMausbotPackage(input);
  const durations = [];
  const heapBefore = process.memoryUsage().heapUsed;
  for (let i = 0; i < 1000; i++) {
    const t = performance.now();
    parseMausbotPackage(input);
    durations.push(performance.now() - t);
  }
  const heapAfter = process.memoryUsage().heapUsed;
  durations.sort((a, b) => a - b);
  const percentile = p => durations[Math.floor((durations.length - 1) * p)];
  console.log(JSON.stringify({
    agents: count, rooms: input.package.rooms.length, iterations: durations.length,
    medianMs: +percentile(0.5).toFixed(4),
    p95Ms: +percentile(0.95).toFixed(4),
    p99Ms: +percentile(0.99).toFixed(4),
    heapDeltaKiB: +((heapAfter - heapBefore) / 1024).toFixed(1),
  }));
}

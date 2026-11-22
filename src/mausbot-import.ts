/** Data-only OpenMausBot package importer. No Electron or agent harness is loaded. */
export interface MausbotAgent {
  key: string; name: string; role: string; instructions: string; soul: string;
}
export interface MausbotRoom { name: string; members: string[]; }
export interface MausbotBlueprint { name: string; agents: MausbotAgent[]; rooms: MausbotRoom[]; }
export const MAUSBOT_MAX_FILE_BYTES = 1024 * 1024;
const MAX_AGENTS = 32, MAX_TEXT = 16 * 1024, MAX_SOUL = 64 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(label + ' must be an object.');
  return value as Record<string, unknown>;
}
function field(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(label + ' is required.');
    return '';
  }
  if (typeof value !== 'string') throw new Error(label + ' must be text.');
  const result = value.trim();
  if (required && !result) throw new Error(label + ' is required.');
  if (new TextEncoder().encode(result).length > max) throw new Error(label + ' exceeds ' + max + ' bytes.');
  return result;
}
function list(value: unknown, label: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(label + ' must be a list.');
  return value;
}

/**
 * Accept the current OpenMausBot JSON package v2. This is intentionally an
 * allowlist: imports identity, text playbooks and room membership only.
 * It never imports credentials, connections, tools, skills, memories,
 * models, permissions, computers or enabled routines.
 */
export function parseMausbotPackage(value: unknown): MausbotBlueprint {
  const root = object(value, 'Package');
  if (root.format !== 'openmaus.package' || root.version !== 2) {
    throw new Error('Choose an OpenMausBot JSON package version 2; BotMRR Markdown is not supported yet.');
  }
  const pkg = object(root.package, 'Package data');
  const name = field(pkg.name, 'Package name', 100, true);
  const team = pkg.team === undefined ? {} : object(pkg.team, 'Team');
  const brief = field(team.brief, 'Team instructions', MAX_TEXT);
  const rawAgents = list(pkg.agents, 'Agents');
  if (rawAgents.length < 1 || rawAgents.length > MAX_AGENTS) throw new Error('A package must contain 1–32 agents.');
  const keys = new Set<string>(), names = new Set<string>();
  const playbooks = new Map<string, string>();
  for (const entry of list(pkg.playbooks, 'Playbooks')) {
    const record = object(entry, 'Playbook');
    const key = field(record.key, 'Playbook key', 80, true);
    playbooks.set(key, field(record.instructions, 'Playbook instructions', MAX_TEXT));
  }
  const agents = rawAgents.map((entry, index) => {
    const agent = object(entry, 'Agent ' + (index + 1));
    const key = field(agent.key, 'Agent key', 80, true);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(key) || keys.has(key)) throw new Error('Duplicate or invalid agent key: ' + key);
    keys.add(key);
    const agentName = field(agent.name, 'Agent name', 60, true);
    if (names.has(agentName.toLowerCase())) throw new Error('Duplicate agent name: ' + agentName);
    names.add(agentName.toLowerCase());
    const role = field(agent.title, 'Agent title', 200) || 'Assistant';
    const description = field(agent.description, 'Agent description', MAX_TEXT);
    const soul = field(agent.soul, 'Agent personality', MAX_SOUL);
    const steps = list(agent.playbooks, 'Agent playbooks').map(item => {
      if (typeof item !== 'string' || !playbooks.has(item)) throw new Error('Unknown playbook for ' + agentName + '.');
      return playbooks.get(item) ?? '';
    }).filter(Boolean);
    const instructions = [description, brief && 'Team context: ' + brief, ...steps].filter(Boolean).join('\n\n') || 'Act as ' + role + '.';
    field(instructions, agentName + ' instructions', MAX_TEXT, true);
    return { key, name: agentName, role, instructions, soul };
  });
  const rooms = list(pkg.rooms, 'Rooms').map((entry, index) => {
    const room = object(entry, 'Room ' + (index + 1));
    const roomName = field(room.name, 'Room name', 48, true).replace(/^#+/, '');
    if (!roomName) throw new Error('Room name is required.');
    const members = list(room.members, 'Room members');
    if (!members.length) throw new Error('Room ' + roomName + ' has no members.');
    const memberKeys = members.map(member => {
      if (typeof member !== 'string' || !keys.has(member)) throw new Error('Unknown member in room ' + roomName + '.');
      return member;
    });
    return { name: roomName, members: [...new Set(memberKeys)] };
  });
  if (rooms.length > MAX_AGENTS) throw new Error('A package has too many rooms.');
  return { name, agents, rooms };
}

/** Reads bytes locally; selecting a file never runs code or uploads it. */
export async function readMausbotFile(file: File): Promise<MausbotBlueprint> {
  if (file.size > MAUSBOT_MAX_FILE_BYTES) throw new Error('OpenMausBot JSON package is larger than 1 MB.');
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())); }
  catch { throw new Error('The selected file is not valid UTF-8 JSON.'); }
  return parseMausbotPackage(value);
}

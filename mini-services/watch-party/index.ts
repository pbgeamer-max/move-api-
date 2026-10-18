// TVORA watch-party service — real-time synchronized watching + live chat.
// Independent bun mini service (socket.io). PORT 3005 hardcoded (Caddy forwards via XTransformPort).
// Event contract (see src/components/tvora/watch-party.tsx on the client side):
//   client → server:
//     party:create     { name }                                  → ack { ok:true, code } | { ok:false, error:"name-required" }
//     party:join       { code, name }                            → ack { ok:true, code } | { ok:false, error:"room-not-found" | "name-required" }
//     party:chat       { content }                               → (broadcast only)
//     party:sync       { positionSeconds, isPlaying, titleId?, kind? } → HOST ONLY (ignored otherwise)
//     party:requestSync {}                                      → emits current playback to requester only
//     party:leave      {}                                        → detaches (+ host migration if needed)
//   server → client:
//     party:state      { code, yourSocketId, hostId, members[], messages[], playback }  (joiner + creator)
//     party:members    { members[], hostId }
//     party:playback   { positionSeconds, isPlaying, updatedAt, titleId, kind }
//     party:chat       { id, ts, type:"user", name, content } | { id, ts, type:"system", event:"join"|"leave"|"host", name? }
// Rooms are in-memory with a 10-minute empty-room TTL sweep; host migrates to the earliest-joined member on host exit.
import { createServer } from "http";
import { Server, type Socket } from "socket.io";

const PORT = 3005; // DO NOT use env PORT — the gateway expects this fixed port.

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Model ────────────────────────────────────────────────────────────────────

// Unambiguous room-code alphabet: no 0/O/1/I (also no L to avoid 1/l confusion).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const NAME_MAX = 24;
const CONTENT_MAX = 300;
const MESSAGES_MAX = 60;
const ROOM_TTL_MS = 10 * 60 * 1000; // empty rooms are deleted after 10 minutes

type PartyMember = { id: string; name: string; joinedAt: number };
type Playback = {
  positionSeconds: number;
  isPlaying: boolean;
  updatedAt: number;
  titleId: string | null;
  kind: string | null;
};
type SystemEvent = "join" | "leave" | "host";
type ChatMessage =
  | { id: string; ts: number; type: "user"; name: string; content: string }
  | { id: string; ts: number; type: "system"; event: SystemEvent; name?: string };
type Room = {
  code: string;
  hostId: string;
  createdAt: number;
  emptySince: number | null;
  members: Map<string, PartyMember>; // socketId → member (insertion order = join order)
  playback: Playback;
  messages: ChatMessage[]; // last 60
};

const rooms = new Map<string, Room>();
const socketRoom = new Map<string, string>(); // socketId → room code

const now = () => Date.now();
const mid = () => Math.random().toString(36).slice(2, 10);
const roomChannel = (code: string) => `party:${code}`;
const membersList = (room: Room) => Array.from(room.members.values());

function genCode(): string {
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
  return name.length >= 1 ? name : null;
}

function cleanContent(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const content = v.trim().slice(0, CONTENT_MAX);
  return content.length >= 1 ? content : null;
}

function sysMsg(event: SystemEvent, name?: string): ChatMessage {
  return { id: mid(), ts: now(), type: "system", event, name };
}

function pushMessage(room: Room, msg: ChatMessage) {
  room.messages.push(msg);
  if (room.messages.length > MESSAGES_MAX) {
    room.messages.splice(0, room.messages.length - MESSAGES_MAX);
  }
}

function broadcastMembers(room: Room) {
  io.to(roomChannel(room.code)).emit("party:members", {
    members: membersList(room),
    hostId: room.hostId,
  });
}

// ─── Join / detach ────────────────────────────────────────────────────────────

function joinRoom(socket: Socket, room: Room, name: string) {
  room.emptySince = null;
  socket.join(roomChannel(room.code));
  socketRoom.set(socket.id, room.code);
  room.members.set(socket.id, { id: socket.id, name, joinedAt: now() });
  const msg = sysMsg("join", name);
  pushMessage(room, msg);
  io.to(roomChannel(room.code)).emit("party:chat", msg);
  broadcastMembers(room);
}

function detach(socket: Socket): Room | null {
  const code = socketRoom.get(socket.id);
  if (!code) return null;
  socketRoom.delete(socket.id);
  socket.leave(roomChannel(code));
  const room = rooms.get(code);
  if (!room) return null;

  const member = room.members.get(socket.id);
  room.members.delete(socket.id);
  if (member) {
    const msg = sysMsg("leave", member.name);
    pushMessage(room, msg);
    io.to(roomChannel(code)).emit("party:chat", msg);
    console.log(`[party] ${member.name} left ${code} (${room.members.size} inside)`);
  }

  if (room.members.size === 0) {
    room.emptySince = now(); // TTL sweep deletes it later
  } else {
    if (room.hostId === socket.id) {
      // Host migration → earliest-joined remaining member (Map preserves join order)
      let next: PartyMember | null = null;
      for (const m of room.members.values()) {
        next = m;
        break;
      }
      if (next) {
        room.hostId = next.id;
        const hostMsg = sysMsg("host", next.name);
        pushMessage(room, hostMsg);
        io.to(roomChannel(code)).emit("party:chat", hostMsg);
        console.log(`[party] host migrated in ${code} → ${next.name}`);
      }
    }
    broadcastMembers(room);
  }
  return room;
}

// ─── Empty-room TTL sweep ─────────────────────────────────────────────────────

let sweep: ReturnType<typeof setInterval> | null = null;
function ensureSweep() {
  if (sweep) return;
  sweep = setInterval(() => {
    const t = now();
    for (const [code, room] of rooms) {
      if (room.members.size === 0 && room.emptySince && t - room.emptySince > ROOM_TTL_MS) {
        rooms.delete(code);
        console.log(`[party] room ${code} expired (empty > 10min)`);
      }
    }
    if (rooms.size === 0 && sweep) {
      clearInterval(sweep);
      sweep = null;
      console.log("[party] sweep paused — no rooms");
    }
  }, 60_000);
}

// ─── Wire up ──────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[party] socket connected: ${socket.id}`);

  socket.on("party:create", (data: unknown, ack?: (res: unknown) => void) => {
    const name = cleanName((data as { name?: unknown })?.name);
    if (!name) {
      ack?.({ ok: false, error: "name-required" });
      return;
    }
    detach(socket); // in case the socket was in another room
    const code = genCode();
    const room: Room = {
      code,
      hostId: socket.id,
      createdAt: now(),
      emptySince: null,
      members: new Map(),
      playback: { positionSeconds: 0, isPlaying: false, updatedAt: now(), titleId: null, kind: null },
      messages: [],
    };
    rooms.set(code, room);
    joinRoom(socket, room, name);
    ensureSweep();
    ack?.({ ok: true, code });
    socket.emit("party:state", {
      code: room.code,
      yourSocketId: socket.id,
      hostId: room.hostId,
      members: membersList(room),
      messages: room.messages,
      playback: room.playback,
    });
    console.log(`[party] room ${code} created by ${name}`);
  });

  socket.on("party:join", (data: unknown, ack?: (res: unknown) => void) => {
    const name = cleanName((data as { name?: unknown })?.name);
    if (!name) {
      ack?.({ ok: false, error: "name-required" });
      return;
    }
    const code = String((data as { code?: unknown })?.code ?? "").toUpperCase().trim();
    const room = CODE_RE.test(code) ? rooms.get(code) : undefined;
    if (!room) {
      ack?.({ ok: false, error: "room-not-found" });
      return;
    }
    detach(socket); // leave any previous room first
    joinRoom(socket, room, name);
    ack?.({ ok: true, code });
    socket.emit("party:state", {
      code: room.code,
      yourSocketId: socket.id,
      hostId: room.hostId,
      members: membersList(room),
      messages: room.messages,
      playback: room.playback,
    });
    console.log(`[party] ${name} joined ${code} (${room.members.size} inside)`);
  });

  socket.on("party:chat", (data: unknown) => {
    const code = socketRoom.get(socket.id);
    const room = code ? rooms.get(code) : undefined;
    const member = room?.members.get(socket.id);
    if (!room || !member) return;
    const content = cleanContent((data as { content?: unknown })?.content);
    if (!content) return;
    const msg: ChatMessage = { id: mid(), ts: now(), type: "user", name: member.name, content };
    pushMessage(room, msg);
    io.to(roomChannel(room.code)).emit("party:chat", msg);
  });

  socket.on("party:sync", (data: unknown) => {
    const code = socketRoom.get(socket.id);
    const room = code ? rooms.get(code) : undefined;
    if (!room || room.hostId !== socket.id) return; // host-only — everyone else is ignored
    const d = (data ?? {}) as Record<string, unknown>;
    const position = Number(d.positionSeconds);
    if (!Number.isFinite(position) || position < 0) return;
    room.playback = {
      positionSeconds: Math.min(position, 24 * 3600),
      isPlaying: Boolean(d.isPlaying),
      updatedAt: now(),
      titleId: typeof d.titleId === "string" && d.titleId ? d.titleId : room.playback.titleId,
      kind: typeof d.kind === "string" && d.kind ? d.kind : room.playback.kind,
    };
    io.to(roomChannel(room.code)).emit("party:playback", room.playback);
  });

  socket.on("party:requestSync", () => {
    const code = socketRoom.get(socket.id);
    const room = code ? rooms.get(code) : undefined;
    if (!room) return;
    socket.emit("party:playback", room.playback);
  });

  socket.on("party:leave", () => {
    detach(socket);
  });

  socket.on("disconnect", () => {
    detach(socket);
    console.log(`[party] socket disconnected: ${socket.id}`);
  });

  socket.on("error", (error: unknown) => {
    console.error(`[party] socket error (${socket.id}):`, error);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[party] watch-party service listening on :${PORT}`);
});

// ─── Graceful shutdown (same pattern as the sanctioned websocket example) ─────
process.on("SIGTERM", () => {
  console.log("[party] Received SIGTERM signal, shutting down server...");
  httpServer.close(() => {
    console.log("[party] watch-party server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[party] Received SIGINT signal, shutting down server...");
  httpServer.close(() => {
    console.log("[party] watch-party server closed");
    process.exit(0);
  });
});

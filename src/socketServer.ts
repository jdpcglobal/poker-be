import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { verifyToken } from '@/utils/jwt';
import {
  addUserToSeat,
  userLeavesSeat,
  createGame,
  handlePlayerAction,
  advanceGameRound,
  showdown,
  ServiceError,
  InvalidStateError,
} from '@/services/gameService';
import { addBotToSeat } from '@/services/botService';
import { getBotStrategy } from '@/lib/bots/index';
import PokerDesk from '@/models/pokerDesk';
import type { IPokerDeskDocument } from '@/models/pokerDesk';
import User from '@/models/user';
import PracticeSession from '@/models/practiceSession';
import Bot from '@/models/bot';
import { PRACTICE_STARTING_CHIPS } from '@/config/constants';
import type { BotDifficulty } from '@/config/constants';
import type { JoinPayload, ActionPayload, LeavePayload } from '@/types/socketTypes';

// =============================================================================
// Module-level singleton — exported so the force-close API route can emit
// desk:closed without coupling socketServer to the route layer.
// =============================================================================

let _io: Server | null = null;

/** Returns the Socket.IO server instance. Throws if called before attachSocketServer. */
export function getIO(): Server {
  if (!_io) throw new Error('Socket.IO server is not yet initialized');
  return _io;
}

// =============================================================================
// Ephemeral per-desk server state — never persisted. Lost on restart.
// =============================================================================

interface DeskRuntimeState {
  userSockets: Map<string, string>;                         // userId -> socketId
  botSeats: Map<string, { strategy: 'easy' | 'medium' | 'hard' }>; // botUserId -> config
  skipCounts: Map<string, number>;                          // userId -> consecutive auto-folds
  turnTimer: ReturnType<typeof setTimeout> | null;
  turnTimerUserId: string | null;                           // owner of the current turnTimer
  autoStartTimer: ReturnType<typeof setTimeout> | null;
  practiceSessions: Map<string, string>;                    // userId -> PracticeSession _id string
  /**
   * Cached userId->username map. Built once when the first player joins and
   * refreshed on every seat change (join / leave). Used by every broadcast so
   * we never fire extra DB queries during a hand.
   */
  usernameCache: Map<string, string>;
}

const deskRuntime = new Map<string, DeskRuntimeState>();

/**
 * Exported so the force-close API route can clean up in-memory state after
 * wiping the desk in the DB.
 */
export function getDeskRuntime(): Map<string, DeskRuntimeState> {
  return deskRuntime;
}

// =============================================================================
// Username resolution
// =============================================================================

/**
 * Builds a fresh userId->username map for every userId present on a desk
 * (seats + currentGame.players). Runs User.find and Bot.find in parallel.
 * Falls back to 'unknown' for any unresolved id.
 *
 * Call this ONLY on seat changes (join / leave). During a hand, read from
 * the cached copy in deskRuntime to avoid per-event DB queries.
 */
async function buildUsernameMap(
  desk: IPokerDeskDocument
): Promise<Map<string, string>> {
  const allUserIds = new Set<string>();
  for (const s of desk.seats) allUserIds.add(s.userId.toString());
  if (desk.currentGame) {
    for (const p of desk.currentGame.players) allUserIds.add(p.userId.toString());
  }

  const ids = Array.from(allUserIds).map((id) => new Types.ObjectId(id));

  const [userDocs, botDocs] = await Promise.all([
    User.find({ _id: { $in: ids } })
      .select('username')
      .lean<{ _id: Types.ObjectId; username: string }[]>(),
    Bot.find({ deskId: desk._id })
      .lean<{ botId: Types.ObjectId; botName: string }[]>(),
  ]);

  const map = new Map<string, string>();
  for (const u of userDocs) map.set(u._id.toString(), u.username);
  for (const b of botDocs) map.set(b.botId.toString(), b.botName);
  return map;
}

// =============================================================================
// Broadcast helpers
// =============================================================================

/**
 * Produces a plain desk object safe for room broadcast:
 *   - holeCards stripped from every player (never leaked to the room).
 *   - username injected into every seat and every currentGame player.
 *
 * Synchronous — callers supply the already-resolved usernameMap.
 */
function redactAndEnrichDesk(
  desk: IPokerDeskDocument,
  usernameMap: Map<string, string>
): Record<string, unknown> {
  const obj = desk.toObject() as Record<string, unknown> & {
    seats?: Array<Record<string, unknown> & { userId: unknown }>;
    currentGame?: {
      players?: Array<Record<string, unknown> & { userId: unknown }>;
    } | null;
  };

  if (obj.seats) {
    obj.seats = obj.seats.map((s) => ({
      ...s,
      username: usernameMap.get(s.userId?.toString() ?? '') ?? 'unknown',
    }));
  }

  if (obj.currentGame?.players) {
    obj.currentGame.players = obj.currentGame.players.map((p) => ({
      ...p,
      holeCards: [],
      username: usernameMap.get(p.userId?.toString() ?? '') ?? 'unknown',
    }));
  }

  return obj;
}

/**
 * Broadcasts desk state to the room. Uses the cached username map from
 * deskRuntime — no extra DB queries during a hand.
 *
 * If no cache exists yet (first event before any join completes), falls back
 * to building the map on the fly so the broadcast is never silently skipped.
 */
async function broadcastDeskState(
  deskId: string,
  event: string,
  desk: IPokerDeskDocument,
  extraPayload?: Record<string, unknown>
): Promise<void> {
  const runtime = deskRuntime.get(deskId);
  const usernameMap =
    runtime && runtime.usernameCache.size > 0
      ? runtime.usernameCache
      : await buildUsernameMap(desk);

  _io!.to(deskId).emit(event, {
    desk: redactAndEnrichDesk(desk, usernameMap),
    ...extraPayload,
  });
}

function targetedEmit(
  deskId: string,
  userId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  const runtime = deskRuntime.get(deskId);
  if (!runtime) return;
  const socketId = runtime.userSockets.get(userId);
  if (!socketId) return;
  _io!.to(socketId).emit(event, payload);
}

// =============================================================================
// Runtime helpers
// =============================================================================

function getOrCreateRuntime(deskId: string): DeskRuntimeState {
  const existing = deskRuntime.get(deskId);
  if (existing) return existing;
  const runtime: DeskRuntimeState = {
    userSockets: new Map(),
    botSeats: new Map(),
    skipCounts: new Map(),
    turnTimer: null,
    turnTimerUserId: null,
    autoStartTimer: null,
    practiceSessions: new Map(),
    usernameCache: new Map(),
  };
  deskRuntime.set(deskId, runtime);
  return runtime;
}

// Closes the PracticeSession record for a leaving player (if one exists).
async function closePracticeSession(
  deskId: string,
  userId: string,
  finalChips: number | null
): Promise<void> {
  const runtime = deskRuntime.get(deskId);
  if (!runtime) return;
  const sessionId = runtime.practiceSessions.get(userId);
  if (!sessionId) return;
  await PracticeSession.findByIdAndUpdate(sessionId, {
    endedAt: new Date(),
    finalChips: finalChips ?? undefined,
  });
  runtime.practiceSessions.delete(userId);
}

// Evicts all bot seats and force-closes the desk if no human seat remains.
// Returns the closed desk, or null if there is nothing to do.
async function evictBotsIfNoHumans(deskId: string): Promise<IPokerDeskDocument | null> {
  const desk = await PokerDesk.findById(deskId);
  if (!desk || desk.status === 'closed') return null;

  const bots = await Bot.find({ deskId }).lean();
  if (bots.length === 0) return null;

  const botIds = new Set(bots.map((b) => b.botId.toString()));
  const humanSeatsRemain = desk.seats.some((s) => !botIds.has(s.userId.toString()));
  if (humanSeatsRemain) return null;

  desk.seats = [] as unknown as typeof desk.seats;
  desk.status = 'closed';
  desk.currentGame = null;
  desk.currentGameStatus = 'finished';
  await desk.save();
  await Bot.deleteMany({ deskId });
  return desk;
}

// =============================================================================
// Turn timer
// =============================================================================

// Clears any existing turn timer, emits turn:start to the player's socket,
// and sets a new 60s server-side timer for that player. On expiry: auto-folds
// the player, increments skip counter, then either starts the next player's
// timer (normal path) or evicts the player (3-skip path).
//
// Bot routing: if userId belongs to a bot, schedules a 1.5s think delay
// instead of the 60s human timer.
function startTurnTimer(deskId: string, userId: string): void {
  const runtime = getOrCreateRuntime(deskId);
  if (runtime.turnTimer) clearTimeout(runtime.turnTimer);
  runtime.turnTimerUserId = userId;

  // Bot path — 1.5s think delay, then auto-act.
  if (runtime.botSeats.has(userId)) {
    runtime.turnTimer = setTimeout(async () => {
      runtime.turnTimer = null;
      runtime.turnTimerUserId = null;
      try {
        const deskLean = await PokerDesk.findById(deskId).lean();
        if (!deskLean?.currentGame) return;
        const botConfig = runtime.botSeats.get(userId);
        if (!botConfig) return;
        const strategy = getBotStrategy(botConfig.strategy);
        const botObjId = new Types.ObjectId(userId);
        const { action, amount } = strategy.selectAction(deskLean.currentGame, botObjId);
        const result = await handlePlayerAction({ deskId, userId, action, amount });
        deskRuntime.get(deskId)?.skipCounts.delete(userId);
        if (result.needsShowdown) { await handleNeedsShowdown(deskId); return; }
        if (result.progression === 'nextRound') {
          await broadcastDeskState(deskId, 'game:roundAdvance', result.desk);
        } else {
          await broadcastDeskState(deskId, 'game:action', result.desk);
        }
        const game = result.desk.currentGame;
        if (game) {
          const active = game.players.filter((p) => p.status === 'active').length;
          const allIn  = game.players.filter((p) => p.status === 'all-in').length;
          if (active === 0 && allIn >= 2) { await handleAllInRunout(deskId); return; }
        }
        const nextTurn = result.desk.currentGame?.currentTurnPlayer;
        if (nextTurn) startTurnTimer(deskId, nextTurn.toString());
      } catch { /* bot action failed silently */ }
    }, 1500);
    return;
  }

  // Human path — notify then set 60s deadline.
  targetedEmit(deskId, userId, 'turn:start', {
    deadline: new Date(Date.now() + 60 * 1000),
  });

  runtime.turnTimer = setTimeout(async () => {
    runtime.turnTimer = null;
    runtime.turnTimerUserId = null;

    const newSkipCount = (runtime.skipCounts.get(userId) ?? 0) + 1;
    runtime.skipCounts.set(userId, newSkipCount);

    let foldResult: Awaited<ReturnType<typeof handlePlayerAction>>;
    try {
      foldResult = await handlePlayerAction({ deskId, userId, action: 'fold' });
    } catch (err) {
      if (err instanceof InvalidStateError) return;
      return;
    }

    _io!.to(deskId).emit('turn:timeout', { userId });

    if (newSkipCount >= 3) {
      // Resolve hand state from the auto-fold first.
      if (foldResult.needsShowdown) {
        await handleNeedsShowdown(deskId);
        if (!deskRuntime.has(deskId)) return;
      } else if (foldResult.progression === 'nextRound') {
        await broadcastDeskState(deskId, 'game:roundAdvance', foldResult.desk);
      } else {
        await broadcastDeskState(deskId, 'game:action', foldResult.desk);
        const game = foldResult.desk.currentGame;
        if (game) {
          const active = game.players.filter((p) => p.status === 'active').length;
          const allIn  = game.players.filter((p) => p.status === 'all-in').length;
          if (active === 0 && allIn >= 2) {
            await handleAllInRunout(deskId);
            if (!deskRuntime.has(deskId)) return;
          }
        }
      }

      // Force-remove the player.
      try {
        const {
          desk: evictDesk,
          needsShowdown: evictNeedsShowdown,
          finalChips: evictFinalChips,
        } = await userLeavesSeat({ deskId, userId });

        await closePracticeSession(deskId, userId, evictFinalChips);
        runtime.userSockets.delete(userId);
        runtime.skipCounts.delete(userId);
        // Remove from cache so stale username is not shown after eviction.
        runtime.usernameCache.delete(userId);

        if (evictNeedsShowdown) {
          await handleNeedsShowdown(deskId);
          return;
        }

        const game = evictDesk.currentGame;
        if (game) {
          const active = game.players.filter((p) => p.status === 'active').length;
          const allIn  = game.players.filter((p) => p.status === 'all-in').length;
          if (active === 0 && allIn >= 2) {
            await handleAllInRunout(deskId);
            return;
          }
        }

        await broadcastDeskState(deskId, 'player:left', evictDesk);
        const nextTurn = evictDesk.currentGame?.currentTurnPlayer;
        const rt = deskRuntime.get(deskId);
        if (nextTurn && rt && !rt.turnTimer) {
          startTurnTimer(deskId, nextTurn.toString());
        }
        if (evictDesk.status === 'closed') {
          _io!.to(deskId).emit('desk:closed', {});
          deskRuntime.delete(deskId);
        } else {
          const closedDesk = await evictBotsIfNoHumans(deskId);
          if (closedDesk) {
            await broadcastDeskState(deskId, 'player:left', closedDesk);
            _io!.to(deskId).emit('desk:closed', {});
            rt?.botSeats.clear();
            deskRuntime.delete(deskId);
          }
        }
      } catch {
        // userLeavesSeat failed — player already gone.
      }
    } else {
      // Normal auto-fold path.
      if (foldResult.needsShowdown) {
        await handleNeedsShowdown(deskId);
        return;
      }
      if (foldResult.progression === 'nextRound') {
        await broadcastDeskState(deskId, 'game:roundAdvance', foldResult.desk);
      } else {
        await broadcastDeskState(deskId, 'game:action', foldResult.desk);
      }
      const game = foldResult.desk.currentGame;
      if (game) {
        const active = game.players.filter((p) => p.status === 'active').length;
        const allIn  = game.players.filter((p) => p.status === 'all-in').length;
        if (active === 0 && allIn >= 2) {
          await handleAllInRunout(deskId);
          return;
        }
      }
      const nextTurnPlayer = foldResult.desk.currentGame?.currentTurnPlayer;
      if (nextTurnPlayer) startTurnTimer(deskId, nextTurnPlayer.toString());
    }
  }, 60_000);
}

// =============================================================================
// Game lifecycle helpers
// =============================================================================

async function handleNeedsShowdown(deskId: string): Promise<void> {
  const runtime = deskRuntime.get(deskId);
  if (runtime?.turnTimer) {
    clearTimeout(runtime.turnTimer);
    runtime.turnTimer = null;
    runtime.turnTimerUserId = null;
  }

  const { desk, potResults } = await showdown({ deskId });
  await broadcastDeskState(deskId, 'game:showdown', desk, {
    potResults: potResults.map((pr) => ({
      ...pr,
      winners: pr.winners.map((w) => ({ ...w, userId: w.userId.toString() })),
    })),
  });
  if (desk.status === 'closed') {
    _io!.to(deskId).emit('desk:closed', {});
    deskRuntime.delete(deskId);
  } else {
    const closedDesk = await evictBotsIfNoHumans(deskId);
    if (closedDesk) {
      await broadcastDeskState(deskId, 'player:left', closedDesk);
      _io!.to(deskId).emit('desk:closed', {});
      runtime?.botSeats.clear();
      deskRuntime.delete(deskId);
      return;
    }
    scheduleAutoStart(deskId, 8000);
  }
}

async function handleAllInRunout(deskId: string): Promise<void> {
  while (true) {
    const updatedDesk = await advanceGameRound(deskId);
    const lastRound = updatedDesk.currentGame?.rounds.at(-1);
    if (!lastRound || lastRound.name === 'showdown') break;
    await broadcastDeskState(deskId, 'game:roundAdvance', updatedDesk);
  }
  await handleNeedsShowdown(deskId);
}

function scheduleAutoStart(deskId: string, delayMs = 8000): void {
  const runtime = getOrCreateRuntime(deskId);
  if (runtime.autoStartTimer) clearTimeout(runtime.autoStartTimer);
  runtime.autoStartTimer = setTimeout(async () => {
    runtime.autoStartTimer = null;
    try {
      const freshDesk = await PokerDesk.findById(deskId).lean();
      if (!freshDesk) return;

      // Evict broke bot seats before starting the next hand.
      for (const seat of freshDesk.seats) {
        const uid = seat.userId.toString();
        if (seat.balanceAtTable === 0 && runtime.botSeats.has(uid)) {
          try {
            const { desk: updated, needsShowdown } = await userLeavesSeat({ deskId, userId: uid });
            runtime.botSeats.delete(uid);
            runtime.usernameCache.delete(uid);
            await Bot.deleteOne({ deskId, botId: new Types.ObjectId(uid) });
            if (needsShowdown) { await handleNeedsShowdown(deskId); return; }
            await broadcastDeskState(deskId, 'player:left', updated);
            const nextTurn = updated.currentGame?.currentTurnPlayer;
            const rt = deskRuntime.get(deskId);
            if (nextTurn && rt && !rt.turnTimer) startTurnTimer(deskId, nextTurn.toString());
            if (updated.status === 'closed') {
              await Bot.deleteMany({ deskId });
              _io!.to(deskId).emit('desk:closed', {});
              deskRuntime.delete(deskId);
              return;
            }
          } catch { /* seat already removed */ }
        }
      }

      const desk = await createGame({ deskId });
      await broadcastDeskState(deskId, 'game:start', desk);
      const game = desk.currentGame;
      if (game) {
        for (const player of game.players) {
          targetedEmit(deskId, player.userId.toString(), 'game:start', {
            holeCards: player.holeCards,
          });
        }
        if (game.currentTurnPlayer) {
          startTurnTimer(deskId, game.currentTurnPlayer.toString());
        }
      }
    } catch (err) {
      if (err instanceof InvalidStateError) {
        if (err.message.includes('closed')) {
          _io!.to(deskId).emit('desk:closed', {});
          deskRuntime.delete(deskId);
        } else {
          process.stderr.write(
            `[scheduleAutoStart] createGame precondition failed for desk ${deskId}: ${err.message}\n`
          );
        }
        return;
      }
      process.stderr.write(
        `[scheduleAutoStart] unexpected error for desk ${deskId}: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
      );
      const rt = deskRuntime.get(deskId);
      if (rt?.turnTimer)     { clearTimeout(rt.turnTimer);     rt.turnTimer     = null; }
      if (rt?.autoStartTimer){ clearTimeout(rt.autoStartTimer); rt.autoStartTimer = null; }
      _io!.to(deskId).emit('desk:closed', {});
      deskRuntime.delete(deskId);
    }
  }, delayMs);
}

// =============================================================================
// Socket server — main entry point
// =============================================================================

export function attachSocketServer(httpServer: HttpServer): void {
  _io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Reject unauthenticated connections before they reach event handlers.
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('MISSING_AUTH'));
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return next(new Error('INVALID_TOKEN'));
    }
    socket.data.userId = payload.userId;
    socket.data.role   = payload.role ?? 'user';
    next();
  });

  _io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    // ------------------------------------------------------------------
    // join
    // ------------------------------------------------------------------
    socket.on('join', async (payload: JoinPayload) => {
      try {
        const { deskId, seatNumber, buyInAmount } = payload ?? {};
        if (
          !deskId || typeof deskId !== 'string' ||
          typeof seatNumber !== 'number' ||
          typeof buyInAmount !== 'number'
        ) {
          socket.emit('error', { code: 'INVALID_STATE', message: 'Invalid join payload' });
          return;
        }

        // Reconnect path: user is already seated.
        const existingDesk = await PokerDesk.findById(deskId);
        const alreadySeated = existingDesk?.seats.some(
          (s) => s.userId.equals(new Types.ObjectId(userId))
        );

        if (alreadySeated && existingDesk) {
          socket.join(deskId);
          const runtime = getOrCreateRuntime(deskId);
          runtime.userSockets.set(userId, socket.id);

          await PokerDesk.findOneAndUpdate(
            { _id: deskId, 'seats.userId': new Types.ObjectId(userId) },
            { $set: { 'seats.$.status': 'active' } }
          );

          const refreshedDesk = await PokerDesk.findById(deskId);
          if (!refreshedDesk) return;

          // Rebuild cache on reconnect in case it was lost (server restart).
          runtime.usernameCache = await buildUsernameMap(refreshedDesk);

          await broadcastDeskState(deskId, 'player:joined', refreshedDesk);

          const game = refreshedDesk.currentGame;
          if (game) {
            const player = game.players.find(
              (p) => p.userId.equals(new Types.ObjectId(userId))
            );
            if (player?.holeCards?.length) {
              targetedEmit(deskId, userId, 'game:start', { holeCards: player.holeCards });
            }
            const isTheirTurn = game.currentTurnPlayer?.equals(new Types.ObjectId(userId));
            if (isTheirTurn && !runtime.turnTimer) {
              startTurnTimer(deskId, userId);
            }
          }
          return;
        }

        // Normal join path.
        const desk = await addUserToSeat({ deskId, userId, seatNumber, buyInAmount });
        socket.join(deskId);
        const runtime = getOrCreateRuntime(deskId);
        runtime.userSockets.set(userId, socket.id);

        // Build / refresh username cache after seat change.
        runtime.usernameCache = await buildUsernameMap(desk);

        await broadcastDeskState(deskId, 'player:joined', desk);

        const threshold = desk.firstGameStartedAt ? desk.minToContinue : desk.minToStart;
        if (desk.seats.length >= threshold) {
          // 5s delay for the very first hand; 3s between subsequent hands.
          const isFirstHand = !desk.firstGameStartedAt;
          scheduleAutoStart(deskId, isFirstHand ? 5000 : 8000);
        }
      } catch (err) {
        const code    = err instanceof ServiceError ? err.code : 'INTERNAL_ERROR';
        const message = err instanceof Error ? err.message : 'Join failed';
        socket.emit('error', { code, message });
      }
    });

    // ------------------------------------------------------------------
    // action
    // ------------------------------------------------------------------
    socket.on('action', async (payload: ActionPayload) => {
      const { deskId, action, amount } = payload ?? {};

      // Clear turn timer before acquiring the service lock.
      if (deskId && typeof deskId === 'string') {
        const runtime = deskRuntime.get(deskId);
        if (runtime?.turnTimer) {
          clearTimeout(runtime.turnTimer);
          runtime.turnTimer     = null;
          runtime.turnTimerUserId = null;
        }
      }

      try {
        if (!deskId || typeof deskId !== 'string' || typeof action !== 'string') {
          socket.emit('error', { code: 'INVALID_STATE', message: 'Invalid action payload' });
          return;
        }

        const { desk, progression, needsShowdown } = await handlePlayerAction({
          deskId,
          userId,
          action: action as 'fold' | 'check' | 'call' | 'raise' | 'all-in',
          amount,
        });

        deskRuntime.get(deskId)?.skipCounts.delete(userId);

        if (needsShowdown) { await handleNeedsShowdown(deskId); return; }

        if (progression === 'nextRound') {
          await broadcastDeskState(deskId, 'game:roundAdvance', desk);
        } else {
          await broadcastDeskState(deskId, 'game:action', desk);
        }

        const game = desk.currentGame;
        if (game) {
          const active = game.players.filter((p) => p.status === 'active').length;
          const allIn  = game.players.filter((p) => p.status === 'all-in').length;
          if (active === 0 && allIn >= 2) { await handleAllInRunout(deskId); return; }
        }

        const nextTurnPlayer = desk.currentGame?.currentTurnPlayer;
        if (nextTurnPlayer) startTurnTimer(deskId, nextTurnPlayer.toString());
      } catch (err) {
        const code    = err instanceof ServiceError ? err.code : 'INTERNAL_ERROR';
        const message = err instanceof Error ? err.message : 'Action failed';
        socket.emit('error', { code, message });

        if (deskId && typeof deskId === 'string') {
          try {
            const lean = await PokerDesk.findById(deskId).lean<{
              currentGame?: { currentTurnPlayer?: { toString(): string } | null } | null;
            }>();
            const currentPlayer = lean?.currentGame?.currentTurnPlayer;
            if (currentPlayer) startTurnTimer(deskId, currentPlayer.toString());
          } catch { /* DB read failed — no timer restarted */ }
        }
      }
    });

    // ------------------------------------------------------------------
    // leave
    // ------------------------------------------------------------------
    socket.on('leave', async (payload: LeavePayload) => {
      try {
        const { deskId } = payload ?? {};
        if (!deskId || typeof deskId !== 'string') {
          socket.emit('error', { code: 'INVALID_STATE', message: 'Invalid leave payload' });
          return;
        }

        const runtime = deskRuntime.get(deskId);
        if (runtime?.turnTimerUserId === userId) {
          clearTimeout(runtime.turnTimer!);
          runtime.turnTimer       = null;
          runtime.turnTimerUserId = null;
        }

        const { desk, needsShowdown, finalChips } = await userLeavesSeat({ deskId, userId });
        await closePracticeSession(deskId, userId, finalChips);
        socket.leave(deskId);
        if (runtime) {
          runtime.userSockets.delete(userId);
          // Refresh cache now that this seat is gone.
          runtime.usernameCache = await buildUsernameMap(desk);
        }

        if (needsShowdown) { await handleNeedsShowdown(deskId); return; }

        const game = desk.currentGame;
        if (game) {
          const active = game.players.filter((p) => p.status === 'active').length;
          const allIn  = game.players.filter((p) => p.status === 'all-in').length;
          if (active === 0 && allIn >= 2) { await handleAllInRunout(deskId); return; }
        }

        await broadcastDeskState(deskId, 'player:left', desk);
        const nextTurn = desk.currentGame?.currentTurnPlayer;
        const rt = deskRuntime.get(deskId);
        if (nextTurn && rt && !rt.turnTimer) startTurnTimer(deskId, nextTurn.toString());

        if (desk.status === 'closed') {
          _io!.to(deskId).emit('desk:closed', {});
          deskRuntime.delete(deskId);
        } else {
          const closedDesk = await evictBotsIfNoHumans(deskId);
          if (closedDesk) {
            await broadcastDeskState(deskId, 'player:left', closedDesk);
            _io!.to(deskId).emit('desk:closed', {});
            rt?.botSeats.clear();
            deskRuntime.delete(deskId);
          }
        }
      } catch (err) {
        const code    = err instanceof ServiceError ? err.code : 'INTERNAL_ERROR';
        const message = err instanceof Error ? err.message : 'Leave failed';
        socket.emit('error', { code, message });
      }
    });

    // ------------------------------------------------------------------
    // desk:getSeats — read-only seat map for seat-picker UI
    // ------------------------------------------------------------------
    socket.on('desk:getSeats', async ({ deskId }: { deskId: string }) => {
      try {
        if (!deskId) {
          socket.emit('error', { code: 'MISSING_DESK_ID', message: 'deskId required' });
          return;
        }
        const desk = await PokerDesk.findById(deskId).lean();
        if (!desk) {
          socket.emit('error', { code: 'DESK_NOT_FOUND', message: 'Desk not found' });
          return;
        }

        // Use cached map if available, otherwise build on the fly.
        const runtime = deskRuntime.get(deskId);
        let nameMap: Map<string, string>;
        if (runtime && runtime.usernameCache.size > 0) {
          nameMap = runtime.usernameCache;
        } else {
          const seatUserIds = desk.seats.map((s) => new Types.ObjectId(s.userId.toString()));
          const [userDocs, botDocs] = await Promise.all([
            User.find({ _id: { $in: seatUserIds } })
              .select('username')
              .lean<{ _id: Types.ObjectId; username: string }[]>(),
            Bot.find({ deskId: desk._id })
              .lean<{ botId: Types.ObjectId; botName: string }[]>(),
          ]);
          nameMap = new Map<string, string>();
          for (const u of userDocs) nameMap.set(u._id.toString(), u.username);
          for (const b of botDocs)  nameMap.set(b.botId.toString(), b.botName);
        }

        socket.emit('desk:seats', {
          deskId,
          seats: desk.seats.map((s) => ({
            seatNumber: s.seatNumber,
            userId:     s.userId.toString(),
            username:   nameMap.get(s.userId.toString()) ?? 'unknown',
            status:     s.status,
          })),
          maxSeats: desk.maxSeats,
        });
      } catch {
        socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to fetch seats' });
      }
    });

    // ------------------------------------------------------------------
    // practice
    // ------------------------------------------------------------------
    socket.on('practice', async (payload) => {
      try {
        const { deskId, seatNumber, numBots, strategy } = payload ?? {};
        if (
          !deskId || typeof deskId !== 'string' ||
          typeof seatNumber !== 'number' ||
          typeof numBots !== 'number' ||
          !strategy || typeof strategy !== 'string'
        ) {
          socket.emit('error', { code: 'INVALID_STATE', message: 'Invalid practice payload' });
          return;
        }

        const humanDesk = await addUserToSeat({
          deskId,
          userId,
          seatNumber,
          buyInAmount: PRACTICE_STARTING_CHIPS,
        });

        socket.join(deskId);
        const runtime = getOrCreateRuntime(deskId);
        runtime.userSockets.set(userId, socket.id);

        const availableSeats = Array.from(
          { length: humanDesk.maxSeats },
          (_, i) => i + 1
        ).filter((n) => !humanDesk.seats.some((s) => s.seatNumber === n));

        const botsToAdd = availableSeats.slice(0, numBots);

        let latestDesk = humanDesk;
        for (const botSeatNumber of botsToAdd) {
          const { desk: botDesk, botUserId } = await addBotToSeat({
            deskId,
            seatNumber: botSeatNumber,
            strategy: strategy as BotDifficulty,
          });
          runtime.botSeats.set(botUserId.toString(), { strategy: strategy as BotDifficulty });
          latestDesk = botDesk;
        }

        const session = await PracticeSession.create({
          userId,
          deskId,
          startedAt: new Date(),
        });
        runtime.practiceSessions.set(userId, session._id.toString());

        // Build username cache after all seats (human + bots) are placed.
        runtime.usernameCache = await buildUsernameMap(latestDesk);

        await broadcastDeskState(deskId, 'player:joined', latestDesk);

        const threshold = latestDesk.firstGameStartedAt
          ? latestDesk.minToContinue
          : latestDesk.minToStart;
        if (latestDesk.seats.length >= threshold) {
          const isFirstHand = !latestDesk.firstGameStartedAt;
          scheduleAutoStart(deskId, isFirstHand ? 5000 : 8000);
        }
      } catch (err) {
        const code    = err instanceof ServiceError ? err.code : 'INTERNAL_ERROR';
        const message = err instanceof Error ? err.message : 'Practice join failed';
        socket.emit('error', { code, message });
      }
    });

    // ------------------------------------------------------------------
    // disconnect
    // ------------------------------------------------------------------
    socket.on('disconnect', async () => {
      for (const [deskId, runtime] of deskRuntime) {
        for (const [uid, socketId] of runtime.userSockets) {
          if (socketId !== socket.id) continue;

          // Remove socket mapping immediately so reconnect can re-register.
          runtime.userSockets.delete(uid);

          // Mark seat as disconnected for display purposes.
          PokerDesk.findOneAndUpdate(
            { _id: deskId, 'seats.userId': new Types.ObjectId(uid) },
            { $set: { 'seats.$.status': 'disconnected' } }
          ).catch(() => { /* display-only — silent on failure */ });

          // Give the player 30 seconds to reconnect (home button, network drop,
          // app backgrounded). If they reconnect via the 'join' handler within
          // this window, the alreadySeated path runs and the timer is cancelled
          // because userSockets will have a new entry for uid.
          //
          // If 30 seconds pass with no reconnect, treat it as a deliberate leave.
          setTimeout(async () => {
            // Still absent — userSockets has no entry for uid.
            if (runtime.userSockets.has(uid)) return;

            // Clear turn timer if it belongs to this player.
            if (runtime.turnTimerUserId === uid) {
              clearTimeout(runtime.turnTimer!);
              runtime.turnTimer       = null;
              runtime.turnTimerUserId = null;
            }

            try {
              const { desk, needsShowdown, finalChips } = await userLeavesSeat({ deskId, userId: uid });
              await closePracticeSession(deskId, uid, finalChips);
              runtime.skipCounts.delete(uid);
              runtime.usernameCache.delete(uid);

              if (needsShowdown) { await handleNeedsShowdown(deskId); return; }

              const game = desk.currentGame;
              if (game) {
                const active = game.players.filter((p) => p.status === 'active').length;
                const allIn  = game.players.filter((p) => p.status === 'all-in').length;
                if (active === 0 && allIn >= 2) { await handleAllInRunout(deskId); return; }
              }

              await broadcastDeskState(deskId, 'player:left', desk);
              const nextTurn = desk.currentGame?.currentTurnPlayer;
              const rt = deskRuntime.get(deskId);
              if (nextTurn && rt && !rt.turnTimer) startTurnTimer(deskId, nextTurn.toString());

              if (desk.status === 'closed') {
                _io!.to(deskId).emit('desk:closed', {});
                deskRuntime.delete(deskId);
              } else {
                const closedDesk = await evictBotsIfNoHumans(deskId);
                if (closedDesk) {
                  await broadcastDeskState(deskId, 'player:left', closedDesk);
                  _io!.to(deskId).emit('desk:closed', {});
                  rt?.botSeats.clear();
                  deskRuntime.delete(deskId);
                }
              }
            } catch {
              // userLeavesSeat failed — player may have already been evicted
              // by the 3-skip timer between disconnect and this callback.
            }
          }, 30_000);

          break;
        }
      }
    });
  });
}

/**
 * @fileoverview Direct-DB query helpers for admin server components.
 *
 * Admin pages (server components) previously called fetchAdmin() which made
 * a full internal HTTP round-trip: page -> localhost API -> DB. This file
 * replaces that pattern with direct DB calls, eliminating the TCP overhead
 * and extra requireAdmin() DB lookup on every page load.
 *
 * Auth: each helper calls verifyAdminCookie() which reads the token cookie,
 * verifies the JWT, and redirects to /auth/login on any failure. No DB
 * lookup is needed here because the JWT signature is already a sufficient
 * guarantee for read-only page rendering — revocation is enforced at the
 * API layer (requireAdmin) for all mutating requests.
 *
 * These helpers are ONLY for server components. API routes continue to use
 * requireAdmin() from src/lib/auth/requireAdmin.ts.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import mongoose, { Types } from 'mongoose';

import { verifyToken } from '@/utils/jwt';
import dbConnect from '@/config/dbConnect';
import { serializeMoney } from '@/lib/api/money';
import { DEFAULT_CURRENCY } from '@/config/constants';
import type { Currency } from '@/config/constants';

import User from '@/models/user';
import Wallet from '@/models/wallet';
import BankTransaction from '@/models/bankTransaction';
import GatewayTransaction from '@/models/gatewayTransaction';
import PokerDesk from '@/models/pokerDesk';
import PokerMode from '@/models/pokerMode';
import PokerGameArchive from '@/models/pokerGameArchive';
import Poker from '@/models/poker';
import BankAccount from '@/models/bankAccount';
import WalletTransaction from '@/models/walletTransaction';

import type { IUser } from '@/models/user';
import type { IWallet } from '@/models/wallet';
import type { IBankTransaction } from '@/models/bankTransaction';
import type { IBankAccount } from '@/models/bankAccount';
import type { IGatewayTransaction } from '@/models/gatewayTransaction';
import type { IPokerGameArchive } from '@/models/pokerGameArchive';
import type { IPokerMode } from '@/models/pokerMode';
import type { IPoker } from '@/models/poker';
import type { DashboardData, StatisticsData } from '@/types/adminTypes';

// ---------------------------------------------------------------------------
// Auth guard for server components
// ---------------------------------------------------------------------------

/**
 * Reads the token cookie and verifies the JWT. Redirects to /auth/login on
 * any failure. Does NOT hit the DB — JWT signature verification is sufficient
 * for read-only page rendering.
 */
function verifyAdminCookie(): void {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/auth/login');
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/auth/login');
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type LeanUser = IUser & { _id: Types.ObjectId; createdAt: Date };
type LeanWallet = IWallet & { _id: Types.ObjectId };
type LeanBankAccount = IBankAccount & { _id: Types.ObjectId };
type PopulatedBankTx = Omit<IBankTransaction, 'bankAccountId'> & {
  _id: Types.ObjectId;
  createdAt: Date;
  bankAccountId: LeanBankAccount | null;
};
type LeanGatewayTx = Omit<IGatewayTransaction, 'gatewaySignature'> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
type LeanArchive = IPokerGameArchive & { _id: Types.ObjectId };

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getAdminDashboard(): Promise<DashboardData> {
  verifyAdminCookie();
  await dbConnect();

  const now = new Date();
  const startOfToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  type LeaderboardEntry = { _id: Types.ObjectId; username: string; totalWinnings: number; currency: string };

  const [
    [totalUsers, activeUsers, newToday, newThisWeek, newThisMonth],
    [pendingDeposits, pendingWithdrawals, completedToday],
    [totalArchived, activeDesksNow, totalActiveDesks],
    recentUsers,
    leaderboard,
  ] = await Promise.all([
    Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]),
    Promise.all([
      BankTransaction.countDocuments({ type: 'deposit',  status: 'pending' }),
      BankTransaction.countDocuments({ type: 'withdraw', status: 'pending' }),
      BankTransaction.countDocuments({ status: 'completed', completedAt: { $gte: startOfToday } }),
    ]),
    Promise.all([
      PokerGameArchive.countDocuments({ mode: 'cash' }),
      PokerDesk.countDocuments({ currentGameStatus: 'in-progress' }),
      PokerDesk.countDocuments({ status: 'active' }),
    ]),
    User.find({}).sort({ createdAt: -1 }).limit(5).lean<LeanUser[]>(),
    PokerGameArchive.aggregate<LeaderboardEntry>([
      { $match: { mode: 'cash' } },
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.userId',
          username: { $first: '$players.username' },
          totalWinnings: { $sum: { $subtract: ['$players.endingStack', '$players.startingStack'] } },
          currency: { $first: '$currency' },
        },
      },
      { $sort: { totalWinnings: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    users: { total: totalUsers, active: activeUsers, newToday, newThisWeek, newThisMonth },
    bankTransactions: { pendingDeposits, pendingWithdrawals, completedToday },
    games: { totalArchived, activeDesksNow, totalActiveDesks },
    recentUsers: recentUsers.map((u) => ({
      userId:    u._id.toString(),
      username:  u.username,
      email:     u.email,
      status:    u.status,
      createdAt: u.createdAt,
    })),
    leaderboard: leaderboard.map((e) => ({
      userId:        e._id.toString(),
      username:      e.username,
      totalWinnings: serializeMoney(e.totalWinnings, (e.currency as Currency) ?? DEFAULT_CURRENCY),
    })),
  };
}

// ---------------------------------------------------------------------------
// Poker games (game types)
// ---------------------------------------------------------------------------

type LeanPoker = IPoker & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

export async function getAdminPokerGames() {
  verifyAdminCookie();
  await dbConnect();

  const entries = await Poker.find({}).sort({ gameType: 1 }).lean<LeanPoker[]>();

  return {
    games: entries.map((g) => ({
      id:          g._id.toString(),
      gameType:    g.gameType,
      description: g.description ?? null,
      objective:   g.objective ?? null,
      status:      g.status,
      createdAt:   g.createdAt,
      updatedAt:   g.updatedAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// User detail
// ---------------------------------------------------------------------------

type LeanBank = IBankAccount & { _id: Types.ObjectId; createdAt: Date };

export async function getAdminUserDetail(userId: string) {
  verifyAdminCookie();
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  await dbConnect();

  const [user, wallet, banks] = await Promise.all([
    User.findById(userId).lean<LeanUser>(),
    Wallet.findOne({ userId }).lean<LeanWallet>(),
    BankAccount.find({ userId }).sort({ createdAt: -1 }).lean<LeanBank[]>(),
  ]);

  if (!user) return null;

  return {
    user: {
      userId:         user._id.toString(),
      username:       user.username,
      email:          user.email,
      status:         user.status,
      mobileNumber:   user.mobileNumber ?? null,
      usernameLocked: user.usernameLocked,
      lastLogin:      user.lastLogin ?? null,
      createdAt:      user.createdAt,
    },
    wallet: wallet ? {
      balance:      serializeMoney(wallet.balance, wallet.currency),
      instantBonus: serializeMoney(wallet.instantBonus, wallet.currency),
      lockedBonus:  serializeMoney(wallet.lockedBonus, wallet.currency),
      currency:     wallet.currency,
    } : null,
    banks: banks.map((b) => ({
      bankId:             b._id.toString(),
      accountNumber:      b.accountNumber,
      bankName:           b.bankName,
      ifscCode:           b.ifscCode,
      accountHolderName:  b.accountHolderName,
      isDefault:          b.isDefault,
      status:             b.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// User analytics
// ---------------------------------------------------------------------------

type StatsResult = {
  _id: Types.ObjectId;
  gamesPlayed: number;
  wins: number;
  totalNetChange: number;
  totalBet: number;
  currency: string;
};

export async function getAdminUserAnalytics(userId: string, params: { page: string; limit: string }) {
  verifyAdminCookie();
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  await dbConnect();

  const page  = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));
  const userObjectId = new Types.ObjectId(userId);

  const [statsResult, total, archives] = await Promise.all([
    PokerGameArchive.aggregate<StatsResult>([
      { $match: { 'players.userId': userObjectId, mode: 'cash' } },
      { $unwind: '$players' },
      { $match: { 'players.userId': userObjectId } },
      {
        $group: {
          _id: '$players.userId',
          gamesPlayed:    { $sum: 1 },
          wins:           { $sum: { $cond: ['$players.isWinner', 1, 0] } },
          totalNetChange: { $sum: { $subtract: ['$players.endingStack', '$players.startingStack'] } },
          totalBet:       { $sum: '$players.totalBet' },
          currency:       { $last: '$currency' },
        },
      },
    ]),
    PokerGameArchive.countDocuments({ 'players.userId': userObjectId, mode: 'cash' }),
    PokerGameArchive.find({ 'players.userId': userObjectId, mode: 'cash' })
      .sort({ completedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<LeanArchive[]>(),
  ]);

  const raw      = statsResult[0] ?? null;
  const currency = (raw?.currency as Currency) ?? DEFAULT_CURRENCY;

  return {
    stats: raw ? {
      gamesPlayed:    raw.gamesPlayed,
      wins:           raw.wins,
      winRate:        raw.gamesPlayed > 0 ? ((raw.wins / raw.gamesPlayed) * 100).toFixed(1) + '%' : '0.0%',
      totalNetChange: serializeMoney(raw.totalNetChange, currency),
      totalBet:       serializeMoney(raw.totalBet, currency),
      currency,
    } : null,
    games: archives.map((a) => {
      const player = a.players.find((p) => p.userId.toString() === userId);
      return {
        id:              a._id.toString(),
        gameType:        a.gameType,
        currency:        a.currency,
        totalPot:        serializeMoney(a.totalPot, a.currency),
        isWinner:        player?.isWinner ?? false,
        netChange:       serializeMoney((player?.endingStack ?? 0) - (player?.startingStack ?? 0), a.currency),
        startedAt:       a.startedAt,
        completedAt:     a.completedAt,
        durationSeconds: Math.round((a.completedAt.getTime() - a.startedAt.getTime()) / 1000),
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function windowStart(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (n - 1)));
}

export async function getAdminStatistics(): Promise<StatisticsData> {
  verifyAdminCookie();
  await dbConnect();

  const WINDOW_DAYS = 30;
  const days  = lastNDays(WINDOW_DAYS);
  const start = windowStart(WINDOW_DAYS);

  type DayCount = { _id: string; count: number };
  type DaySum   = { _id: string; amount: number };
  type LeaderboardRow = { _id: Types.ObjectId; username: string; totalWinnings: number; currency: string };

  const [signupRows, cashGameRows, depositRows, leaderboardRows] = await Promise.all([
    User.aggregate<DayCount>([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    PokerGameArchive.aggregate<DayCount>([
      { $match: { mode: 'cash', completedAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, count: { $sum: 1 } } },
    ]),
    WalletTransaction.aggregate<DaySum>([
      { $match: { type: 'deposit', status: 'completed', completedAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, amount: { $sum: '$amount.cashAmount' } } },
    ]),
    PokerGameArchive.aggregate<LeaderboardRow>([
      { $match: { mode: 'cash' } },
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.userId',
          username: { $first: '$players.username' },
          totalWinnings: { $sum: { $subtract: ['$players.endingStack', '$players.startingStack'] } },
          currency: { $first: '$currency' },
        },
      },
      { $sort: { totalWinnings: -1 } },
      { $limit: 20 },
    ]),
  ]);

  const signupByDay   = new Map(signupRows.map((r)  => [r._id, r.count]));
  const cashGameByDay = new Map(cashGameRows.map((r) => [r._id, r.count]));
  const depositByDay  = new Map(depositRows.map((r)  => [r._id, r.amount]));

  const dailySignups       = days.map((date) => ({ date, count:  signupByDay.get(date)   ?? 0 }));
  const dailyCashGames     = days.map((date) => ({ date, count:  cashGameByDay.get(date) ?? 0 }));
  const dailyDepositVolume = days.map((date) => ({ date, amount: depositByDay.get(date)  ?? 0 }));

  return {
    dailySignups,
    dailyCashGames,
    dailyDepositVolume,
    totals: {
      signups30d:       dailySignups.reduce((s, d) => s + d.count, 0),
      cashGames30d:     dailyCashGames.reduce((s, d) => s + d.count, 0),
      depositVolume30d: serializeMoney(dailyDepositVolume.reduce((s, d) => s + d.amount, 0), DEFAULT_CURRENCY),
    },
    leaderboard: leaderboardRows.map((e) => ({
      userId:        e._id.toString(),
      username:      e.username,
      totalWinnings: serializeMoney(e.totalWinnings, (e.currency as Currency) ?? DEFAULT_CURRENCY),
    })),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const USER_STATUSES = new Set(['active', 'inactive', 'suspended']);

export async function getAdminUsers(params: {
  page: string;
  limit: string;
  search: string;
  status: string;
}) {
  verifyAdminCookie();
  await dbConnect();

  const page  = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));

  const filter: Record<string, unknown> = {};
  if (params.search) {
    const rx = new RegExp(escapeRegex(params.search), 'i');
    filter.$or = [{ username: rx }, { email: rx }];
  }
  if (params.status && USER_STATUSES.has(params.status)) {
    filter.status = params.status;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean<LeanUser[]>();

  const wallets = await Wallet.find({ userId: { $in: users.map((u) => u._id) } }).lean<LeanWallet[]>();
  const walletMap = new Map(wallets.map((w) => [w.userId.toString(), w]));

  return {
    users: users.map((u) => {
      const w = walletMap.get(u._id.toString()) ?? null;
      return {
        userId:        u._id.toString(),
        username:      u.username,
        email:         u.email,
        status:        u.status,
        mobileNumber:  u.mobileNumber ?? null,
        usernameLocked: u.usernameLocked,
        createdAt:     u.createdAt,
        wallet: w ? {
          balance:      serializeMoney(w.balance, w.currency),
          instantBonus: serializeMoney(w.instantBonus, w.currency),
          lockedBonus:  serializeMoney(w.lockedBonus, w.currency),
          currency:     w.currency,
        } : null,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------------------------------------------------------------------
// Poker modes
// ---------------------------------------------------------------------------

type LeanPokerMode = IPokerMode & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

export async function getAdminPokerModes(params: { pokerId?: string } = {}) {
  verifyAdminCookie();
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params.pokerId && mongoose.Types.ObjectId.isValid(params.pokerId)) {
    filter.pokerId = new mongoose.Types.ObjectId(params.pokerId);
  }

  const modes = await PokerMode.find(filter)
    .sort({ gameType: 1, stake: 1 })
    .lean<LeanPokerMode[]>();

  return {
    modes: modes.map((m) => ({
      id:        m._id.toString(),
      pokerId:   m.pokerId.toString(),
      gameType:  m.gameType,
      bType:     m.bType,
      stake:     serializeMoney(m.stake, m.currency),
      minBuyIn:  serializeMoney(m.minBuyIn, m.currency),
      maxBuyIn:  serializeMoney(m.maxBuyIn, m.currency),
      currency:  m.currency,
      mode:      m.mode,
      status:    m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Poker desks
// ---------------------------------------------------------------------------

type LeanPokerDesk = import('@/models/pokerDesk').IPokerDesk & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date; seats: { length: number }[] };

export async function getAdminPokerDesks(params: { pokerModeId?: string; status?: string } = {}) {
  verifyAdminCookie();
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params.pokerModeId && mongoose.Types.ObjectId.isValid(params.pokerModeId)) {
    filter.pokerModeId = new mongoose.Types.ObjectId(params.pokerModeId);
  }
  if (params.status && ['active', 'disabled', 'closed'].includes(params.status)) {
    filter.status = params.status;
  }

  const desks = await PokerDesk.find(filter)
    .sort({ createdAt: -1 })
    .lean<LeanPokerDesk[]>();

  return {
    desks: desks.map((d) => ({
      id:                 d._id.toString(),
      pokerModeId:        d.pokerModeId.toString(),
      tableName:          d.tableName,
      gameType:           d.gameType,
      bType:              d.bType,
      mode:               d.mode,
      currency:           d.currency,
      status:             d.status,
      stake:              serializeMoney(d.stake, d.currency),
      minBuyIn:           serializeMoney(d.minBuyIn, d.currency),
      maxBuyIn:           serializeMoney(d.maxBuyIn, d.currency),
      minToStart:         d.minToStart,
      minToContinue:      d.minToContinue,
      maxPlayerCount:     d.maxPlayerCount,
      maxSeats:           d.maxSeats,
      seatedCount:        d.seats.length,
      currentGameStatus:  d.currentGameStatus,
      buttonSeatNumber:   d.buttonSeatNumber,
      firstGameStartedAt: d.firstGameStartedAt,
      createdAt:          d.createdAt,
      updatedAt:          d.updatedAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Bank transactions
// ---------------------------------------------------------------------------

const VALID_TX_STATUSES = new Set(['pending', 'completed', 'failed']);
const VALID_TX_TYPES    = new Set(['deposit', 'withdraw']);

export async function getAdminBankTransactions(params: {
  page: string;
  limit: string;
  status: string;
  type: string;
  userId?: string;
}) {
  verifyAdminCookie();
  await dbConnect();

  const page  = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));

  const filter: Record<string, unknown> = {};
  if (params.status && VALID_TX_STATUSES.has(params.status)) filter.status = params.status;
  if (params.type   && VALID_TX_TYPES.has(params.type))       filter.type   = params.type;
  if (params.userId && mongoose.Types.ObjectId.isValid(params.userId)) {
    filter.userId = new mongoose.Types.ObjectId(params.userId);
  }

  const total = await BankTransaction.countDocuments(filter);
  const txs = await BankTransaction.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('bankAccountId')
    .lean<PopulatedBankTx[]>();

  return {
    transactions: txs.map((tx) => {
      const acct = tx.bankAccountId;
      return {
        transactionId: tx._id.toString(),
        userId:        tx.userId.toString(),
        type:          tx.type,
        amount:        serializeMoney(tx.amount, tx.currency),
        currency:      tx.currency,
        status:        tx.status,
        imageUrl:      tx.imageUrl ?? null,
        remark:        tx.remark ?? null,
        completedAt:   tx.completedAt ?? null,
        createdAt:     tx.createdAt,
        bankAccount: acct ? {
          bankId:              acct._id.toString(),
          accountNumber:       acct.accountNumber,
          bankName:            acct.bankName,
          ifscCode:            acct.ifscCode,
          accountHolderName:   acct.accountHolderName,
          isDefault:           acct.isDefault,
          status:              acct.status,
        } : null,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------------------------------------------------------------------
// Gateway (PG) transactions
// ---------------------------------------------------------------------------

const VALID_GW_STATUSES  = new Set(['created', 'pending', 'completed', 'failed']);
const VALID_GW_GATEWAYS  = new Set(['razorpay', 'stripe']);

export async function getAdminGatewayTransactions(params: {
  page: string;
  limit: string;
  status: string;
  gateway?: string;
  userId?: string;
}) {
  verifyAdminCookie();
  await dbConnect();

  const page  = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));

  const filter: Record<string, unknown> = {};
  if (params.status  && VALID_GW_STATUSES.has(params.status))   filter.status  = params.status;
  if (params.gateway && VALID_GW_GATEWAYS.has(params.gateway))  filter.gateway = params.gateway;
  if (params.userId  && mongoose.Types.ObjectId.isValid(params.userId)) {
    filter.userId = new mongoose.Types.ObjectId(params.userId);
  }

  const [total, txs] = await Promise.all([
    GatewayTransaction.countDocuments(filter),
    GatewayTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-gatewaySignature')
      .lean<LeanGatewayTx[]>(),
  ]);

  return {
    transactions: txs.map((tx) => ({
      id:                 tx._id.toString(),
      userId:             tx.userId.toString(),
      gateway:            tx.gateway,
      amount:             serializeMoney(tx.amount, tx.currency),
      currency:           tx.currency,
      status:             tx.status,
      gatewayOrderId:     tx.gatewayOrderId   ?? null,
      gatewayPaymentId:   tx.gatewayPaymentId ?? null,
      createdAt:          tx.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---------------------------------------------------------------------------
// Game list
// ---------------------------------------------------------------------------

const VALID_GAME_TYPES = new Set(["Texas Hold'em", 'Omaha', 'Seven-Card Stud', 'Razz', 'Five-Card Draw']);
const VALID_MODES      = new Set(['cash', 'practice']);

export async function getAdminGames(params: {
  page: string;
  limit: string;
  gameType?: string;
  mode?: string;
  deskId?: string;
  pokerModeId?: string;
  from?: string;
  to?: string;
}) {
  verifyAdminCookie();
  await dbConnect();

  const page  = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));

  const filter: Record<string, unknown> = {};
  if (params.deskId      && mongoose.Types.ObjectId.isValid(params.deskId))      filter.deskId      = new mongoose.Types.ObjectId(params.deskId);
  if (params.pokerModeId && mongoose.Types.ObjectId.isValid(params.pokerModeId)) filter.pokerModeId = new mongoose.Types.ObjectId(params.pokerModeId);
  if (params.gameType    && VALID_GAME_TYPES.has(params.gameType))               filter.gameType    = params.gameType;
  if (params.mode        && VALID_MODES.has(params.mode))                        filter.mode        = params.mode;

  const fromDate = params.from ? new Date(params.from) : null;
  const toDate   = params.to   ? new Date(params.to)   : null;
  const hasFrom  = fromDate !== null && !isNaN(fromDate.getTime());
  const hasTo    = toDate   !== null && !isNaN(toDate.getTime());
  if (hasFrom || hasTo) {
    const dateFilter: Record<string, Date> = {};
    if (hasFrom) dateFilter.$gte = fromDate!;
    if (hasTo)   dateFilter.$lte = toDate!;
    filter.completedAt = dateFilter;
  }

  const [total, archives] = await Promise.all([
    PokerGameArchive.countDocuments(filter),
    PokerGameArchive.find(filter)
      .sort({ completedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<LeanArchive[]>(),
  ]);

  return {
    games: archives.map((a) => ({
      id:              a._id.toString(),
      deskId:          a.deskId.toString(),
      pokerModeId:     a.pokerModeId.toString(),
      gameType:        a.gameType,
      mode:            a.mode,
      currency:        a.currency,
      totalPot:        serializeMoney(a.totalPot, a.currency),
      playerCount:     a.players.length,
      durationSeconds: Math.round((a.completedAt.getTime() - a.startedAt.getTime()) / 1000),
      startedAt:       a.startedAt,
      completedAt:     a.completedAt,
      players:         a.players.map((p) => ({
        userId:   p.userId.toString(),
        username: p.username,
        isWinner: p.isWinner,
        netChange: serializeMoney(p.endingStack - p.startingStack, a.currency),
      })),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

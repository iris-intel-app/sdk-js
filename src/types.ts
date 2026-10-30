// Response and request types of the Iris API (https://iriscan.app/developers).
//
// Field names are the API's own (snake_case), so a response can be logged, stored or compared
// with the docs as is. Times named `*_at`, `first`, `last` or `time` are ISO 8601 strings in UTC
// when the type says `string`, Unix seconds when it says `number`.

/** Every chain the API reads. Each method accepts the subset its route supports. */
export type Chain =
  | "solana"
  | "ethereum"
  | "base"
  | "arbitrum"
  | "robinhood"
  | "bsc"
  | "dydx"
  | "noble"
  | "bitcoin"
  | "tron";

/** The EVM chains Iris reads. */
export type EvmChain = "ethereum" | "base" | "arbitrum" | "robinhood" | "bsc";

/** Chains `/analyze` reads (all of them). */
export type AnalyzeChain = Chain;
/** Chains `/insiders` reads: Solana, Robinhood Chain and BNB Chain tokens. */
export type InsidersChain = "solana" | "robinhood" | "bsc";
/** Chains `/follow` reads. */
export type FollowChain = "solana" | EvmChain | "bitcoin" | "tron";
/** Chains `/trace` reads. */
export type TraceChain = "solana" | EvmChain | "bitcoin" | "tron";
/** Chains `/tx` reads (all of them). */
export type TxChain = Chain;
/** Chains `/kind` can tell a token on: a Solana mint, or an ERC-20 on Robinhood Chain or BNB Chain. */
export type KindChain = "solana" | "robinhood" | "bsc";
/** Chains `/xchain/resolve` reads. */
export type XchainChain = Chain;
/** Chains `/xchain/wallet` searches. */
export type XchainWalletChain = "solana" | EvmChain;

// ---------------------------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------------------------

/** What the account has left, from the `x-iris-credits` header (and `credits` in `/follow`). */
export interface Credits {
  plan?: string;
  plan_name?: string;
  cycle?: string;
  analyses_left?: number;
  traces_left?: number;
  pack_credits?: number;
  period_end?: string | null;
  paid_until?: string | null;
  [key: string]: unknown;
}

/** The API key's call limit, from the `X-RateLimit-*` headers, when the server sends them. */
export interface RateLimit {
  limit: number;
  remaining: number;
  /** Unix seconds. */
  reset: number;
}

// ---------------------------------------------------------------------------------------------
// POST /analyze
// ---------------------------------------------------------------------------------------------

export interface Identity {
  /** "MEV_ARBITRAGE", "EXCHANGE", "DRAINER", "TOKEN"... or "UNKNOWN". */
  type: string;
  confidence: number;
}

export interface Risk {
  level: "LOW" | "MEDIUM" | "HIGH";
  /** 0 to 100. */
  score: number;
  confidence: number;
}

export interface Label {
  name: string;
  category: string;
  confidence: number;
  source: string;
  entity: string | null;
  source_url: string | null;
  role: string | null;
}

export interface LookalikePair {
  fake: string;
  real: string;
  real_transactions: number;
  real_sol: number;
}

export interface BehaviorSignal {
  kind: string;
  title: string;
  description: string;
  confidence: number;
  examples: string[];
  lookalikes?: LookalikePair[];
}

export interface Behavior {
  wallet_age_days: number | null;
  transaction_count: number;
  transaction_count_exact: boolean;
  transaction_tier: number | null;
  transactions_analyzed: number;
  unique_counterparties: number;
  active: boolean | null;
}

export interface Activity {
  transfers: number;
  swaps: number;
  program_calls: number;
}

export interface Evidence {
  /** "external_label", "behavior", "counterparty_exposure"... */
  type: string;
  description: string;
  source: string;
  confidence: number;
  source_url: string | null;
}

export interface Counterparty {
  address: string;
  kind: string;
  label: string;
  labels: string[];
  category: string;
  entity: string | null;
  role: string | null;
  source: string;
  interactions: number;
  received_from: number;
  sent_to: number;
  last_seen: string | null;
}

export interface FlowParty {
  address: string;
  entity: string | null;
  label: string | null;
  role: string | null;
  transactions: number;
  signature: string | null;
  sol: number;
  usd: number;
  lookalike: boolean;
}

export interface FlowSide {
  wallets: number;
  transactions: number;
  /** In the chain's native coin (see `native_symbol`). */
  sol: number;
  /** Stablecoins, in dollars. */
  usd: number;
  other_tokens: number;
  top: FlowParty[];
}

export interface MoneyFlow {
  inbound: FlowSide;
  outbound: FlowSide;
}

export interface TokenAmount {
  mint: string;
  amount: number;
  nft?: boolean;
  name?: string;
}

export interface ConnectionTransfer {
  signature: string;
  time: number | null;
  direction: "in" | "out" | string;
  sol: number;
  usd: number;
  tokens: TokenAmount[];
}

export interface NftAmount {
  contract: string;
  name: string | null;
  direction: string;
  count: number;
}

export interface ConnectionAsset {
  mint: string | null;
  name: string | null;
  nft?: boolean;
  direction: string;
  amount: number;
  transactions: number;
}

export interface Connection {
  address: string;
  kind: string;
  label: string | null;
  category: string | null;
  entity: string | null;
  role: string | null;
  sol_in: number;
  usd_in: number;
  transactions_in: number;
  sol_out: number;
  usd_out: number;
  transactions_out: number;
  lookalike: boolean;
  dust_only: boolean;
  calls?: number;
  relation?: string;
  transfers: ConnectionTransfer[];
  nfts?: NftAmount[];
  assets?: ConnectionAsset[];
}

export interface SwapAsset {
  mint: string | null;
  symbol: string | null;
  amount: number;
}

export interface SwapItem {
  signature: string;
  time: number | null;
  sold: SwapAsset[];
  bought: SwapAsset[];
}

export interface SwapVenue {
  program: string;
  name: string | null;
  swaps: number;
  sold: SwapAsset[];
  bought: SwapAsset[];
  recent: SwapItem[];
}

export interface Balance {
  sol: number;
  sol_usd: number | null;
  tokens: number;
  tokens_usd: number;
  unpriced_tokens: number;
}

export interface BalancePoint {
  /** Unix seconds. */
  time: number;
  sol: number;
  sampled: boolean;
}

export interface NftCollection {
  contract: string;
  name: string | null;
  received: number;
  sent: number;
  minted: number;
  burned: number;
}

export interface ProgramParty {
  address: string;
  label: string | null;
  entity: string | null;
  role: string | null;
}

export interface ProgramOwner {
  loader: string;
  upgradeable: boolean;
  authority: ProgramParty | null;
  deployer: ProgramParty | null;
  deployed_at: string | null;
  last_deployed_at: string | null;
  program_data: string | null;
}

export interface ProgramCaller {
  address: string;
  label: string | null;
  entity: string | null;
  role: string | null;
  calls: number;
  failed: number;
  share: number;
  last_seen: string | null;
}

export interface ProgramAlongside {
  program: string;
  label: string | null;
  entity: string | null;
  calls: number;
}

export interface ProgramStats {
  owner: ProgramOwner;
  calls_analyzed: number;
  callers: number;
  failed: number;
  from: string | null;
  to: string | null;
  top_callers: ProgramCaller[];
  alongside: ProgramAlongside[];
  activity: { time: string; calls: number }[];
  bucket_seconds: number;
}

/** Why bundle wallets are tied together. */
export type BundleSignal =
  | "shared_signer"
  | "jito_bundle"
  | "same_batch"
  | "same_setup"
  | "shared_blockhash"
  | "same_funder"
  | "synced_sells"
  | "funding_burst"
  | "same_payout"
  | "funded_by_creator"
  | "funded_by_buyer"
  | "signed_with_dev"
  | "signed_together"
  | "cashed_out_with_dev"
  | "same_cashout"
  | "proxima"
  | "tip_spray"
  | "proxima_fee"
  | "proxima_funding"
  | "launch_blockhash"
  | "blockx_funding"
  | "nonce_cashout"
  | "blockx_fee"
  | "marketplace_wallet"
  | "same_contract"
  | "behind_creation"
  | "kit_sibling"
  | "kit_creation_blockhash"
  | "kit_shared_funder"
  | "creation_block"
  | "first_slots"
  | "same_block"
  | "fresh"
  | "similar_size";

export interface Trader {
  address: string;
  label: string | null;
  entity: string | null;
  /** "creator", "insider", "bundler", "sniper", "volume bot"... */
  role: string | null;
  relation: string | null;
  buys: number;
  sells: number;
  bought: number;
  sold: number;
  spent_sol: number;
  received_sol: number;
  spent_usd: number;
  received_usd: number;
  pnl_sol: number;
  funded_by: string | null;
  fresh: boolean;
  /** Share of the supply held now, 0 to 1. */
  holds: number | null;
  last_seen: string | null;
  signals?: BundleSignal[];
  after?: string;
  launch_share?: number;
  bought_share?: number;
  sold_share?: number;
  first_buy_at?: string;
  last_sell_at?: string;
}

export interface TraderGroup {
  /** "creator", "bundlers", "insiders", "handed", "snipers"... */
  key: string;
  name: string;
  singular: string;
  description: string;
  wallets: number;
  volume_sol: number;
  /** Shares of the supply, 0 to 1. */
  bought_share: number;
  sold_share: number;
  held_share: number;
  pnl_sol: number;
  members: Trader[];
}

export interface TokenFlag {
  severity: string;
  title: string;
  detail: string;
}

export interface Holder {
  address: string;
  label: string | null;
  entity: string | null;
  amount: number;
  /** 0 to 1. */
  share: number;
  pool: boolean;
}

export interface TokenLaunch {
  creator: string | null;
  created_at: string | null;
  /** Tokens the creator bought and sold, over the transactions read. */
  creator_bought: number;
  creator_sold: number;
  bundles: number;
  snipers: number;
}

export interface BundleFunding {
  funder: string;
  service: string | null;
  wallets: number;
  span_secs: number;
  sol: number;
}

export interface ProximaBundle {
  wallets: number;
  with_dev: boolean;
  signed: number;
  signed_with_dev: number;
  receipts: number;
  sell_fees: number;
  funded: number;
  cashed_out_with_dev: number;
  cashout: string | null;
  others: number;
}

export interface BlockxBundle {
  wallets: number;
  with_dev: boolean;
  signed_with_dev: number;
  funded: number;
  staging: string | null;
  staging_with_dev: boolean;
  cashed_out_with_dev: number;
  cashout: string | null;
  fees: number;
  marketplace: number;
  others: number;
}

export interface OwnTrades {
  wallets: number;
  buys: number;
  sells: number;
  spent_sol: number;
  received_sol: number;
  proxima_fees_sol: number;
  pnl_sol: number;
  launch_bought: number;
  launch_share: number;
  supply_base: string;
  complete: boolean;
}

export interface BundleHub {
  address: string;
  kind: "funder" | "contract" | "cashout" | "signer" | "creator";
  members: string[];
  amounts?: (number | null)[];
  service?: string;
  with_dev?: boolean;
}

export interface TokenBundle {
  wallets: number;
  spent_sol: number;
  /** Shares of the supply, 0 to 1: bought and sold over the trades read, and held now. */
  bought_share: number;
  sold_share: number;
  held_share: number;
  launch_share: number;
  blocks: number;
  first_buy_at: string | null;
  after_launch_secs: number | null;
  clusters: number;
  signals: Partial<Record<BundleSignal, number>>;
  funding: BundleFunding | null;
  proxima: ProximaBundle | null;
  blockx: BlockxBundle | null;
  kit: number;
  own_trades?: OwnTrades;
  hubs?: BundleHub[];
  summary: string;
}

export interface Layout {
  kind: "proxima" | "blockx" | "unknown" | "direct";
  label: string;
  reasons: string[];
}

export interface CheckLine {
  label: string;
  ok?: boolean;
  text: string;
  layout?: Layout;
  signatures: string[];
}

export interface DevFeeWallet {
  address: string;
  sol: number;
  mints: string[];
  sell_fees: number;
  claim_cuts: number;
}

export interface FundingBurst {
  senders: number;
  sol_each: number;
  span_secs: number;
  before_launch_secs: number | null;
  examples: string[];
  burst: boolean;
  funding_tips: string[];
  tipped_funding: string | null;
  funder: string | null;
  stake_bounce: string | null;
  nonce_bounce: string | null;
  proxima_like: boolean;
  layout: Layout;
}

export interface LaunchTips {
  relays: string[];
  tip_transactions: string[];
  proxima_like: boolean;
}

export interface BlockxFunding {
  funder: string | null;
  relay: string | null;
  sol: number;
  nonce_hop: boolean;
  recipe: boolean;
  marketplace_funder: string | null;
  marketplace_sweep: string | null;
  blockx_like: boolean;
  signatures: string[];
  layout: Layout;
}

export interface BlockxCheck {
  made_with: boolean;
  funding: BlockxFunding | null;
  fees: number;
  fee_sol: number;
  rate: number | null;
  fee_wallet: string | null;
  flat_fees: number;
  fee_signatures: string[];
  cashouts: number;
  cashout_sol: number;
  cashout_to: string | null;
  cashout_signatures: string[];
  rent_reclaims: number;
  launch_shape: boolean;
  global_fee: string | null;
  summary: string;
}

/** The launch-kit verdict inside a token report: what made the token, by precedence. */
export type KitVerdict = "proxima" | "blockx" | "launch_kit" | "funded_like_kit" | "none";

export interface KitLayer {
  to: string;
  lamports: number;
  senders: string[];
  payments: number;
  start: number;
  end: number;
  signatures: string[];
}

export interface KitTreeLevel {
  level: number;
  wallets: number;
  read: number;
  layers: number;
  largest: string | null;
  signatures: string[];
}

export interface KitTree {
  depth: number;
  wallets: number;
  levels: KitTreeLevel[];
  creator_layers: KitLayer[];
  first_funding: number | null;
  reads: number;
  capped: boolean;
  busy: number;
  top: string[];
  sibling_count: number;
  siblings: string[];
}

export interface KitMark {
  kind: "sell_fee" | "claim_cut" | "receipt";
  who: string;
  wallet: string;
  signature: string;
  sol: number;
  base_sol: number | null;
  fee_wallet: string | null;
  fresh_fee_wallet: boolean | null;
  strict: boolean;
  counts: boolean;
}

export interface KitMember {
  address: string;
  why: ("sibling" | "creation_blockhash" | "shared_funder")[];
  sol: number;
  share: number;
  after: string;
  funder: string | null;
}

export interface KitBundle {
  wallets: number;
  sol: number;
  share: number;
  siblings: number;
  creation_blockhash: number;
  shared_funder: number;
  sold: number;
  holding: number;
  sent_on: number;
  members: KitMember[];
}

export interface LaunchKit {
  verdict: KitVerdict;
  /** "Made with Proxima", "Launch kit"... (absent: none). */
  title: string | null;
  tree: KitTree | null;
  funded_and_tipped: boolean;
  bundle: KitBundle | null;
  marks: KitMark[];
  summary: string;
}

/** A token's dev check: whether a launch kit made it (in `token.launch_tool`). */
export interface DevCheck {
  /** The kit the verdict is about: "Proxima", or "BlockX" when only BlockX's way matched. */
  tool: string;
  checked: string[];
  creator: string;
  made_with: boolean;
  proxima: boolean;
  funding: FundingBurst | null;
  tipping: LaunchTips | null;
  sell_fees: number;
  claim_cuts: number;
  receipts: number;
  fee_wallets: DevFeeWallet[];
  blockx: BlockxCheck | null;
  lines: CheckLine[];
  summary: string;
  verdict: KitVerdict;
  funded_and_tipped: boolean;
  tree: KitTree | null;
  launch_kit: LaunchKit | null;
  checked_at: number;
  creator_latest: string | null;
}

export interface FreshBuyer {
  address: string;
  sol: number;
  tokens: number;
  share: number;
  funder: string | null;
  funder_name: string | null;
  funder_sol: number | null;
}

export interface FreshBuyers {
  checked: number;
  unknown: number;
  wallets: number;
  sol: number;
  share: number;
  buyers: FreshBuyer[];
  severity: string;
  summary: string;
}

export interface TradePoint {
  time: string;
  buys: number;
  sells: number;
  volume_sol: number;
}

export interface Distributor {
  address: string;
  sent: number;
  share: number;
  recipients: number;
  from_creator: boolean;
  first: string | null;
  last: string | null;
}

export interface Handout {
  from: string;
  to: string;
  amount: number;
  share: number;
  signature: string;
  time: string | null;
}

export interface Acquisition {
  address: string;
  share: number;
  how: string;
  from: string | null;
  handed: number;
  signature: string | null;
  time: string | null;
}

export interface Distribution {
  transfers: number;
  tokens: number;
  share: number;
  recipients: number;
  creator_wallets: number;
  creator_share: number;
  distributors: Distributor[];
  handouts: Handout[];
  holders: Acquisition[];
}

export interface PastToken {
  mint: string;
  symbol: string | null;
  launcher: string;
  via: string;
  launched_at: string | null;
  last_active_at: string | null;
  life_secs: number | null;
  status: string;
  launcher_got: number;
  launcher_sold: number;
  launcher_pnl_sol: number;
  sold_out: boolean;
}

/** The creator's other launches. */
export interface TrackRecord {
  creator: string;
  funder: string | null;
  funder_note: string | null;
  creator_txs: number;
  creator_whole: boolean;
  siblings_checked: number;
  launchers: number;
  launched: number;
  checked: number;
  died_young: number;
  faded: number;
  alive: number;
  sold_out: number;
  pnl_sol: number;
  median_life_secs: number | null;
  tokens: PastToken[];
  complete: boolean;
  summary: string;
}

export interface PricePoint {
  time: number;
  price: number;
  mcap: number | null;
  trades: number;
  price_usd?: number;
  mcap_usd?: number;
}

export interface TradeMark {
  time: number;
  signature: string;
  wallet: string;
  role: string;
  side: string;
  tokens: number;
  sol: number;
  price: number | null;
}

/** One trade: [unix seconds, price, tokens, side]. */
export type Tick = [number, number, number, number];

/** A token's report (in `/analyze` for a mint). */
export interface TokenStats {
  mint: string;
  name: string | null;
  symbol: string | null;
  image: string | null;
  program: string;
  decimals: number;
  supply: number;
  mint_authority: string | null;
  freeze_authority: string | null;
  pump_fun: boolean;
  graduated: boolean;
  launchpad?: string;
  quote?: string;
  /** The launch, when the token's first transactions could be read. */
  launch: TokenLaunch | null;
  /** Its launch bundle, when one was found. */
  bundle: TokenBundle | null;
  /** Whether a launch kit made it, when the dev and its launch could be read. */
  launch_tool: DevCheck | null;
  fresh_buyers?: FreshBuyers;
  trades_analyzed: number;
  traders: number;
  buys: number;
  sells: number;
  volume_sol: number;
  from: string | null;
  to: string | null;
  /** Who does what in the market, most telling first. */
  groups: TraderGroup[];
  /** Signs of a rug or a rigged market, most serious first. */
  flags: TokenFlag[];
  creator_funder: string | null;
  creator_funding_layout: Layout | null;
  holders: Holder[];
  activity: TradePoint[];
  bucket_seconds: number;
  distribution: Distribution;
  track_record: TrackRecord | null;
  price: PricePoint[];
  price_bucket_seconds: number;
  price_gap: { from: number; to: number } | null;
  ticks: Tick[];
  gap_ticks?: Tick[];
  native_usd?: [number, number][];
  marks: TradeMark[];
  /** The launch told in order, with its snipers and clusters (shape may grow). */
  story?: TokenStory;
}

export interface TokenStory {
  snipers: Trader[];
  clusters: { funder: string; funder_label: string | null; members: Trader[] }[];
  fresh_checked: { checked: number; unknown: number; fresh: number };
  [key: string]: unknown;
}

export interface AnalyzeMeta {
  analyzed_at: string;
  /** 0 to 1. */
  data_completeness: number;
  /** "live": transactions were analyzed. "database": only labels (not charged). */
  scope: "live" | "database";
  warning: string | null;
  depth: number;
  free: boolean;
}

/** `POST /analyze`: who an address is, how risky, the evidence, and its money in and out. */
export interface AnalyzeResult {
  address: string;
  chain: string;
  native_symbol: string;
  identity: Identity;
  risk: Risk;
  summary: string[];
  labels: Label[];
  behaviors: BehaviorSignal[];
  behavior: Behavior;
  activity: Activity;
  evidence: Evidence[];
  flagged_counterparties: Counterparty[];
  known_counterparties: Counterparty[];
  flows: MoneyFlow;
  connections: Connection[];
  swap_venues: SwapVenue[];
  balance: Balance | null;
  balance_history: BalancePoint[];
  program?: ProgramStats;
  token?: TokenStats;
  nfts?: NftCollection[];
  meta: AnalyzeMeta;
}

// ---------------------------------------------------------------------------------------------
// POST /insiders
// ---------------------------------------------------------------------------------------------

export type InsiderLink = "funded_by_dev" | "sent_to_dev" | "same_funder" | "dev_funded_funder";

export interface InsiderHop {
  from: string;
  to: string;
  signature: string | null;
  time: string | null;
  /** "first funding", "SOL", "tokens" or "stablecoins". */
  what: string;
  sol: number;
  tokens: number;
  usd: number;
}

export interface Insider {
  address: string;
  label: string | null;
  entity: string | null;
  link: InsiderLink;
  link_name: string;
  confidence: number;
  path: InsiderHop[];
  through: string | null;
  also: InsiderLink[];
  via: string | null;
  reasons: string[];
  fresh: boolean;
  first_buy_seconds: number | null;
  first_buy_at: string | null;
  /** Bought in the launch block. */
  bundled: boolean;
  bought: number;
  spent_sol: number;
  spent_usd: number;
  received: number;
  /** Share of the supply it holds now, 0 to 1, when it could be read. */
  holds: number | null;
}

export interface InsiderDev {
  address: string;
  label: string | null;
  entity: string | null;
  funded_by: InsiderHop[];
  funded_from: string | null;
  via: string | null;
  fresh: boolean;
}

export interface InsidersSummary {
  insiders: number;
  /** Share of the supply the insiders hold now, 0 to 1. */
  held_share: number;
  bought_share: number;
  candidates: number;
  checked: number;
  by_link: Record<string, number>;
}

/** `POST /insiders`: the wallets a token's creator is linked to by money. */
export interface InsidersResult {
  mint: string;
  chain: string;
  name: string | null;
  symbol: string | null;
  supply: number;
  launched_at: string | null;
  dev: InsiderDev;
  limit: number;
  depth: number;
  /** false when the time budget ran out: the result covers `summary.checked` wallets. */
  complete: boolean;
  insiders: Insider[];
  summary: InsidersSummary;
  notes: string[];
}

// ---------------------------------------------------------------------------------------------
// POST /launch-tool
// ---------------------------------------------------------------------------------------------

export interface LaunchToolEvidence {
  kind: string;
  strength: "strong" | "moderate" | "weak";
  text: string;
  signatures: string[];
}

export interface LaunchedToken {
  mint: string;
  name: string | null;
  symbol: string | null;
  time: string | null;
  signature: string;
  relays: string[];
  tip_signatures: string[];
}

export interface SellFee {
  signature: string;
  sell_signature: string;
  time: string | null;
  mint: string | null;
  fee_wallet: string;
  sol_received: number;
  fee_sol: number;
  with_sell: boolean;
  slot_gap: number | null;
}

export interface Sells {
  seen: number;
  through_tool: number;
  sol_received: number;
  fees_sol: number;
  unconfirmed: number;
  fees: SellFee[];
}

export interface FeeWalletPayment {
  to: string;
  label: string | null;
  entity: string | null;
  sol: number;
  mint: string | null;
  amount: number;
  signature: string;
  time: string | null;
}

export interface FeeWallet {
  address: string;
  mints: string[];
  paid_sol: number;
  sell_fees: number;
  claim_cuts: number;
  trade_fees: number;
  first_paid: string | null;
  balance_sol: number | null;
  transactions: number | null;
  more_transactions: boolean;
  swept: boolean | null;
  sent: FeeWalletPayment[];
}

export interface CreatorFeeClaim {
  signature: string;
  time: string | null;
  venue: string;
  claimed_sol: number;
  cut_sol: number;
  fee_wallet: string;
  mint: string | null;
  vault: string | null;
  tips: string[];
}

export interface FundingLayer {
  depth: number;
  wallets: number;
  read: number;
  transfers: number;
  amount_sol: number | null;
  same_amount: number;
  fan_out: number | null;
  first: string | null;
  last: string | null;
  examples: string[];
}

export interface FundingStop {
  address: string;
  label: string | null;
  entity: string | null;
  reason: string;
  depth: number;
  transfers: number;
  sol: number;
}

export interface FundingRoot {
  address: string;
  label: string | null;
  entity: string | null;
  depth: number;
  reason: string;
  transfers: number;
  sol: number;
  first_funder: string | null;
  first_funder_label: string | null;
  first_funder_entity: string | null;
  first_funding_sol: number | null;
  first_funding_signature: string | null;
  fresh: boolean | null;
}

export interface FundingTree {
  layers: FundingLayer[];
  wallets: number;
  transfers: number;
  first: string | null;
  last: string | null;
  span_seconds: number | null;
  tree: boolean;
  layout: Layout;
  root: FundingRoot | null;
  stops: FundingStop[];
  complete: boolean;
}

/** `POST /launch-tool`: whether a Solana wallet launched or traded with a launch kit. */
export interface LaunchToolResult {
  wallet: string;
  /** The mint the report is narrowed to, when one was asked for. */
  mint: string | null;
  /** The scan was asked for this mint, and scanned its creator. */
  from_mint: string | null;
  /** The kit the report is about. Named even when nothing was found: check `verdict`. */
  tool: "proxima" | "blockx";
  tool_name: string;
  tool_site: string;
  checked: string[];
  /** "tool": a fingerprint only the kit leaves. "likely": moderate evidence only. */
  verdict: "tool" | "likely" | "none";
  verdict_name: string;
  confidence: number;
  evidence: LaunchToolEvidence[];
  tokens_launched: LaunchedToken[];
  sells: Sells;
  fee_wallets: FeeWallet[];
  claims: CreatorFeeClaim[];
  funding: FundingTree | null;
  window: { transactions: number; oldest: string | null; newest: string | null; whole_history: boolean };
  requests: number;
  complete: boolean;
  notes: string[];
}

// ---------------------------------------------------------------------------------------------
// POST /follow
// ---------------------------------------------------------------------------------------------

export interface FollowAsset {
  symbol: string;
  /** null for the native coin. */
  address: string | null;
  decimals: number;
}

export interface FollowLabel {
  name: string;
  /** exchange, bridge, mixer, dex, contract, sanctioned, hack or other. */
  kind: string;
}

export interface FollowHop {
  from: string;
  to: string;
  amount: number;
  usd: number | null;
  symbol: string;
  signature: string;
  time: number | null;
  share: number;
  to_label: FollowLabel | null;
}

export interface FollowBranch {
  to: string;
  amount: number;
  usd: number | null;
  signature: string;
  to_label: FollowLabel | null;
}

export interface FollowEnd {
  reason: "exchange" | "bridge" | "mixer" | "dex_swap" | "split" | "at_rest" | "loop" | "max_hops" | "no_data" | string;
  address: string;
  detail: string;
  holding: number | null;
  branches: FollowBranch[];
  output: FollowAsset | null;
  signature: string | null;
  time: number | null;
}

/** `POST /follow`: the main stream of money out of a wallet, hop by hop. */
export interface FollowResult {
  chain: string;
  start: string;
  asset: FollowAsset;
  hops: FollowHop[];
  end: FollowEnd;
  /** What the account has left (calls with an API key). */
  credits?: Credits;
}

// ---------------------------------------------------------------------------------------------
// POST /trace
// ---------------------------------------------------------------------------------------------

export interface TraceAnchor {
  signature: string;
  amount: number;
  asset: string;
  time: number;
}

export interface TraceWindow {
  from: number;
  to: number;
  searched: string[];
  transactions: number;
  complete: boolean;
  truncated: boolean;
  open: boolean;
  closes_at: number | null;
  fallback: boolean;
}

export interface TraceSplitPart {
  signature: string;
  address: string;
  amount: number;
  time: number;
}

export interface TraceCandidate {
  address: string;
  signature: string;
  amount: number;
  time: number;
  delta_seconds: number;
  /** trivial, strong, likely, weak, loose, distant; on Bitcoin CoinJoins the tie's name. */
  tier: string;
  confidence: number;
  via: string | null;
  label: string | null;
  same_wallet: boolean;
  asset?: string;
  usd?: number;
  chain?: string;
  reason?: string;
  fee?: number;
  split?: { group: number; parts: number; with: TraceSplitPart[] };
  /** EVM privacy pools only. */
  reasons?: string[];
  /** EVM privacy pools only: a match made of several transactions. */
  parts?: { signature: string; amount: number; time: number }[];
}

export interface SwapLeg {
  coin: string;
  network: string;
  amount: number | null;
  usd: number | null;
  time: number | null;
}

export interface TraceSwap {
  service: string;
  matched: "exact" | "value" | "two_hops" | string;
  deposit: SwapLeg;
  settle: SwapLeg | null;
  recorded_at: number | null;
  other_chain: boolean;
  priced: boolean;
  shifts: number;
}

export interface TraceCluster {
  relayer: string | null;
  transactions: number;
  addresses: string[];
  address_count: number;
  mix: string[];
  amount: number;
  overlap: number;
  first: number;
  last: number;
  fresh: number | null;
  confidence: number;
  reasons: string[];
  signatures: string[];
}

/** `POST /trace`: the likely wallets on the other side of a mixer, exchange or swap service. */
export interface TraceResult {
  entity: string;
  kind: "mixer" | "exchange" | "swap_service" | string;
  direction: "forward" | "backward";
  method: string;
  anchor: TraceAnchor;
  window: TraceWindow;
  anonymity_set: number;
  candidates: TraceCandidate[];
  warnings: string[];
  /** Swap services only. */
  swap?: TraceSwap;
  /** EVM privacy pools only. */
  chain?: string;
  /** Tornado Cash only: groups of withdrawals shaped like the traced batch. */
  clusters?: TraceCluster[];
}

// ---------------------------------------------------------------------------------------------
// POST /tx, /xchain/*
// ---------------------------------------------------------------------------------------------

export interface BridgeLeg {
  chain: string;
  chain_name: string;
  address: string | null;
  tx: string | null;
  tx_url: string | null;
  address_url: string | null;
  time: number | null;
  amount: number | null;
  asset: string | null;
  analyzable: boolean;
}

export interface BridgeLink {
  bridge: string;
  protocol: string | null;
  status: "completed" | "pending" | "refunded" | "unclaimed" | "failed";
  direction: "out" | "in";
  source: BridgeLeg;
  destination: BridgeLeg | null;
  hops: BridgeLeg[];
  explorer_url: string | null;
  evidence: string;
}

/** `POST /xchain/resolve` and `/xchain/wallet`: bridge transfers, both ends of each. */
export interface XchainResult {
  links: BridgeLink[];
  warnings: string[];
}

export interface TxTransfer {
  from: string;
  to: string;
  /** In whole units of `asset`. */
  amount: number;
  /** "SOL", "ETH", "USDC"... */
  asset: string;
  mint: string | null;
  usd: number | null;
}

export interface TxParty {
  address: string;
  chain: string;
  kind: "wallet" | "program" | "token" | string;
  label: string | null;
  /** "exchange", "dex", "bridge", "threat"... */
  category: string | null;
  entity: string | null;
  role: "signer" | "sender" | "receiver" | "program" | string;
  analyzable: boolean;
}

/** `POST /tx`: one transaction explained. */
export interface TxResult {
  chain: string;
  chain_name: string;
  hash: string;
  url: string;
  time: number | null;
  status: "success" | "failed" | string;
  fee_payer: string | null;
  signers: string[];
  summary: string;
  transfers: TxTransfer[];
  parties: TxParty[];
  programs: { address: string; name: string | null }[];
  bridge: XchainResult | null;
}

// ---------------------------------------------------------------------------------------------
// POST /victims, /kind, /chains; GET /status
// ---------------------------------------------------------------------------------------------

export interface Victim {
  address: string;
  sol: number;
  usd: number;
  tokens: number;
  transactions: number;
  first: string | null;
  last: string | null;
  signature: string;
}

/** `POST /victims`: a drainer's victims and what each lost. */
export interface VictimsResult {
  address: string;
  victims: number;
  sol: number;
  usd: number;
  tokens: number;
  transactions_read: number;
  complete: boolean;
  first: string | null;
  last: string | null;
  top: Victim[];
}

/** `POST /kind`: whether an address is a token ("other" when unsure). */
export interface KindResult {
  kind: "token" | "other";
}

export interface ChainActivity {
  chain: string;
  active: boolean | null;
  sent: number | null;
  balance: number | null;
  symbol: string;
}

/** `POST /chains`: which EVM chains a 0x address has used. */
export interface ChainsResult {
  address: string;
  chains: ChainActivity[];
}

export type Health = "operational" | "degraded" | "outage" | "unknown";

export interface StatusCheck {
  at: number;
  ok: boolean;
  latency_ms: number;
  error?: string;
}

export interface StatusComponent {
  id: string;
  name: string;
  description: string;
  status: Health;
  latency_ms: number | null;
  uptime: number | null;
  checks: StatusCheck[];
  interval_seconds: number;
}

export interface StatusEndpoint {
  id: string;
  name: string;
  description: string;
  status: Health;
  requests: number;
  errors: number;
  avg_ms: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  max_ms: number | null;
  last_request_at: number | null;
  timeline: { at: number; requests: number; errors: number; avg_ms: number | null }[];
}

export interface StatusIncident {
  id: number;
  component: string;
  severity: string;
  title: string;
  message: string;
  started_at: string;
  resolved_at: string | null;
}

/** `GET /status`: the health of the API and what it relies on. */
export interface StatusResult {
  status: Health;
  checked_at: number;
  started_at: number;
  uptime_seconds: number;
  version: string;
  check_interval_seconds: number;
  slot: number | null;
  components: StatusComponent[];
  endpoints: StatusEndpoint[];
  knowledge_base: { labels: number; sources: number; refresh: string };
  incidents: StatusIncident[];
  uptime: { id: string; windows: { days: number; since: number; uptime: number; down_seconds: number }[] }[];
}

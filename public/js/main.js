// Victory Quest — Vite entry point
// Importing game.js triggers all module imports and registers DOM event listeners.
import './game.js';

// ── Global onclick shims ───────────────────────────────────────────────────────
// ES module functions are not on window by default, but HTML strings built at
// runtime (and static index.html onclick="") require global scope. Expose all
// functions that are ever called from HTML onclick attributes here.
import {
  // Queue / governance panel
  doAuctionBid, doFastExit,
  govPropose, govVote,
  // Market
  buyListing, cancelListing, submitListItem, marketTab,
  // Bank
  claimBankPosition, depositBank,
  closeBank,
  // Transmuter
  claimTransmuter, earlyWithdrawTransmuter, depositTransmuter,
  closeTransmuter,
  // Shop
  buyItem, repairAllGear,
  closeShop,
  // Exchange
  doExchange,
  closeExchange,
  // Governance UI
  closeGovernance,
  // Market UI
  closeMarket,
  // Changelog
  openChangelog, closeChangelog,
  // Help / How-to-play
  showHelp, helpNav, closeHelp,
  // HUD / menus
  togglePause,
  // Inventory stat buttons
} from './ui.js';

import { spendStat, refundStat } from './combat.js';
import { toggleMute, toggleMuteMusic } from './audio.js';

Object.assign(window, {
  // Queue
  doAuctionBid, doFastExit,
  // Governance
  govPropose, govVote, closeGovernance,
  // Market
  buyListing, cancelListing, submitListItem, marketTab, closeMarket,
  // Bank
  claimBankPosition, depositBank, closeBank,
  // Transmuter
  claimTransmuter, earlyWithdrawTransmuter, depositTransmuter, closeTransmuter,
  // Shop
  buyItem, repairAllGear, closeShop,
  // Exchange
  doExchange, closeExchange,
  // Changelog
  openChangelog, closeChangelog,
  // Help
  showHelp, helpNav, closeHelp,
  // HUD
  togglePause,
  // Stats
  spendStat, refundStat,
  // Audio
  toggleMute, toggleMuteMusic,
});

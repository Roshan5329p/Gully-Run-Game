/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Trophy,
  MapPin,
  Coins,
  Flame,
  ArrowUpCircle,
  Shield,
  Activity,
  Coffee,
  Play,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Star,
  MessageSquarePlus,
  ThumbsUp,
  Trash2,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useStore, ReviewCategory } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

const REVIEW_CATEGORIES: ReviewCategory[] = [
  'Gameplay & Controls',
  'Uncle Chase & Chappals',
  'Bazaar Audio & Shouts',
  'Cutting Chai Power-Up',
  'Idea / Bug Report',
];

const RATING_LABELS: Record<number, string> = {
  5: 'Ekdam Jhakaas! Full Paisa Vasool!',
  4: 'Kadak Masala Chai! Bahut Badhiya!',
  3: 'Thik-Thak Run · Needs Thoda Masala',
  2: 'Uncle Caught Me Too Fast!',
  1: 'Chappal Lag Gayi · Needs Fixing',
};

const QUICK_REVIEW_CHIPS = [
  'Loved the Cutting Chai speed rush!',
  'Uncle’s flying chappal screen-shake is hilarious!',
  '3D shopkeeper shouts make the bazaar feel alive!',
  'Smooth mobile controls and jumps!',
];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const {
    reviews,
    helpfulReviewIds,
    addReview,
    toggleHelpfulReview,
    deleteReview,
    score,
    highScore,
    distance,
    bestDistance,
    level,
    gameMode,
  } = useStore();

  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<ReviewCategory>('Gameplay & Controls');
  const [comment, setComment] = useState('');
  const [includeStats, setIncludeStats] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | ReviewCategory>('ALL');
  const [submittedBanner, setSubmittedBanner] = useState(false);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedFilter === 'ALL') return reviews;
    return reviews.filter((r) => r.category === selectedFilter);
  }, [reviews, selectedFilter]);

  if (!isOpen) return null;

  const activeRating = hoverRating ?? rating;
  const displayScore = score > 0 ? score : highScore;
  const displayDist = Math.floor(distance) > 0 ? Math.floor(distance) : bestDistance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    addReview({
      author,
      rating,
      category,
      comment,
      includeStats,
    });

    audio.playComboTick?.(4);
    setComment('');
    setSubmittedBanner(true);
    window.setTimeout(() => setSubmittedBanner(false), 3800);
  };

  return (
    <div
      data-ui-modal="true"
      className="fixed inset-0 z-[150] bg-[#120703]/92 flex items-center justify-center p-3 md:p-6 pointer-events-auto overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#241007] border-2 border-amber-500/40 rounded-2xl shadow-2xl text-amber-50 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1a0b05] border-b border-amber-500/25 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
                Raju’s Tapri Noticeboard
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {averageRating} ({reviews.length})
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-cyber mt-0.5">
              Player Feedback & Bazaar Reviews
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Feedback Modal"
            className="p-2 rounded-xl bg-[#2c1509] hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6">
          {/* Write a Review Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#1c0d06] border border-amber-500/30 rounded-xl p-4 md:p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/15 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-amber-300">
                  Rate Your Gully Run
                </h3>
                <p className="text-xs text-amber-200/75">
                  Share your review, feature ideas, or report any bazaar bugs!
                </p>
              </div>

              {/* Interactive 5-Star Picker */}
              <div className="flex flex-col items-start sm:items-end">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = starVal <= activeRating;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`Rate ${starVal} out of 5 stars`}
                        className="p-1 rounded-lg hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 md:w-7 md:h-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow'
                              : 'text-stone-600 hover:text-amber-500/50'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-semibold text-amber-300 mt-0.5">
                  {RATING_LABELS[activeRating]}
                </span>
              </div>
            </div>

            {/* Category Tag Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/80 mb-2">
                What are you reviewing?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REVIEW_CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                        selected
                          ? 'bg-amber-500 text-stone-950 border-amber-300 shadow'
                          : 'bg-[#281309] text-amber-200/80 border-amber-500/25 hover:border-amber-400/60 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Comment Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label
                  htmlFor="reviewer-name"
                  className="block text-xs font-bold text-amber-200/80 mb-1"
                >
                  Your Name / Alias
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  maxLength={32}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Gully Runner"
                  className="w-full px-3 py-2 rounded-lg bg-[#281309] border border-amber-500/30 text-sm text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="reviewer-comment"
                    className="block text-xs font-bold text-amber-200/80"
                  >
                    Your Review / Feedback *
                  </label>
                  <span className="text-[11px] font-mono text-amber-300/60">
                    {comment.length}/320
                  </span>
                </div>
                <textarea
                  id="reviewer-comment"
                  rows={3}
                  maxLength={320}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you think about the jumps, Uncle’s chappal chase, Cutting Chai boost, or suggest a new feature..."
                  className="w-full px-3 py-2 rounded-lg bg-[#281309] border border-amber-500/30 text-sm text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            {/* Quick Tap Prompt Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-amber-300/70 mr-1">Quick Tap:</span>
              {QUICK_REVIEW_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setComment((prev) => (prev ? `${prev} ${chip}` : chip).slice(0, 320))
                  }
                  className="text-[11px] px-2.5 py-1 rounded-md bg-[#2c1509] hover:bg-amber-500/20 border border-amber-500/25 text-amber-200 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Attach Run Stats & Submit Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {displayScore > 0 ? (
                <label className="flex items-center gap-2 text-xs text-amber-200/85 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStats}
                    onChange={(e) => setIncludeStats(e.target.checked)}
                    className="rounded border-amber-500/40 bg-[#281309] text-amber-500 focus:ring-0"
                  />
                  <span>
                    Attach run badge (₹{displayScore.toLocaleString()} · {displayDist} m ·{' '}
                    {gameMode === 'ENDLESS' ? `Wave ${level}` : `Level ${level}`})
                  </span>
                </label>
              ) : (
                <span className="text-xs text-amber-300/60">
                  Play a run to attach your score & distance badge!
                </span>
              )}

              <button
                type="submit"
                disabled={!comment.trim()}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  comment.trim()
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" /> Post Review
              </button>
            </div>

            {submittedBanner && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Shukriya! Your review has been pinned to Raju’s Chai Tapri board!
                </span>
              </div>
            )}
          </form>

          {/* Community & Player Reviews Feed */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
                Mohalla Player Reviews ({filteredReviews.length})
              </h3>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    selectedFilter === 'ALL'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-[#1c0d06] text-amber-200/75 hover:text-white border border-amber-500/20'
                  }`}
                >
                  All
                </button>
                {REVIEW_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedFilter === cat
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-[#1c0d06] text-amber-200/75 hover:text-white border border-amber-500/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredReviews.map((rev) => {
                const isHelpful = helpfulReviewIds.includes(rev.id);
                return (
                  <div
                    key={rev.id}
                    className="bg-[#1c0d06] border border-amber-500/25 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rev.author}</span>
                        {rev.isUserSubmitted && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase">
                            You
                          </span>
                        )}
                        <span className="text-xs text-amber-300/60">· {rev.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#2c1509] border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                          {rev.category}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-amber-100/90 text-xs md:text-sm leading-relaxed">
                      {rev.comment}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {rev.score ? (
                        <div className="text-[11px] font-mono text-amber-300/80 bg-[#281309] px-2.5 py-1 rounded-md border border-amber-500/20">
                          Run Stats: ₹{rev.score.toLocaleString()} · {rev.distance ?? 0} m ·{' '}
                          {rev.gameMode === 'ENDLESS'
                            ? `Endless Wave ${rev.level ?? 1}`
                            : `Level ${rev.level ?? 1}`}
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleHelpfulReview(rev.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                            isHelpful
                              ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                              : 'bg-[#281309] border-amber-500/25 text-amber-200/75 hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Helpful ({rev.helpfulCount})</span>
                        </button>

                        {rev.isUserSubmitted && (
                          <button
                            type="button"
                            onClick={() => deleteReview(rev.id)}
                            title="Delete your review"
                            className="p-1.5 rounded-lg bg-[#281309] hover:bg-red-950/80 border border-amber-500/20 hover:border-red-500/40 text-amber-200/60 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Available Chai Tapri Shop Items
const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'DOUBLE_JUMP',
    name: 'Gully Parkour',
    description: 'Double jump in mid-air to leap right over parked auto-rickshaws.',
    cost: 1000,
    icon: ArrowUpCircle,
    oneTime: true,
  },
  {
    id: 'MAX_LIFE',
    name: 'Garam Samosa Plate',
    description: 'Permanently adds an extra stamina heart slot and restores 1 heart.',
    cost: 1500,
    icon: Activity,
  },
  {
    id: 'HEAL',
    name: 'Cutting Masala Chai',
    description: 'Instantly restores 1 stamina heart to put distance between you and Uncle.',
    cost: 1000,
    icon: Coffee,
  },
  {
    id: 'IMMORTAL',
    name: 'Maa Ka Aashirwad',
    description: 'Press Space or Tap during a run for 5 seconds of unstoppable golden blessing.',
    cost: 3000,
    icon: Shield,
    oneTime: true,
  },
];

const UNCLE_TAUNTS = [
  '“Ruko beta! Board exam ke marks dikhao!”',
  '“Cricket ball se meri khidki kisne todi?!”',
  '“Abhi tumhare Papa ko phone lagata hoon!”',
  '“Subah 5 baje utha karo, mobile chhodo!”',
  '“Chappal khayega kya?! Ruko abhi!”',
];

const ShopScreen: React.FC = () => {
  const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
  const [items, setItems] = useState<ShopItem[]>([]);

  useEffect(() => {
    let pool = SHOP_ITEMS.filter(item => {
      if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
      if (item.id === 'IMMORTAL' && hasImmortality) return false;
      return true;
    });

    pool = pool.sort(() => 0.5 - Math.random());
    setItems(pool.slice(0, 3));
  }, [hasDoubleJump, hasImmortality]);

  return (
    <div className="absolute inset-0 bg-[#1c0d06]/95 z-[100] text-amber-50 pointer-events-auto overflow-y-auto">
      <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase mb-1">
          Roadside Refreshment Stop
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-3 font-cyber text-center">
          Raju Chai Tapri
        </h2>
        <div className="flex items-center gap-2 text-amber-200 mb-8 text-sm md:text-base">
          <span>Bazaar Points Available:</span>
          <span className="text-xl md:text-2xl font-bold font-mono tabular-nums text-amber-400">
            ₹{score.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
          {items.map(item => {
            const Icon = item.icon;
            const canAfford = score >= item.cost;
            return (
              <div
                key={item.id}
                className="bg-[#2c1509] border border-amber-500/25 p-6 rounded-xl flex flex-col items-center text-center hover:border-amber-400 transition-colors"
              >
                <div className="bg-amber-500/15 p-3.5 rounded-lg mb-4 text-amber-400">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                <p className="text-amber-100/75 text-sm mb-6 leading-relaxed flex-1 flex items-center justify-center">
                  {item.description}
                </p>
                <button
                  onClick={() => buyItem(item.id as any, item.cost)}
                  disabled={!canAfford}
                  className={`px-5 py-2.5 rounded-lg font-bold w-full text-sm transition-colors whitespace-nowrap shrink-0 ${
                    canAfford
                      ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  Buy for ₹{item.cost}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={closeShop}
          className="flex items-center px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base md:text-lg rounded-lg transition-colors shadow-lg whitespace-nowrap shrink-0"
        >
          Keep Running <Play className="ml-2 w-5 h-5" fill="white" />
        </button>
      </div>
    </div>
  );
};

export const HUD: React.FC = () => {
  const {
    score,
    highScore,
    bestDistance,
    gameMode,
    setGameMode,
    lives,
    maxLives,
    collectedLetters,
    status,
    setStatus,
    level,
    restartGame,
    startGame,
    completeIntro,
    continueToEndless,
    gemsCollected,
    distance,
    isImmortalityActive,
    isStumbling,
    isChaiBoostActive,
    comboCount,
    comboMultiplier,
    lastComboLabel,
    speed,
    reviews,
  } = useStore();

  const target = ['B', 'H', 'A', 'A', 'G', 'O'];
  const [tauntIndex, setTauntIndex] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [isMuted, setIsMuted] = useState(Boolean(audio.isMuted));
  const [introBeat, setIntroBeat] = useState<1 | 2 | 3>(1);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Track the 3 story beats during the 5.4s Intro Cutscene
  useEffect(() => {
    if (status !== GameStatus.INTRO) {
      setIntroBeat(1);
      return;
    }
    setIntroBeat(1);
    const onShatter = () => setIntroBeat(2);
    const onStorm = () => setIntroBeat(3);
    window.addEventListener('intro-window-shatter', onShatter);
    window.addEventListener('intro-uncle-storm', onStorm);
    return () => {
      window.removeEventListener('intro-window-shatter', onShatter);
      window.removeEventListener('intro-uncle-storm', onStorm);
    };
  }, [status]);

  // Sync dynamic Bazaar Ambient Soundscape & Upbeat Percussion with running intensity
  useEffect(() => {
    const speedRatio = speed > 0 ? speed / RUN_SPEED_BASE : 1.0;
    audio.updateBazaarIntensity?.({
      isPlaying: status === GameStatus.PLAYING,
      isShop: status === GameStatus.SHOP || status === GameStatus.INTRO,
      speedRatio,
      level,
      isChaiBoostActive,
      isStumbling,
      comboCount,
      lives,
    });
  }, [status, speed, level, isChaiBoostActive, isStumbling, comboCount, lives]);

  // Rotate Uncle's scolding callouts during gameplay
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      setTauntIndex(prev => (prev + 1) % UNCLE_TAUNTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [status]);

  // Trigger immediate scolding change when hit
  useEffect(() => {
    const onHit = () => {
      setTauntIndex(prev => (prev + 1) % UNCLE_TAUNTS.length);
    };
    window.addEventListener('player-hit', onHit);
    return () => window.removeEventListener('player-hit', onHit);
  }, []);

  if (status === GameStatus.SHOP) {
    return <ShopScreen />;
  }

  if (status === GameStatus.INTRO) {
    const beatContent =
      introBeat === 1
        ? {
            tag: 'Gully Cricket · Sunday 4:45 PM',
            title: 'Last Ball of the Match... Massive SIXER!',
            desc: 'You swing your Kashmir Willow bat with everything you’ve got...',
            accent: 'border-amber-400 text-amber-300',
          }
        : introBeat === 2
        ? {
            tag: 'Direct Hit · Sharma Niwas',
            title: 'CRASH!! Right Through Sharma Uncle’s Window & Chai!',
            desc: 'The leather ball shatters his living-room glass and sends his afternoon masala chai flying!',
            accent: 'border-orange-500 text-orange-300',
          }
        : {
            tag: 'Code Red · Flying Chappal Alert',
            title: '“Meri Khidki Tod Di?! RUK BETA!”',
            desc: 'Sharma Uncle storms out onto the bazaar street waving his chappal. BHAAGO!',
            accent: 'border-red-500 text-red-300',
          };

    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-50">
        {/* Top Bar during Intro: Story Header + Audio & Skip Intro Controls */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <div className="bg-[#1c0d06]/90 border border-amber-500/35 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200">
              Story Intro · Step {introBeat} of 3
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(Boolean(audio.toggleMute?.()))}
              title={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              aria-label={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              className="bg-[#1c0d06]/90 border border-amber-500/35 hover:border-amber-400 p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-stone-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-400" />
              )}
            </button>

            <button
              onClick={completeIntro}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs md:text-sm rounded-xl transition-colors shadow-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              Skip Intro <Play className="w-4 h-4 fill-stone-950" />
            </button>
          </div>
        </div>

        {/* Bottom Comic Story Panel */}
        <div className="w-full flex justify-center pointer-events-auto">
          <div
            className={`w-full max-w-2xl bg-[#1c0d06]/92 border-2 ${beatContent.accent} rounded-2xl px-5 py-4 shadow-2xl transition-all duration-200`}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 mb-1">
              {beatContent.tag}
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-cyber mb-1">
              {beatContent.title}
            </h2>
            <p className="text-amber-100/85 text-xs md:text-sm leading-relaxed">
              {beatContent.desc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.MENU) {
    const isEndless = gameMode === 'ENDLESS';
    return (
      <div className="absolute inset-0 flex items-center justify-center z-[100] bg-[#1a0b05]/90 p-4 pointer-events-auto overflow-y-auto">
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#261107]">
          <div className="relative w-full min-h-[500px] aspect-[4/3] bg-gradient-to-br from-amber-700 via-orange-800 to-stone-950 overflow-hidden">
            {!coverError ? (
              <img
                src={new URL('../../src/assets/images/indian_street_uncle_chase_1794369409878.jpg', import.meta.url).href}
                alt="Young Indian boy running through a golden-hour bazaar street chased by an angry Uncle waving a chappal"
                referrerPolicy="no-referrer"
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <Flame className="w-16 h-16 text-amber-400 mb-3" />
                <span className="text-2xl font-extrabold text-amber-200 font-cyber">
                  Gully Runner: Bhaago Beta!
                </span>
              </div>
            )}

            {/* Measured contrast scrim for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b05] via-[#1a0b05]/70 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end items-center p-5 md:p-6 pb-5 text-center z-10">
              {highScore > 0 && (
                <div className="mb-2 px-3 py-1 rounded-md bg-[#1c0d06]/90 border border-amber-400/35 text-amber-300 text-xs font-mono tabular-nums">
                  Best Score: ₹{highScore.toLocaleString()} · Best Distance: {bestDistance} m
                </div>
              )}

              <p className="text-xs font-semibold tracking-wider text-amber-300 uppercase mb-0.5">
                Indian Bazaar Street Chase
              </p>
              <h1
                className="text-2xl md:text-4xl font-extrabold text-white font-cyber mb-1.5 drop-shadow"
                style={{ textWrap: 'balance' }}
              >
                Bhaago Beta! Uncle Chase
              </h1>
              <p className="text-amber-100/85 text-xs md:text-sm max-w-md mb-3">
                {isEndless
                  ? 'Endless Mode: Survive infinite bazaar waves, visit Raju’s Chai Tapri after every B-H-A-A-G-O word, and set an unbeatable high score!'
                  : 'Regular Mode: Complete 3 Mohalla levels by spelling B-H-A-A-G-O to outrun Sharma Uncle and make a clean getaway!'}
              </p>

              {/* Mode Selection Toggle: Regular Mode vs Endless Mode */}
              <div
                role="group"
                aria-label="Select Game Mode"
                className="grid grid-cols-2 gap-2 w-full bg-[#1a0b05]/90 p-1.5 rounded-xl border border-amber-500/35 mb-2.5"
              >
                <button
                  type="button"
                  onClick={() => setGameMode('REGULAR')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs md:text-sm transition-colors flex flex-col items-center justify-center ${
                    !isEndless
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'text-amber-200/80 hover:text-white hover:bg-amber-500/10'
                  }`}
                >
                  <span>Regular Mode</span>
                  <span className={`text-[10px] font-normal ${!isEndless ? 'text-stone-900' : 'text-amber-300/60'}`}>
                    3 Levels · Story Escape
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('ENDLESS')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs md:text-sm transition-colors flex flex-col items-center justify-center ${
                    isEndless
                      ? 'bg-orange-500 text-stone-950 shadow'
                      : 'text-amber-200/80 hover:text-white hover:bg-amber-500/10'
                  }`}
                >
                  <span>Endless Mode ∞</span>
                  <span className={`text-[10px] font-normal ${isEndless ? 'text-stone-900' : 'text-amber-300/60'}`}>
                    Infinite Waves · High Score
                  </span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={() => {
                    audio.init();
                    startGame(gameMode);
                  }}
                  className="flex-1 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base md:text-lg rounded-xl transition-colors shadow-lg flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  {isEndless ? 'Start Endless Run' : 'Start Regular Run'}{' '}
                  <Play className="ml-2 w-5 h-5 fill-stone-950" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(true)}
                  className="px-4 py-3 bg-[#1c0d06]/95 hover:bg-[#2c1509] text-amber-200 border border-amber-500/40 rounded-xl font-bold text-xs md:text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Reviews ({averageRating}★)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-amber-200/75 text-xs mt-2.5 font-mono">
                <span>A/D or Left/Right to Dodge</span>
                <span aria-hidden="true">·</span>
                <span>W/Up to Jump</span>
                <span aria-hidden="true">·</span>
                <span>S/Down to Slide</span>
                <span aria-hidden="true">·</span>
                <span>Space for Blessing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    const isEndless = gameMode === 'ENDLESS';
    return (
      <div className="absolute inset-0 bg-[#1a0b05]/95 z-[100] text-white pointer-events-auto overflow-y-auto">
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-lg mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-1">
            {isEndless ? 'Endless Bazaar Run Ended' : 'Flying Chappal Impact'}
          </p>
          <h1
            className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-2 font-cyber text-center"
            style={{ textWrap: 'balance' }}
          >
            Caught by Sharma Uncle!
          </h1>
          <p className="text-amber-100/75 text-sm md:text-base text-center mb-6">
            “Pakad liya! Chalo abhi tumhare Papa ke paas chalte hain!”
          </p>

          <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-amber-300 text-sm font-medium">
                <Trophy className="mr-2.5 w-5 h-5" />{' '}
                {isEndless ? 'Endless Wave Reached' : 'Mohalla Level'}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                {isEndless ? `Wave ${level}` : `${level} / 3`}
              </div>
            </div>
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-amber-400 text-sm font-medium">
                <Coins className="mr-2.5 w-5 h-5" /> Samosas & Coins
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{gemsCollected}</div>
            </div>
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-orange-300 text-sm font-medium">
                <MapPin className="mr-2.5 w-5 h-5" /> Gully Distance
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{Math.floor(distance)} m</div>
            </div>
            <div className="bg-amber-500/15 p-4 rounded-xl border border-amber-400/30 flex items-center justify-between mt-1">
              <div>
                <div className="text-amber-100 text-sm font-semibold">Total Bazaar Score</div>
                {highScore > 0 && (
                  <div className="text-[11px] text-amber-300/75 font-mono tabular-nums">
                    Personal Best: ₹{highScore.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-2xl md:text-3xl font-extrabold font-mono tabular-nums text-amber-400">
                ₹{score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-md">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                onClick={() => {
                  audio.init();
                  restartGame();
                }}
                className="w-full sm:w-auto flex-1 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base rounded-xl transition-colors shadow-lg whitespace-nowrap shrink-0"
              >
                Run Again ({isEndless ? 'Endless' : 'Regular'})
              </button>

              <button
                onClick={() => setStatus(GameStatus.MENU)}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#2c1509] hover:bg-[#3b1d0d] text-amber-200 border border-amber-500/35 font-bold text-sm md:text-base rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                Change Mode
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full px-5 py-3 bg-[#241007] hover:bg-[#33170b] text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs md:text-sm transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span>Rate & Review Game ({averageRating} ★ · {reviews.length} Reviews)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    return (
      <div className="absolute inset-0 bg-[#1a0b05]/95 z-[100] text-white pointer-events-auto overflow-y-auto">
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-lg mx-auto">
          <Trophy className="w-16 h-16 text-amber-400 mb-3" />
          <h1
            className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-2 font-cyber text-center"
            style={{ textWrap: 'balance' }}
          >
            Escaped the Mohalla!
          </h1>
          <p className="text-amber-100/80 text-sm md:text-base mb-6 text-center">
            Sharma Uncle stopped at Raju’s Tapri to catch his breath and drink chai. You cleared all 3 levels—or you can keep this run going in Endless Mode!
          </p>

          <div className="grid grid-cols-1 gap-4 text-center mb-6 w-full max-w-md">
            <div className="bg-[#2c1509] p-6 rounded-xl border border-amber-500/30">
              <div className="text-xs text-amber-200/70 mb-1 uppercase tracking-wider">Final Score</div>
              <div className="text-3xl md:text-4xl font-extrabold font-mono tabular-nums text-amber-400">
                ₹{score.toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20">
                <div className="text-xs text-amber-200/70">Samosas</div>
                <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-amber-300">
                  {gemsCollected}
                </div>
              </div>
              <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20">
                <div className="text-xs text-amber-200/70">Distance</div>
                <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-orange-300">
                  {Math.floor(distance)} m
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-md">
            <button
              onClick={() => {
                audio.init();
                continueToEndless();
              }}
              className="w-full px-7 py-3.5 bg-orange-500 hover:bg-orange-400 text-stone-950 font-extrabold text-base md:text-lg rounded-xl transition-colors shadow-lg whitespace-nowrap shrink-0"
            >
              Continue into Endless Mode (Wave 4+) ∞
            </button>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => {
                  audio.init();
                  restartGame();
                }}
                className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm md:text-base rounded-xl transition-colors shadow whitespace-nowrap shrink-0"
              >
                Play Regular Again
              </button>

              <button
                onClick={() => setStatus(GameStatus.MENU)}
                className="px-6 py-3 bg-[#2c1509] hover:bg-[#3b1d0d] text-amber-200 border border-amber-500/35 font-bold text-sm md:text-base rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                Main Menu
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full px-5 py-3 bg-[#241007] hover:bg-[#33170b] text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs md:text-sm transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span>Rate & Review Your Escape ({averageRating} ★)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Distance status label for Uncle
  const uncleProximityLabel = isChaiBoostActive
    ? 'Uncle: Falling Behind (22m)!'
    : isStumbling
    ? 'Uncle: Right on Your Heels (2m)!'
    : lives >= 3
    ? 'Uncle: 15m Behind'
    : lives === 2
    ? 'Uncle: Closing In (8m)!'
    : 'Uncle: Chappal Range (3m)!';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-50">
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* Golden Masala-Amber Colour Grade & Warm Vignette Overlay when Cutting Chai is Active */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none transition-opacity duration-300 z-[-1] ${
          isChaiBoostActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(251, 191, 36, 0.10) 0%, rgba(245, 158, 11, 0.22) 62%, rgba(180, 83, 9, 0.44) 100%)',
          boxShadow: 'inset 0 0 90px rgba(245, 158, 11, 0.38)',
        }}
      />

      {/* Top HUD Bar (Solid dark translucent surface without backdrop-blur over WebGL) */}
      <div className="flex justify-between items-start w-full gap-4">
        <div className="bg-[#1c0d06]/85 border border-amber-500/30 px-4 py-2 rounded-xl">
          <div className="text-[11px] text-amber-200/75 font-medium">
            {gameMode === 'ENDLESS'
              ? `Endless Mode · Wave ${level} ∞`
              : `Regular Mode · Level ${level}/3`}
          </div>
          <div className="flex items-baseline gap-2.5">
            <div className="text-2xl md:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
              ₹{score.toLocaleString()}
            </div>
            {comboCount > 0 && (
              <span className="text-xs md:text-sm font-extrabold font-mono tabular-nums text-orange-400">
                {comboMultiplier}x COMBO ({comboCount})
              </span>
            )}
          </div>
          {comboCount > 0 && lastComboLabel && (
            <div className="text-[11px] font-semibold text-amber-200 mt-0.5 truncate max-w-[220px]">
              {lastComboLabel}
            </div>
          )}
        </div>

        {/* Center B-H-A-A-G-O Word Progress */}
        <div className="flex flex-col items-center">
          <div className="flex space-x-1.5 md:space-x-2">
            {target.map((char, idx) => {
              const isCollected = collectedLetters.includes(idx);
              const color = GEMINI_COLORS[idx];

              return (
                <div
                  key={idx}
                  style={{
                    borderColor: isCollected ? color : 'rgba(120, 53, 15, 0.6)',
                    color: isCollected ? '#1c0d06' : 'rgba(254, 243, 199, 0.45)',
                    backgroundColor: isCollected ? color : 'rgba(28, 13, 6, 0.88)',
                  }}
                  className="w-7 h-9 md:w-9 md:h-11 flex items-center justify-center border-2 font-extrabold text-sm md:text-lg font-cyber rounded-lg transition-colors duration-200"
                >
                  {char}
                </div>
              );
            })}
          </div>
          {isImmortalityActive && (
            <div className="mt-2 bg-amber-500 text-stone-950 px-3 py-0.5 rounded-md font-bold text-xs flex items-center">
              <Shield className="w-3.5 h-3.5 mr-1 fill-stone-950" /> Maa Ka Aashirwad Active
            </div>
          )}
          {isChaiBoostActive && (
            <div className="mt-2 bg-amber-400 text-stone-950 border border-yellow-200 px-3 py-0.5 rounded-md font-extrabold text-xs flex items-center shadow-lg">
              <Coffee className="w-3.5 h-3.5 mr-1" /> Cutting Chai Rush · Invincible + 20% Speed (4s)!
            </div>
          )}
          {isStumbling && !isImmortalityActive && !isChaiBoostActive && (
            <div className="mt-2 bg-orange-600 text-white border border-amber-300 px-3 py-0.5 rounded-md font-bold text-xs flex items-center">
              Stumbled on Bazaar Debris · Slowed Down!
            </div>
          )}
        </div>

        {/* Stamina Hearts, Feedback Button & Bazaar Audio Mute Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            title="Give Game Feedback & Review"
            aria-label="Give Game Feedback & Review"
            className="bg-[#1c0d06]/85 border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
          >
            <MessageSquarePlus className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
          </button>

          <button
            onClick={() => setIsMuted(Boolean(audio.toggleMute?.()))}
            title={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
            aria-label={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
            className="bg-[#1c0d06]/85 border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-stone-400" />
            ) : (
              <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            )}
          </button>

          <div className="bg-[#1c0d06]/85 border border-amber-500/30 px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5">
            {[...Array(maxLives)].map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 md:w-6 md:h-6 ${
                  i < lives ? 'text-red-500 fill-red-500' : 'text-stone-700 fill-stone-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Dock: Uncle Scolding Callout & Speedometer */}
      <div className="w-full flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => setDockCollapsed(c => !c)}
          className="mb-1 px-3 py-1 bg-[#1c0d06]/90 border border-amber-500/30 rounded-t-lg text-amber-200/80 hover:text-white text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show Chase Info
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide Chase Info
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full max-w-2xl bg-[#1c0d06]/90 border border-amber-500/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 text-amber-100">
              <span className="font-bold text-orange-400 whitespace-nowrap shrink-0">
                Sharma Uncle:
              </span>
              <span className="italic text-amber-200 truncate">{UNCLE_TAUNTS[tauntIndex]}</span>
            </div>

            <div className="flex items-center gap-3 text-amber-300/90 font-mono tabular-nums whitespace-nowrap shrink-0">
              <span className={lives === 1 ? 'text-red-400 font-bold' : 'text-amber-300'}>
                {uncleProximityLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>Speed {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

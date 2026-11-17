/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Target,
  Trophy,
  Award,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  Info,
  Flame,
  Coffee,
  Shield,
  Crown,
  ArrowUpCircle,
  Users,
  Send,
  Sliders,
  Check,
} from 'lucide-react';
import { useStore, CHARACTER_PROFILES, ReviewCategory } from '../../store';
import { CharacterId } from '../../types';

interface ProgressionModalProps {
  onClose: () => void;
  defaultTab?: 'missions' | 'characters' | 'leaderboard' | 'reviews';
}

const REVIEW_CATEGORIES: ReviewCategory[] = [
  'Gameplay & Controls',
  'Uncle Chase & Chappals',
  'Bazaar Audio & Shouts',
  'Cutting Chai Power-Up',
  'Idea / Bug Report',
];

export const ProgressionModal: React.FC<ProgressionModalProps> = ({
  onClose,
  defaultTab = 'missions',
}) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'characters' | 'leaderboard' | 'reviews'>(
    defaultTab
  );

  const {
    dailyMissions,
    lastMissionDate,
    claimDailyMissionReward,
    achievements,
    leaderboard,
    selectedCharacter,
    unlockedCharacters,
    selectCharacter,
    score,
    highScore,
    distance,
    bestDistance,
    persistentWallet,
    persistentExtraHearts,
    buyPermanentHeartUpgrade,
    reviews,
    addReview,
    toggleHelpfulReview,
    helpfulReviewIds,
  } = useStore();

  // Review Form State
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<ReviewCategory>('Gameplay & Controls');
  const [comment, setComment] = useState('');
  const [includeStats, setIncludeStats] = useState(true);
  const [submittedBanner, setSubmittedBanner] = useState(false);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    addReview({
      author,
      rating,
      category,
      comment,
      includeStats,
    });

    setComment('');
    setSubmittedBanner(true);
    setTimeout(() => setSubmittedBanner(false), 3500);
  };

  const getAchievementIcon = (iconId: string) => {
    if (iconId.includes('near_miss') || iconId.includes('streak')) {
      return <Flame className="w-5 h-5 text-orange-400" />;
    }
    if (iconId.includes('chai')) {
      return <Coffee className="w-5 h-5 text-sky-400" />;
    }
    if (iconId.includes('shield')) {
      return <Shield className="w-5 h-5 text-yellow-400" />;
    }
    if (iconId.includes('uncle')) {
      return <Crown className="w-5 h-5 text-rose-400" />;
    }
    return <Award className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div
      data-ui-modal="true"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 pointer-events-auto overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#1c0d06] border border-amber-500/30 text-amber-50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 pb-3 border-b border-amber-500/20 bg-[#241007]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                Mohalla Career & Progression
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Wallet: ₹{persistentWallet.toLocaleString()}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold font-cyber text-amber-300">
              Gully Progression Hub
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-400/80 hover:text-white hover:bg-amber-500/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Responsive Tabs Navigation */}
        <div className="flex items-center border-b border-amber-500/20 bg-[#160a05] px-2 md:px-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'missions'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-amber-200/60 hover:text-amber-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Daily Missions</span>
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'characters'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-amber-200/60 hover:text-amber-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Runners & Badges</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-amber-200/60 hover:text-amber-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Local Records</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'reviews'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-amber-200/60 hover:text-amber-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mohalla Word-of-Mouth</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: DAILY MISSIONS */}
          {activeTab === 'missions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Daily Mission Reset Date:{' '}
                    <strong className="text-amber-300 font-mono">{lastMissionDate}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-amber-200/70">
                  Resets every 24 hours at 00:00 · Safe manual reward claim
                </div>
              </div>

              <div className="space-y-3">
                {dailyMissions.map((m) => {
                  const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
                  return (
                    <div
                      key={m.id}
                      className="bg-[#2a1308] border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-sm">{m.title}</h4>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            +₹{m.rewardPoints}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-amber-200/60 font-mono">
                            <span>Progress</span>
                            <span>
                              {m.progress} / {m.target} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-amber-500/20">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        {m.claimed ? (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                          </span>
                        ) : m.completed ? (
                          <button
                            onClick={() => claimDailyMissionReward(m.id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs rounded-lg transition-colors shadow-lg animate-pulse"
                          >
                            Claim ₹{m.rewardPoints}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-stone-900/60 text-stone-500 border border-stone-800 rounded-lg text-xs font-medium">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Persistent Upgrades Section */}
              <div className="mt-6 pt-4 border-t border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">Permanent Stamina Training</h3>
                    <p className="text-xs text-amber-200/60">
                      Genuinely persistent upgrade: Start every future run with +1 stamina heart slot (stored in browser)
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-400">
                    Active Base Slots: {3 + persistentExtraHearts} / 5
                  </div>
                </div>

                <div className="bg-[#261006] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">Mohalla Fitness Regimen</div>
                    <div className="text-xs text-amber-100/70">
                      Cost: ₹2,500 Bazaar Wallet Points (Current: ₹{persistentWallet})
                    </div>
                  </div>
                  <button
                    disabled={persistentWallet < 2500 || persistentExtraHearts >= 2}
                    onClick={() => buyPermanentHeartUpgrade()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      persistentExtraHearts >= 2
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : persistentWallet >= 2500
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {persistentExtraHearts >= 2 ? 'Max Reached (5 Hearts)' : 'Upgrade for ₹2,500'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHARACTERS & ACHIEVEMENTS */}
          {activeTab === 'characters' && (
            <div className="space-y-6">
              {/* Runners Roster */}
              <div>
                <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" /> Select Active Runner
                </h3>
                <p className="text-xs text-amber-200/60 mb-3">
                  Choose your gully runner. Higher score and distance unlocks faster runners with unique perks!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CHARACTER_PROFILES.map((char) => {
                    const isUnlocked = unlockedCharacters.includes(char.id);
                    const isSelected = selectedCharacter === char.id;
                    return (
                      <div
                        key={char.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400'
                            : isUnlocked
                            ? 'bg-[#281309] border-amber-500/25'
                            : 'bg-[#180a04] border-stone-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{char.name}</span>
                              <span className="text-[10px] text-amber-400 font-mono">
                                {char.title}
                              </span>
                            </div>
                            <div className="text-xs text-amber-300/90 font-medium mt-0.5">
                              {char.perkLabel}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-amber-500/15">
                          <span className="text-[10px] text-amber-200/60">
                            {isUnlocked ? 'Unlocked' : char.unlockRequirementText}
                          </span>
                          {isUnlocked ? (
                            <button
                              disabled={isSelected}
                              onClick={() => selectCharacter(char.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                isSelected
                                  ? 'bg-amber-400 text-stone-950 cursor-default'
                                  : 'bg-[#1c0d06] hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isSelected ? 'Equipped' : 'Equip'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-bold">Locked</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="pt-4 border-t border-amber-500/20">
                <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> Mohalla Badges & Achievements
                </h3>
                <p className="text-xs text-amber-200/60 mb-3">
                  Accomplish iconic bazaar stunts to earn badges
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                        ach.unlocked
                          ? 'bg-[#2a1308] border-amber-500/35 shadow-md'
                          : 'bg-[#180a04] border-stone-800 opacity-60'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          ach.unlocked ? 'bg-amber-500/20' : 'bg-stone-900 text-stone-600'
                        }`}
                      >
                        {getAchievementIcon(ach.id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-sm">{ach.title}</h4>
                          {ach.unlocked && (
                            <span className="text-[10px] text-emerald-400 font-bold">Unlocked</span>
                          )}
                        </div>
                        <p className="text-xs text-amber-100/70 mt-1 leading-relaxed">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {/* Honest Public Data Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">
                    Offline Device Storage Notice
                  </strong>
                  This leaderboard records personal runs locally on your browser. Demo records are
                  provided for local competition and are not hosted on an external public server.
                </div>
              </div>

              {/* Personal Career Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#2a1308] p-3 rounded-xl border border-amber-500/15">
                  <div className="text-[10px] uppercase text-amber-200/60">Personal Best Score</div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    ₹{highScore.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#2a1308] p-3 rounded-xl border border-amber-500/15">
                  <div className="text-[10px] uppercase text-amber-200/60">Best Distance</div>
                  <div className="text-lg font-bold font-mono text-orange-400">
                    {bestDistance} m
                  </div>
                </div>
                <div className="bg-[#2a1308] p-3 rounded-xl border border-amber-500/15 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase text-amber-200/60">Bazaar Wallet</div>
                  <div className="text-lg font-bold font-mono text-yellow-300">
                    ₹{persistentWallet.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="bg-[#241006] border border-amber-500/20 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#180a04] text-amber-300/80 uppercase font-semibold text-[10px] border-b border-amber-500/20">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Runner Name</th>
                      <th className="py-2.5 px-3 text-right">Distance</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {leaderboard.map((entry, index) => {
                      const isTop3 = index < 3;
                      const isPlayer = entry.isPlayer;
                      return (
                        <tr
                          key={entry.id || index}
                          className={`hover:bg-amber-500/5 transition-colors ${
                            isPlayer ? 'bg-amber-500/15 font-bold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {isTop3 ? (
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                                  index === 0
                                    ? 'bg-yellow-400 text-stone-950'
                                    : index === 1
                                    ? 'bg-stone-300 text-stone-950'
                                    : 'bg-amber-700 text-amber-100'
                                }`}
                              >
                                {index + 1}
                              </span>
                            ) : (
                              index + 1
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-white">
                            <div className="font-medium flex items-center gap-1.5">
                              {entry.name}
                              {isPlayer ? (
                                <span className="text-[9px] bg-amber-400 text-stone-950 px-1.5 py-0.2 rounded font-bold">
                                  YOUR RUN
                                </span>
                              ) : (
                                <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.2 rounded">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-200/50">
                              Mode: {entry.mode || 'REGULAR'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-200">
                            {entry.distance} m
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 text-sm">
                            ₹{entry.score.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEWS & TESTIMONIALS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">
                    Mohalla Community Feedback
                  </strong>
                  Reviews include neighborhood flavor testimonials and any ratings submitted locally on this device.
                </div>
              </div>

              {submittedBanner && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Review submitted and added to local storage!
                </div>
              )}

              {/* Add Review Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="bg-[#241006] p-4 rounded-xl border border-amber-500/20 space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Bunty)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="flex-1 bg-[#1a0b05] border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center gap-1 self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-700 fill-stone-900'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {REVIEW_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                        category === cat
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-[#180a04] text-amber-200/70 border-amber-500/20 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Share your experience dodging Sharma Uncle or drinking cutting chai..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1a0b05] border border-amber-500/30 rounded-lg p-2.5 text-xs text-white placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-amber-200/75 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStats}
                      onChange={(e) => setIncludeStats(e.target.checked)}
                      className="rounded border-amber-500/50 bg-[#1c0d06] text-amber-500"
                    />
                    <span>Attach my best distance & score</span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Review
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[#2a1308] p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-amber-200">{rev.author}</span>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-700 fill-stone-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 mb-2">
                        {rev.category}
                      </span>
                      <p className="text-xs text-amber-100/80 italic leading-relaxed mb-3">
                        {rev.comment}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/15 text-[10px] text-amber-200/60">
                      <span>{rev.createdAt}</span>
                      <button
                        type="button"
                        onClick={() => toggleHelpfulReview(rev.id)}
                        className={`flex items-center gap-1 hover:text-amber-300 ${
                          helpfulReviewIds.includes(rev.id) ? 'text-amber-400 font-bold' : ''
                        }`}
                      >
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20 bg-[#241007] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

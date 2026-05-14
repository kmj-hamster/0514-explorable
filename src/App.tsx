import { useState, useEffect } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { cn } from './lib/utils';
import { ThumbsUp, MessageSquare, Share2, Pause, Play, AlertTriangle, Activity, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostState } from './types';

// Helper to format time
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function App() {
  const {
    posts,
    time,
    stage,
    isPaused,
    weights,
    triggerABTest,
    handleABChoice,
    abTestPosts,
    totalInteractionPsec,
    togglePause,
  } = useGameEngine();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent pausing if a modal is open (like ABTestModal) to avoid weird states, or allow it?
      // Actually we probably just want to toggle if no modal is open
      if (e.code === 'Space' && !abTestPosts) {
        e.preventDefault(); // Prevent page scrolling
        togglePause();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, abTestPosts]);

  const top6 = posts.slice(0, 6);
  
  // Stats
  const top6AvgDeltaComments = top6.length ? top6.reduce((acc, p) => acc + p.delta_comments, 0) / top6.length : 0;
  const top6AvgTruth = top6.length ? top6.reduce((acc, p) => acc + p.base_truth, 0) / top6.length : 0;
  const top6TruthAbove70Count = top6.filter(p => p.base_truth > 70).length;

  let goalText = "";
  let isWarning = false;
  
  if (stage === 1) {
    goalText = "Board wants growth! Top 6 Avg Comment increase must > 50/s.";
  } else if (stage === 2) {
    goalText = "PR Crisis! Fake news is spreading. Get at least 3 posts with high Truth in Top 6!";
    isWarning = true;
  } else {
    goalText = "Ultimate Balance: Total Interaction > 100/s AND Avg Truth > 60.";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 p-4 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            The Algorithm Abyss
          </h1>
          <div className="px-3 py-1 bg-slate-800 rounded-md font-mono text-sm border border-white/5">
            {formatTime(time)}
          </div>
        </div>

        <div className={cn(
          "flex-1 lg:mx-12 mx-4 px-6 py-3 rounded-xl border-2 text-base lg:text-lg font-semibold flex items-center justify-center gap-3 transition-colors shadow-lg",
          isWarning ? "bg-red-500/20 border-red-500/50 text-red-50 shadow-red-900/30" : "bg-indigo-500/20 border-indigo-500/50 text-indigo-50 shadow-indigo-900/30"
        )}>
          {isWarning ? <AlertTriangle className="h-6 w-6 shrink-0 text-red-400 animate-pulse" /> : <Target className="h-6 w-6 shrink-0 text-indigo-400" />}
          <span className="text-center">
            <strong className={isWarning ? "text-red-300 tracking-wide uppercase mr-2" : "text-indigo-300 tracking-wide uppercase mr-2"}>
              Stage {stage} Goal:
            </strong> 
            {goalText}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={togglePause}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md border border-white/10 transition"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button 
            onClick={triggerABTest}
            disabled={isPaused && abTestPosts !== null}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium rounded-md transition shadow-lg shadow-indigo-900/20"
          >
            A/B Test
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Mini-Metrics */}
        <div className="md:hidden flex p-4 bg-slate-900 border-b border-white/5 gap-4 overflow-x-auto shrink-0 hide-scrollbar">
          <MetricRow label="Total Actions/s" value={totalInteractionPsec.toLocaleString()} />
          <MetricRow label="Avg Comm/s" value={top6AvgDeltaComments.toFixed(1)} />
          <MetricRow label="Avg Truth" value={top6AvgTruth.toFixed(1)} />
        </div>

        {/* Left Panel: Metrics & Weights */}
        <div className="w-80 border-r border-white/5 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-y-auto hidden md:flex">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">Live Platform Metrics</h2>
            <div className="space-y-4">
              <MetricRow label="Total Actions / sec" value={totalInteractionPsec.toLocaleString()} />
              <MetricRow label="Top 6 Avg Comm / sec" value={top6AvgDeltaComments.toFixed(1)} />
              <MetricRow label="Top 6 High Truth Posts" value={`${top6TruthAbove70Count}/6`} />
              <MetricRow label="Top 6 Avg Truth" value={top6AvgTruth.toFixed(1)} />
            </div>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">Hidden Algorithm Weights</h2>
            <div className="space-y-4">
              <WeightBar label="Like" value={weights.like} color="bg-pink-500" />
              <WeightBar label="Comment" value={weights.comment} color="bg-blue-500" />
              <WeightBar label="Share" value={weights.share} color="bg-green-500" />
              <WeightBar label="Truth" value={weights.truth} color="bg-amber-500" />
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Weights update implicitly when you run A/B tests. You cannot edit them manually.
            </p>
          </div>
        </div>

        {/* Right Panel: Top 6 Feed */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-950">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg font-medium text-slate-300 mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Viral Feed (Top 6)
            </h2>
            
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {top6.map((post, i) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    key={post.id}
                    className="bg-slate-900 border border-white/10 rounded-xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-slate-700 w-6">#{i + 1}</span>
                        <p className="text-slate-200 font-medium text-lg leading-snug">{post.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                      <StatBlock icon={<ThumbsUp className="w-4 h-4" />} total={post.likes} delta={post.delta_likes} color="text-pink-400" />
                      <StatBlock icon={<MessageSquare className="w-4 h-4" />} total={post.comments} delta={post.delta_comments} color="text-blue-400" />
                      <StatBlock icon={<Share2 className="w-4 h-4" />} total={post.shares} delta={post.delta_shares} color="text-green-400" />
                      
                      <div className="ml-auto text-xs text-slate-500 font-mono flex items-center gap-2">
                        {post.comments_pool[Math.floor((time / 2) % post.comments_pool.length)] /* Random comment cycling simulation */}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* A/B Test Modal */}
      <AnimatePresence>
        {abTestPosts && (
          <ABTestModal 
            postA={abTestPosts[0]} 
            postB={abTestPosts[1]} 
            onChoose={handleABChoice} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponents

function MetricRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200 font-medium">{value}</span>
    </div>
  );
}

function WeightBar({ label, value, color }: { label: string, value: number, color: string }) {
  const percentage = (value * 100).toFixed(1);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-slate-400">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatBlock({ icon, total, delta, color }: { icon: React.ReactNode, total: number, delta: number, color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("opacity-70", color)}>{icon}</span>
      <span className="font-mono text-sm text-slate-300">
        {total > 1000 ? (total/1000).toFixed(1) + 'k' : total}
      </span>
      {delta > 0 && (
        <span className={cn("text-xs font-mono font-medium ml-1", color)}>
          +{delta > 1000 ? (delta/1000).toFixed(1) + 'k' : delta}/s
        </span>
      )}
    </div>
  );
}

function ABTestModal({ postA, postB, onChoose }: { postA: PostState, postB: PostState, onChoose: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-800 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Algorithm Training Required</h2>
          <p className="text-slate-400">The platform needs your intuition. Which post should receive more traffic?</p>
        </div>
        
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
          <ABPostCard post={postA} onSelect={() => onChoose(postA.id)} label="Option A" />
          <ABPostCard post={postB} onSelect={() => onChoose(postB.id)} label="Option B" />
        </div>
      </motion.div>
    </div>
  );
}

function ABPostCard({ post, onSelect, label }: { post: PostState, onSelect: () => void, label: string }) {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col hover:bg-slate-800/30 transition-colors">
      <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{label}</div>
      <div className="text-xl font-medium text-slate-200 mb-6 leading-relaxed flex-1">
        "{post.content}"
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-950 p-2 rounded flex flex-col items-center justify-center border border-slate-800">
            <ThumbsUp className="w-4 h-4 text-slate-500 mb-1" />
            <span className="font-mono text-sm text-slate-300">{post.likes}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded flex flex-col items-center justify-center border border-slate-800">
            <MessageSquare className="w-4 h-4 text-slate-500 mb-1" />
            <span className="font-mono text-sm text-slate-300">{post.comments}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded flex flex-col items-center justify-center border border-slate-800">
            <Share2 className="w-4 h-4 text-slate-500 mb-1" />
            <span className="font-mono text-sm text-slate-300">{post.shares}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={onSelect}
        className="w-full py-4 rounded-xl font-semibold transition-all bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700 hover:border-indigo-500 active:scale-95"
      >
        Promote This Content
      </button>
    </div>
  );
}


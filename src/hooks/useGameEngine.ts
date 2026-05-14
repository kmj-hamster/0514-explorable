import { useState, useEffect } from 'react';
import { PostState, Weights, StagePhase } from '../types';
import { INITIAL_POSTS } from '../data/posts';

export function useGameEngine() {
  const [posts, setPosts] = useState<PostState[]>([]);
  const [weights, setWeights] = useState<Weights>({
    like: 0.25,
    comment: 0.25,
    share: 0.25,
    truth: 0.25,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0); // in seconds
  const [stage, setStage] = useState<StagePhase>(1);
  const [totalInteractionPsec, setTotalInteractionPsec] = useState(0);
  const [abTestPosts, setAbTestPosts] = useState<[PostState, PostState] | null>(null);

  // Initialize
  useEffect(() => {
    const truthMultiplier = 10;
    const initial = INITIAL_POSTS.map(p => {
      const likes = Math.floor(Math.random() * 10);
      const comments = Math.floor(Math.random() * 2);
      const shares = Math.floor(Math.random() * 5);
      const rank_score = 
        (0.25 * likes) + 
        (0.25 * comments) + 
        (0.25 * shares) + 
        (0.25 * p.base_truth * truthMultiplier);

      return {
        ...p,
        likes,
        comments,
        shares,
        age: 0,
        rank_score,
        delta_likes: 0,
        delta_comments: 0,
        delta_shares: 0,
      };
    });
    setPosts(initial);
  }, []);

  // Timer & Loop
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTime(t => t + 1);
      
      setPosts(currentPosts => {
        // Calculate ranks to determine visibility
        const ranked = [...currentPosts].sort((a, b) => b.rank_score - a.rank_score);
        const top6Ids = ranked.slice(0, 6).map(p => p.id);
        const top1Id = ranked[0]?.id;

        let totalInteractionsThisTick = 0;

        const nextPosts = currentPosts.map(post => {
          const newAge = post.age + 1;
          const decay = 1 / (1 + 0.05 * newAge);
          
          let visibility = 1.0;
          if (post.id === top1Id) visibility = 3.0;
          else if (top6Ids.includes(post.id)) visibility = 2.0;

          const rand = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
          const targetDeltaLikes = post.viral_potential * decay * visibility * rand;
          
          const dLikes = Math.round(targetDeltaLikes); 
          const dComments = Math.round(dLikes * 0.2);
          const dShares = Math.round(dLikes * 0.05);

          totalInteractionsThisTick += (dLikes + dComments + dShares);

          const newLikes = post.likes + dLikes;
          const newComments = post.comments + dComments;
          const newShares = post.shares + dShares;

          // Note: we multiply truth by 10 so it remains competitive with likes
          const truthMultiplier = 10; 
          const newRankScore = 
            (weights.like * newLikes) + 
            (weights.comment * newComments) + 
            (weights.share * newShares) + 
            (weights.truth * post.base_truth * truthMultiplier);

          return {
            ...post,
            age: newAge,
            likes: newLikes,
            comments: newComments,
            shares: newShares,
            delta_likes: dLikes,
            delta_comments: dComments,
            delta_shares: dShares,
            rank_score: newRankScore,
          };
        });
        
        setTotalInteractionPsec(totalInteractionsThisTick);
        return nextPosts;
      });

    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, weights]);

  // Stage updates
  useEffect(() => {
    if (time >= 120) setStage(3);
    else if (time >= 60) setStage(2);
    else setStage(1);
  }, [time]);

  const triggerABTest = () => {
    setIsPaused(true);
    // Pick two random posts from top 10
    const topPosts = [...posts].sort((a,b)=>b.rank_score - a.rank_score).slice(0, 10);
    
    if (topPosts.length < 2) return;
    
    // pick 2 distinct
    const aResult = topPosts[Math.floor(Math.random() * topPosts.length)];
    const others = topPosts.filter(p => p.id !== aResult.id);
    const bResult = others[Math.floor(Math.random() * others.length)];
    setAbTestPosts([aResult, bResult]);
  };

  const handleABChoice = (chosenId: string) => {
    if (!abTestPosts) return;
    const [postA, postB] = abTestPosts;
    const chosen = chosenId === postA.id ? postA : postB;
    const rejected = chosenId === postA.id ? postB : postA;

    const alpha = 0.3; // Learning rate
    
    // Calculate new weights
    const newWeights = { ...weights };
    
    const calcDelta = (cX: number, rX: number) => {
      const max = Math.max(cX, rX, 1);
      return alpha * ((cX - rX) / max);
    };

    newWeights.like = Math.max(0.01, weights.like + calcDelta(chosen.likes, rejected.likes));
    newWeights.comment = Math.max(0.01, weights.comment + calcDelta(chosen.comments, rejected.comments));
    newWeights.share = Math.max(0.01, weights.share + calcDelta(chosen.shares, rejected.shares));
    newWeights.truth = Math.max(0.01, weights.truth + calcDelta(chosen.base_truth, rejected.base_truth));

    const total = newWeights.like + newWeights.comment + newWeights.share + newWeights.truth;
    
    const normalized = {
      like: newWeights.like / total,
      comment: newWeights.comment / total,
      share: newWeights.share / total,
      truth: newWeights.truth / total,
    };

    setWeights(normalized);
    // Re-calc rank instantly
    const truthMultiplier = 10;
    setPosts(prev => prev.map(post => ({
      ...post,
      rank_score: 
            (normalized.like * post.likes) + 
            (normalized.comment * post.comments) + 
            (normalized.share * post.shares) + 
            (normalized.truth * post.base_truth * truthMultiplier)
    })));

    setAbTestPosts(null);
    setIsPaused(false);
  };

  const togglePause = () => setIsPaused(p => !p);

  return {
    posts: [...posts].sort((a,b) => b.rank_score - a.rank_score),
    time,
    stage,
    isPaused,
    weights,
    triggerABTest,
    handleABChoice,
    abTestPosts,
    totalInteractionPsec,
    togglePause,
  };
}

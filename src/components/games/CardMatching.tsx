import React, { useState, useEffect } from "react";
import { playClickSound, playSuccessSound, playMistakeSound } from "../../lib/audio";
import { GameDifficulty } from "../../types";

interface Props {
  difficulty: GameDifficulty;
  onComplete: (stats: { score: number; mistakes: number; accuracy: number; timeSpent: number }) => void;
}

interface CardItem {
  id: number;
  pairId: number;
  emoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS_POOL = [
  { emoji: "🍎", name: "Apple" },
  { emoji: "🌻", name: "Sunflower" },
  { emoji: "🐘", name: "Elephant" },
  { emoji: "🕊️", name: "Dove" },
  { emoji: "🍉", name: "Watermelon" },
  { emoji: "🔔", name: "Bell" },
  { emoji: "⛵", name: "Boat" },
  { emoji: "🏡", name: "Home" },
];

export const CardMatching: React.FC<Props> = ({ difficulty, onComplete }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [matches, setMatches] = useState(0);
  const [totalPairs, setTotalPairs] = useState(3);
  const [startTime] = useState<number>(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const pairsCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 6 : 8;
    setTotalPairs(pairsCount);

    const selectedPool = ICONS_POOL.slice(0, pairsCount);
    const deck: CardItem[] = [];

    selectedPool.forEach((item, index) => {
      deck.push({
        id: index * 2,
        pairId: index,
        emoji: item.emoji,
        name: item.name,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        id: index * 2 + 1,
        pairId: index,
        emoji: item.emoji,
        name: item.name,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
  }, [difficulty]);

  const handleCardClick = (index: number) => {
    if (isProcessing || cards[index].isFlipped || cards[index].isMatched) return;

    playClickSound();

    const newFlipped = [...flippedIndices, index];
    const updatedCards = cards.map((card, i) => (i === index ? { ...card, isFlipped: true } : card));
    setCards(updatedCards);
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = updatedCards[firstIdx];
      const secondCard = updatedCards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // Matched!
        setTimeout(() => {
          playSuccessSound();
          const matchedCards = updatedCards.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setFlippedIndices([]);
          setIsProcessing(false);
          const newMatches = matches + 1;
          setMatches(newMatches);

          if (newMatches === totalPairs) {
            const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            const totalAttempts = totalPairs + mistakes;
            const accuracy = Math.round((totalPairs / Math.max(totalPairs, totalAttempts)) * 100);
            const score = Math.max(60, Math.round(100 - mistakes * 4 - Math.floor(timeSpent / 5)));
            onComplete({ score, mistakes, accuracy, timeSpent });
          }
        }, 500);
      } else {
        // Mismatch!
        setMistakes((prev) => prev + 1);
        setTimeout(() => {
          playMistakeSound();
          const resetCards = updatedCards.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setFlippedIndices([]);
          setIsProcessing(false);
        }, 900);
      }
    }
  };

  const gridCols = totalPairs === 3 ? "grid-cols-3" : totalPairs === 6 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4";

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-slate-700">
        <span className="text-lg font-medium">Pairs: <strong className="text-emerald-700">{matches} / {totalPairs}</strong></span>
        <span className="text-lg font-medium">Mistakes: <strong className="text-amber-700">{mistakes}</strong></span>
      </div>

      <div className={`grid ${gridCols} gap-3 w-full`}>
        {cards.map((card, idx) => (
          <button
            key={card.id}
            id={`card-matching-btn-${idx}`}
            onClick={() => handleCardClick(idx)}
            disabled={card.isMatched || isProcessing}
            className={`h-24 sm:h-28 rounded-2xl border-2 text-4xl sm:text-5xl flex flex-col items-center justify-center transition-all duration-300 shadow-sm ${
              card.isMatched
                ? "bg-emerald-100 border-emerald-500 opacity-60 cursor-default scale-95"
                : card.isFlipped
                ? "bg-white border-blue-600 shadow-md scale-100"
                : "bg-gradient-to-b from-blue-50 to-blue-100 border-blue-300 hover:border-blue-500 hover:scale-[1.02] cursor-pointer"
            }`}
          >
            {card.isFlipped || card.isMatched ? (
              <span>{card.emoji}</span>
            ) : (
              <span className="text-blue-400 text-3xl font-bold">?</span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-4 text-base text-slate-500 text-center">
        Tap two cards to find their matching pairs. Take your time!
      </p>
    </div>
  );
};

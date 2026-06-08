// utils/pokerLogic.js

const suits = ['♠', '♣', '♥', '♦'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDeck = () => {
  const deck = [];
  for (let s of suits) {
    for (let i = 0; i < ranks.length; i++) {
      deck.push({
        suit: s,
        rank: ranks[i],
        value: i + 2, // 2 is 2, A is 14
        id: `${s}${ranks[i]}`
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck) => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Returns an object with hand rank info and payout multiplier
// Multipliers:
// High Card: 0
// Pair: 1.5
// Two Pair: 2
// Triple: 3
// Straight: 5
// Flush: 7
// Full House: 10
// Four Card: 15
// Straight Flush: 50
// Royal Straight Flush: 100
export const evaluateHand = (hand) => {
  const sorted = [...hand].sort((a, b) => a.value - b.value);
  const isFlush = sorted.every(c => c.suit === sorted[0].suit);
  
  // Check for straight (handle A,2,3,4,5 as special case)
  let isStraight = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1].value - sorted[i].value !== 1) {
      isStraight = false;
      break;
    }
  }
  
  // Special case A, 2, 3, 4, 5
  if (!isStraight && sorted[0].value === 2 && sorted[1].value === 3 && sorted[2].value === 4 && sorted[3].value === 5 && sorted[4].value === 14) {
    isStraight = true;
  }
  
  const isRoyal = isStraight && sorted[0].value === 10 && sorted[4].value === 14;

  const counts = {};
  sorted.forEach(c => {
    counts[c.value] = (counts[c.value] || 0) + 1;
  });
  const frequencies = Object.values(counts).sort((a, b) => b - a);

  const isFourCard = frequencies[0] === 4;
  const isFullHouse = frequencies[0] === 3 && frequencies[1] === 2;
  const isTriple = frequencies[0] === 3;
  const isTwoPair = frequencies[0] === 2 && frequencies[1] === 2;
  const isPair = frequencies[0] === 2;

  // Helper: find original indices of cards matching given values
  const findIndices = (targetValues) => {
    const indices = [];
    hand.forEach((card, idx) => {
      if (targetValues.includes(card.value)) indices.push(idx);
    });
    return indices;
  };

  // Find values with specific count
  const valuesWithCount = (count) => {
    return Object.entries(counts)
      .filter(([, c]) => c === count)
      .map(([v]) => Number(v));
  };

  const allIndices = [0, 1, 2, 3, 4];

  if (isRoyal && isFlush) return { name: '로얄 스트레이트 플러쉬', multiplier: 100, indices: allIndices };
  if (isStraight && isFlush) return { name: '스트레이트 플러쉬', multiplier: 50, indices: allIndices };
  if (isFourCard) return { name: '포카드', multiplier: 15, indices: findIndices(valuesWithCount(4)) };
  if (isFullHouse) return { name: '풀 하우스', multiplier: 10, indices: allIndices };
  if (isFlush) return { name: '플러쉬', multiplier: 7, indices: allIndices };
  if (isStraight) return { name: '스트레이트', multiplier: 5, indices: allIndices };
  if (isTriple) return { name: '트리플', multiplier: 3, indices: findIndices(valuesWithCount(3)) };
  if (isTwoPair) return { name: '투페어', multiplier: 2, indices: findIndices(valuesWithCount(2)) };
  if (isPair) return { name: '페어', multiplier: 1.5, indices: findIndices(valuesWithCount(2)) };
  
  return { name: '하이카드', multiplier: 0, indices: [] };
};

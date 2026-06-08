import React, { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { createDeck, shuffleDeck, evaluateHand } from './utils/pokerLogic';

const HAND_RANKINGS = [
  { name: '로얄 스트레이트 플러쉬', multiplier: 100 },
  { name: '스트레이트 플러쉬', multiplier: 50 },
  { name: '포카드', multiplier: 15 },
  { name: '풀 하우스', multiplier: 10 },
  { name: '플러쉬', multiplier: 7 },
  { name: '스트레이트', multiplier: 5 },
  { name: '트리플', multiplier: 3 },
  { name: '투페어', multiplier: 2 },
  { name: '원페어', multiplier: 1.5 },
  { name: '하이카드', multiplier: 0 },
];

function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) { }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) { }
  }, [key, state]);

  return [state, setState];
}

function App() {
  const BASE_MONEY = 500;
  const [money, setMoney] = useLocalStorageState('rp_money', BASE_MONEY);
  const [playCount, setPlayCount] = useLocalStorageState('rp_playCount', 0);
  const [highScore, setHighScore] = useLocalStorageState('pokerHighScore', 0);
  const [maxMoney, setMaxMoney] = useLocalStorageState('rp_maxMoney', 100);

  const [gameState, setGameState] = useLocalStorageState('rp_gameState', 'IDLE');
  const [deck, setDeck] = useLocalStorageState('rp_deck', []);
  const [hand, setHand] = useLocalStorageState('rp_hand', []);

  const [selectedCards, setSelectedCards] = useLocalStorageState('rp_selectedCards', []);
  const [mulliganCount, setMulliganCount] = useLocalStorageState('rp_mulliganCount', 0);
  const [lastResult, setLastResult] = useLocalStorageState('rp_lastResult', null);

  const activePlayCount = (gameState === 'DEAL' || lastResult) ? playCount - 1 : playCount;
  const bet = 100 + Math.floor(Math.max(0, activePlayCount) / 5) * 20;
  const exchangeCost = Math.floor(bet / 2);
  const [flippedCards, setFlippedCards] = useState([true, true, true, true, true]);

  const [enableAnimation, setEnableAnimation] = useLocalStorageState('rp_enableAnimation', true);
  const [showRules, setShowRules] = useState(false);
  const dealTimeRef = useRef(0);

  const [buttonFeedback, setButtonFeedback] = useState(null);
  const feedbackTimeoutRef = useRef(null);

  const showButtonFeedback = (msg) => {
    setButtonFeedback(msg);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setButtonFeedback(null);
    }, 1000);
  };

  useEffect(() => {
    if (money > maxMoney) {
      setMaxMoney(money);
      if (money > highScore) setHighScore(money);
    }
  }, [money, maxMoney, highScore, setHighScore, setMaxMoney]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showRules) return;
      const key = e.key.toLowerCase();

      if (key === ' ' || e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        handleSpaceClick();
        return;
      }

      if (gameState === 'DEAL' && ['1', '2', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        const idx = parseInt(key) - 1;
        toggleCardSelection(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showRules, mulliganCount, selectedCards, money]);

  const currentHandResult = useMemo(() => {
    if (hand.length === 5) return evaluateHand(hand);
    return null;
  }, [hand]);

  const startGame = () => {
    if (money < bet) {
      showButtonFeedback('NO MONEY');
      return;
    }
    setMoney((prev) => prev - bet);
    setPlayCount((prev) => prev + 1);

    const newDeck = shuffleDeck(createDeck());
    const newHand = newDeck.splice(0, 5);

    setDeck(newDeck);
    setHand(newHand);
    setGameState('DEAL');
    setMulliganCount(0);
    setSelectedCards([]);
    setLastResult(null);
    setFlippedCards([false, false, false, false, false]);
    dealTimeRef.current = Date.now();

    if (enableAnimation) {
      setTimeout(() => {
        setFlippedCards([true, true, true, true, true]);
      }, 500);
    } else {
      setFlippedCards([true, true, true, true, true]);
    }
  };

  const toggleCardSelection = (index) => {
    if (gameState !== 'DEAL') return;
    if (mulliganCount >= 2) {
      showButtonFeedback('NO SPIN');
      return;
    }
    setSelectedCards((prev) =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const redrawCards = () => {
    if (selectedCards.length === 0) return;
    if (mulliganCount >= 2) {
      showButtonFeedback('NO SPIN');
      return;
    }

    if (money < exchangeCost) {
      showButtonFeedback('NO MONEY');
      setSelectedCards([]);
      return;
    }

    setMoney((prev) => prev - exchangeCost);
    setMulliganCount((prev) => prev + 1);

    const newHand = [...hand];
    const newDeck = [...deck];
    const newFlipped = [...flippedCards];

    selectedCards.forEach(idx => {
      newHand[idx] = newDeck.pop();
      newFlipped[idx] = false;
    });

    setHand(newHand);
    setDeck(newDeck);
    setFlippedCards(newFlipped);
    setSelectedCards([]);

    if (enableAnimation) {
      setTimeout(() => {
        setFlippedCards([true, true, true, true, true]);
      }, 500);
    } else {
      setFlippedCards([true, true, true, true, true]);
    }
  };

  const showResult = () => {
    if (gameState !== 'DEAL') return;
    const result = evaluateHand(hand);
    setLastResult(result);

    let newMoney = money;
    if (result.multiplier > 0) {
      const winnings = Math.floor(bet * result.multiplier);
      newMoney = money + winnings;
      setMoney(newMoney);
    }

    const nextBet = 100 + Math.floor(playCount / 5) * 20;
    if (newMoney < nextBet) {
      setGameState('GAMEOVER');
    } else {
      setGameState('IDLE');
    }
  };

  const handleSpaceClick = () => {
    if (enableAnimation && Date.now() - dealTimeRef.current < 600) return; // Prevent double taps only if animating

    if (gameState === 'DEAL') {
      if (selectedCards.length > 0) redrawCards();
      else showResult();
    } else if (gameState === 'IDLE') {
      if (money < bet && lastResult) {
        setMoney(BASE_MONEY); // Fallback
        setLastResult(null);
      } else {
        startGame();
      }
    } else if (gameState === 'GAMEOVER') {
      restartGame();
    }
  };

  const restartGame = () => {
    setMoney(BASE_MONEY);
    setPlayCount(0);
    setGameState('IDLE');
    setDeck([]);
    setHand([]);
    setSelectedCards([]);
    setMulliganCount(0);
    setLastResult(null);
    setMaxMoney(BASE_MONEY);
  };

  return (
    <div className={`app-container ${enableAnimation ? '' : 'no-animation'}`}>
      <main className="game-board">
        <button
          className="option-btn-top"
          onClick={(e) => { e.stopPropagation(); setShowRules(true); }}
          title="설정"
        >
          ⚙️
        </button>

        {gameState === 'IDLE' && !lastResult && (
          <div className="start-screen" onClick={startGame}>
            <div className="start-content">
              <h1>GAME START</h1>
              <p>클릭 또는 스페이스를 눌러 게임 시작</p>
            </div>
          </div>
        )}

        {((gameState === 'DEAL') || (gameState === 'IDLE' && lastResult) || gameState === 'GAMEOVER') && (
          <>
            <div className="board-top">
              {((gameState === 'IDLE' && lastResult) || (gameState === 'DEAL' && currentHandResult && currentHandResult.name !== '하이카드')) && (
                <div className="hand-name-pill">
                  {lastResult ? lastResult.name : currentHandResult.name}
                  {lastResult && lastResult.multiplier > 0 ? ` (+${Math.floor(bet * lastResult.multiplier)})` : ''}
                </div>
              )}
              {gameState === 'GAMEOVER' && (
                <div className="hand-name-pill" style={{ marginLeft: '10px', background: '#ef4444', color: 'white' }}>
                  GAME OVER
                </div>
              )}
            </div>

            <div className="cards-container">
              {hand.map((card, idx) => {
                const isSelected = selectedCards.includes(idx);
                const isFlipped = flippedCards[idx];
                const isContributing = (lastResult || (gameState === 'DEAL' && currentHandResult))
                  ? (lastResult ? lastResult.indices.includes(idx) : currentHandResult.indices.includes(idx))
                  : false;

                return (
                  <div
                    key={card.id + idx}
                    className={`card-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCardSelection(idx)}
                  >
                    <div className={`card ${isFlipped ? 'flipped' : ''}`}>
                      <div className="card-face card-back"></div>
                      <div className={`card-face card-front ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'} ${isContributing && isFlipped ? 'contributing' : ''}`}>
                        <div className="card-top">{card.suit} {card.rank}</div>
                        <div className="card-center">{card.suit}</div>
                        <div className="card-bottom">{card.suit} {card.rank}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="controls-row">
              <div className="pill-box left-pill">
                <span className="pill-label">베팅액: </span>
                <span className="pill-value">{bet}</span>
              </div>

              <div className="action-buttons" style={{ display: 'flex', gap: '10px' }}>
                {gameState === 'DEAL' && (
                  <button
                    className="space-btn"
                    style={{
                      background: buttonFeedback ? '#f97316' : '#10b981',
                      fontSize: '1.2rem',
                      padding: '10px 40px',
                      transition: 'background-color 0.2s ease',
                      textTransform: 'uppercase'
                    }}
                    onClick={handleSpaceClick}
                  >
                    {buttonFeedback || 'SPACE'}
                  </button>
                )}
                {gameState === 'IDLE' && lastResult && (
                  <button
                    className="space-btn"
                    style={{
                      background: buttonFeedback ? '#f97316' : '#10b981',
                      fontSize: '1.2rem',
                      padding: '10px 40px',
                      transition: 'background-color 0.2s ease',
                      textTransform: 'uppercase'
                    }}
                    onClick={handleSpaceClick}
                  >
                    {buttonFeedback || 'NEXT'}
                  </button>
                )}
                {gameState === 'GAMEOVER' && (
                  <button className="space-btn" style={{ background: '#ef4444', fontSize: '1.2rem', padding: '10px 40px' }} onClick={restartGame}>
                    다시 하기
                  </button>
                )}
              </div>

              <div className="pill-box right-pill">
                <span className="pill-label">보유액: </span>
                <span className="pill-value">{money}</span>
              </div>
            </div>
          </>
        )}
      </main>

      {showRules && (
        <div className="rules-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowRules(false)}>X</button>
            <div className="rules-content">
              <h3>설정 (OPTION)</h3>
              <div style={{ marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  <input
                    type="checkbox"
                    checked={enableAnimation}
                    onChange={(e) => setEnableAnimation(e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>애니메이션 활성화 (카드 뒤집기 효과 등)</span>
                </label>
              </div>

              <h3>족보 설명</h3>
              <div className="rankings-list-simple">
                {HAND_RANKINGS.filter(r => r.multiplier > 0).map(r => (
                  <div key={r.name}>{r.name}: {r.multiplier}배</div>
                ))}
              </div>
              <p style={{ marginTop: '20px', fontSize: '0.9rem', marginBottom: '4px' }}>1회 교체 비용: 베팅액의 50% ({exchangeCost}원)</p>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>베팅 시스템: 100원 시작, 5판마다 20원씩 증가 (현재 {playCount}판 플레이 완료)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

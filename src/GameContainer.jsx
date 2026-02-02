import { useEffect, useRef, useState } from 'react';
import { startGame } from './game/main';
import { EventBus } from './EventBus';
import LeaderboardOverlay from './components/LeaderboardOverlay';

const GameContainer = () => {
    const gameRef = useRef(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [finalScore, setFinalScore] = useState(0);

    useEffect(() => {
        const game = startGame('game-container');
        gameRef.current = game;

        // Listen for game-over from Phaser
        EventBus.on('game-over', (data) => {
            setFinalScore(data.score);
            setShowLeaderboard(true);
        });

        // Listen for direct leaderboard access (from Pause menu)
        EventBus.on('show-leaderboard', (data) => {
            setFinalScore(data.score || 0);
            setShowLeaderboard(true);
        });

        return () => {
            EventBus.removeListener('game-over');
            EventBus.removeListener('show-leaderboard');
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    const handleRestart = () => {
        setShowLeaderboard(false);
        if (gameRef.current) {
            // Trigger restart in the active scene
            const scene = gameRef.current.scene.getScene('MainScene');
            if (scene) scene.restartGame();
        }
    };

    const handleCloseLeaderboard = () => {
        setShowLeaderboard(false);
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div id="game-container" style={{ width: '100%', height: '100%' }}></div>
            {showLeaderboard && (
                <LeaderboardOverlay
                    score={finalScore}
                    onRestart={handleRestart}
                    onClose={handleCloseLeaderboard}
                />
            )}
        </div>
    );
};

export default GameContainer;

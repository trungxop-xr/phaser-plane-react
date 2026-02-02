import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../services/LeaderboardService';

const LeaderboardOverlay = ({ score, onRestart, onClose }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(localStorage.getItem('playerName') || '');
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        fetchScores();
    }, []);

    const fetchScores = async () => {
        setLoading(true);
        try {
            const topScores = await leaderboardService.getTopScores(10);
            setScores(topScores);
            setError(null);
        } catch (err) {
            setError("Failed to load leaderboard.");
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async (e) => {
        e.preventDefault();
        setValidationError('');

        const trimmedName = newName.trim();

        // Validation: Length
        if (trimmedName.length === 0 || trimmedName.length > 50) {
            setValidationError('Name must be 1-50 characters.');
            return;
        }

        // Validation: Alphanumeric only
        const alphanumericRegex = /^[a-z0-9]+$/i;
        if (!alphanumericRegex.test(trimmedName)) {
            setValidationError('Only letters and numbers allowed.');
            return;
        }

        setLoading(true);
        try {
            const playerId = localStorage.getItem('playerId');
            if (!playerId) throw new Error("No Player ID found.");

            // Check uniqueness
            const taken = await leaderboardService.isNameTaken(trimmedName, playerId);
            if (taken) {
                setValidationError('This name is already taken.');
                setLoading(false);
                return;
            }

            await leaderboardService.updatePlayerName(playerId, trimmedName);
            localStorage.setItem('playerName', trimmedName);
            setIsRenaming(false);
            await fetchScores();
        } catch (err) {
            setError("Failed to update name.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                <h1 style={styles.title}>LEADERBOARD</h1>

                {!isRenaming ? (
                    <div style={styles.nameHeader}>
                        <p style={styles.playerName}>PILOT: {localStorage.getItem('playerName') || 'New Pilot'}</p>
                        <button onClick={() => setIsRenaming(true)} style={styles.editBtn}>EDIT NAME</button>
                    </div>
                ) : (
                    <form onSubmit={handleRename} style={styles.form}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={styles.input}
                            placeholder="ALPHANUMERIC ONLY"
                            maxLength={50}
                            autoFocus
                        />
                        <div style={styles.formActions}>
                            <button type="submit" disabled={loading} style={styles.saveBtn}>SAVE</button>
                            <button type="button" onClick={() => setIsRenaming(false)} style={styles.cancelBtn}>CANCEL</button>
                        </div>
                    </form>
                )}

                {validationError && <p style={styles.valError}>{validationError}</p>}
                <p style={styles.currentScore}>SCORE: {score.toLocaleString()}</p>

                {error && <p style={styles.error}>{error}</p>}

                <div style={styles.listContainer}>
                    {loading ? (
                        <p style={styles.loading}>REFRESHING...</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>RANK</th>
                                    <th style={styles.th}>NAME</th>
                                    <th style={styles.th}>SCORE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map((s, index) => (
                                    <tr key={s.id} style={index === 0 ? styles.topRank : {}}>
                                        <td style={styles.td}>#{index + 1}</td>
                                        <td style={styles.td}>{s.name}</td>
                                        <td style={styles.td}>{s.score.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {scores.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="3" style={styles.td}>No scores yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={styles.actions}>
                    <button onClick={onRestart} style={styles.actionBtn}>PLAY AGAIN</button>
                    <button onClick={onClose} style={styles.actionBtnSecondary}>CLOSE</button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
        fontFamily: "'Courier New', Courier, monospace"
    },
    container: {
        width: '90%', maxWidth: '500px', backgroundColor: '#1a1a1a', border: '4px solid #00FF00',
        padding: '30px', borderRadius: '15px', color: '#00FF00', textAlign: 'center',
        boxShadow: '0 0 20px #00FF00'
    },
    title: { fontSize: '32px', margin: '0 0 20px 0', textShadow: '2px 2px #000' },
    nameHeader: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '15px' },
    playerName: { fontSize: '20px', color: '#FFF44F', margin: 0 },
    editBtn: { backgroundColor: 'transparent', border: '1px solid #00FF00', color: '#00FF00', fontSize: '10px', cursor: 'pointer', padding: '2px 5px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', alignItems: 'center' },
    input: { padding: '8px', width: '250px', backgroundColor: '#000', border: '2px solid #00FF00', color: '#00FF00', textAlign: 'center' },
    formActions: { display: 'flex', gap: '10px' },
    saveBtn: { backgroundColor: '#00FF00', color: '#000', border: 'none', padding: '5px 15px', fontWeight: 'bold', cursor: 'pointer' },
    cancelBtn: { backgroundColor: '#444', color: '#fff', border: 'none', padding: '5px 15px', cursor: 'pointer' },
    valError: { color: '#FF4444', fontSize: '14px', marginBottom: '10px' },
    currentScore: { fontSize: '24px', color: '#FFF44F', marginBottom: '20px' },
    error: { color: '#FF4444', marginBottom: '10px' },
    listContainer: {
        maxHeight: '300px', overflowY: 'auto', marginBottom: '20px',
        border: '2px solid #333', backgroundColor: '#000'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px', borderBottom: '2px solid #00FF00', fontSize: '14px' },
    td: { padding: '10px', borderBottom: '1px solid #222', fontSize: '16px' },
    topRank: { backgroundColor: 'rgba(0, 255, 0, 0.1)', color: '#FFF44F' },
    loading: { padding: '20px' },
    actions: { display: 'flex', gap: '20px', justifyContent: 'center' },
    actionBtn: {
        padding: '12px 25px', backgroundColor: '#00FF00', color: '#000', border: 'none',
        fontWeight: 'bold', cursor: 'pointer', borderRadius: '5px'
    },
    actionBtnSecondary: {
        padding: '12px 25px', backgroundColor: 'transparent', color: '#00FF00', border: '2px solid #00FF00',
        fontWeight: 'bold', cursor: 'pointer', borderRadius: '5px'
    }
};

export default LeaderboardOverlay;

import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'user_progress';

export const progressService = {
    /**
     * Saves the level progress for a user.
     * @param {string} userId - The unique ID of the user.
     * @param {object} levelData - { levelNumber, highScore, totalCoins }
     */
    async saveLevelProgress(userId, levelData) {
        if (!userId) {
            console.warn('saveLevelProgress: No userId provided.');
            return;
        }

        try {
            const userDocRef = doc(db, COLLECTION_NAME, userId);
            const docSnap = await getDoc(userDocRef);

            const newEntry = {
                levelNumber: levelData.levelNumber,
                highScore: levelData.highScore,
                totalCoins: levelData.totalCoins,
                timestamp: new Date() // Use client date for simplistic array storage, or serverTimestamp if strict
            };

            if (!docSnap.exists()) {
                // Create new document if it doesn't exist
                await setDoc(userDocRef, {
                    levels: [newEntry],
                    lastUpdated: serverTimestamp()
                });
            } else {
                // Update existing document
                await updateDoc(userDocRef, {
                    levels: arrayUnion(newEntry),
                    lastUpdated: serverTimestamp()
                });
            }
            console.log('Level progress saved successfully:', newEntry);
        } catch (error) {
            console.error('Error saving level progress:', error);
        }
    },

    /**
     * Fetches the level history for a user.
     * @param {string} userId - The unique ID of the user.
     * @returns {Promise<Array>} - Array of level data objects.
     */
    async fetchLevelHistory(userId) {
        if (!userId) return [];
        try {
            const userDocRef = doc(db, COLLECTION_NAME, userId);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.levels || [];
            }
            return [];
        } catch (error) {
            console.error('Error fetching level history:', error);
            return [];
        }
    }
};

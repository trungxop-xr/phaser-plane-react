import { db } from "../firebase/firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    getCountFromServer
} from "firebase/firestore";

class LeaderboardService {
    constructor() {
        this.collectionName = "leaderboard";
    }

    /**
     * Submits a score. If the player already exists, updates only if new score is higher.
     */
    async submitScore(playerId, playerName, score) {
        try {
            const playerRef = doc(db, this.collectionName, playerId);
            const playerSnap = await getDoc(playerRef);

            if (playerSnap.exists()) {
                const existingData = playerSnap.data();
                if (score > existingData.score) {
                    await setDoc(playerRef, {
                        name: playerName,
                        score: score,
                        timestamp: serverTimestamp()
                    }, { merge: true });
                    console.log("Score updated!");
                    return true;
                } else {
                    console.log("Existing score is higher or equal.");
                    return false;
                }
            } else {
                await setDoc(playerRef, {
                    playerId: playerId,
                    name: playerName,
                    score: score,
                    timestamp: serverTimestamp()
                });
                console.log("New score record created!");
                return true;
            }
        } catch (error) {
            console.error("Error submitting score:", error);
            throw error;
        }
    }

    /**
     * Fetches the top N scores.
     */
    async getTopScores(limitCount = 10) {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy("score", "desc"),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            const scores = [];
            querySnapshot.forEach((doc) => {
                scores.push({ id: doc.id, ...doc.data() });
            });
            return scores;
        } catch (error) {
            console.error("Error fetching top scores:", error);
            throw error;
        }
    }

    /**
     * Gets the rank of a player globally.
     */
    async getPlayerRank(score) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where("score", ">", score)
            );
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count + 1; // Rank is (count of people above) + 1
        } catch (error) {
            console.error("Error getting player rank:", error);
            return null;
        }
    }

    /**
     * Checks if a name is already taken by another player.
     */
    async isNameTaken(name, excludePlayerId = null) {
        try {
            const q = excludePlayerId
                ? query(collection(db, this.collectionName), where("name", "==", name), where("playerId", "!=", excludePlayerId))
                : query(collection(db, this.collectionName), where("name", "==", name));

            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error("Error checking name uniqueness:", error);
            return false;
        }
    }

    /**
     * Updates the name for a specific player ID.
     */
    async updatePlayerName(playerId, newName) {
        try {
            const playerRef = doc(db, this.collectionName, playerId);
            await setDoc(playerRef, { name: newName }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating player name:", error);
            throw error;
        }
    }



}

export const leaderboardService = new LeaderboardService();


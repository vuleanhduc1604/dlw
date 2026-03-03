import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const SUBJECTS_COLLECTION = 'subjects';

/**
 * Save (create or overwrite) a session/subject for a user.
 * Doc ID is "{userId}::{sessionId}" for easy lookup.
 */
export async function saveSubject(userId, session) {
  const docId = `${userId}::${session.id}`;
  await setDoc(doc(db, SUBJECTS_COLLECTION, docId), {
    userId,
    ...session,
  });
}

/**
 * Load all saved subjects for a user, sorted by date descending.
 */
export async function loadSubjects(userId) {
  const q = query(
    collection(db, SUBJECTS_COLLECTION),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map((d) => {
    const data = d.data();
    const { userId: _uid, ...session } = data; // strip userId from returned session
    return session;
  });
  // Sort newest first client-side (avoids needing a Firestore composite index)
  return sessions.sort((a, b) => (b.date > a.date ? 1 : -1));
}

/**
 * Delete a subject by session ID.
 */
export async function deleteSubject(userId, sessionId) {
  const docId = `${userId}::${sessionId}`;
  await deleteDoc(doc(db, SUBJECTS_COLLECTION, docId));
}

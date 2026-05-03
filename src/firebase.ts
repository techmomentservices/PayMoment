
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  getDocFromServer, 
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
// Use the auto-generated Firebase configuration from the platform
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true 
}, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);

// Use local persistence by default
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence setup failed", err);
});

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Helper for initial connection test
export const testConnection = async () => {
  try {
    // Try to reach Firestore
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error: any) {
    console.warn("Initial Firestore connection check failed:", error.message);
  }
};

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function parseFirestoreError(error: any): string {
  if (typeof error === 'string') return error;
  const msg = error.message || String(error);
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error) {
      if (parsed.error.includes('Missing or insufficient permissions')) {
        return "Security Error: You don't have permission to perform this action.";
      }
      return parsed.error;
    }
  } catch (e) {
    // Not JSON
  }
  return msg;
}

export function parseAuthError(error: any): string {
  if (!error) return "An unknown authentication error occurred.";
  
  const rawMessage = (error.message || String(error)).toLowerCase();
  const errorCode = (error.code || '').toLowerCase();
  
  // Combine all strings to search for keywords
  const searchStr = `${errorCode} ${rawMessage}`;
  
  // High-priority credential check
  if (
    searchStr.includes('invalid-credential') || 
    searchStr.includes('invalid-credentials') ||
    searchStr.includes('wrong-password') || 
    searchStr.includes('user-not-found') ||
    searchStr.includes('auth/invalid-credential')
  ) {
    return "Incorrect email or password. Please check your credentials and try again.";
  }
  
  // Mapping for other specific errors
  const mappings: { [key: string]: string } = {
    'email-already-in-use': "This email is already registered. Please login or use a different email.",
    'invalid-email': "Please enter a valid email address.",
    'weak-password': "Your password is too weak. Please use at least 6 characters.",
    'operation-not-allowed': "This login method is currently disabled. Please contact support.",
    'popup-closed-by-user': "Sign-in popup was closed before completion.",
    'network-request-failed': "Connectivity error. If you're on a restricted network or using a mobile browser, try opening PayMoment in a new tab to bypass iframe security blocks.",
    'too-many-requests': "Too many failed attempts. Your account is temporarily locked for security. Please try again later.",
    'user-disabled': "This account has been disabled. Please contact PayMoment support.",
    'requires-recent-login': "For security reasons, please log in again to perform this sensitive action.",
    'account-exists-with-different-credential': "An account already exists with this email but using a different sign-in method (e.g., Google).",
    'unauthorized-domain': "This domain is not authorized for Firebase Authentication. Please use the 'Open in New Tab' button to use Google Login.",
  };

  for (const key in mappings) {
    if (searchStr.includes(key)) return mappings[key];
  }
  
  // Try to extract auth/code
  const match = rawMessage.match(/auth\/([a-z-]+)/);
  if (match && match[1]) {
    const extracted = match[1].replace(/-/g, ' ');
    return extracted.charAt(0).toUpperCase() + extracted.slice(1);
  }

  // Final fallback
  let finalMsg = error.message || String(error);
  // Remove "Firebase:" prefix more aggressively
  finalMsg = finalMsg.replace(/^Firebase: (Error )?(\([a-z/-]+\))?:?\s*/i, '');
  return finalMsg || "Authentication failed. Please try again.";
}

export const findUserByAccount = async (accountNumber: string) => {
  try {
    const q = query(collection(db, 'users'), where('accountNumber', '==', accountNumber));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { ...doc.data(), uid: doc.id };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
  return null;
};

export const findUserByUsername = async (username: string) => {
  try {
    const q = query(collection(db, 'users'), where('payMomentId', '==', username.startsWith('@') ? username : `@${username}`));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { ...doc.data(), uid: doc.id };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
  return null;
};

export const findSandboxAccount = async (accountNumber: string) => {
  try {
    const q = query(collection(db, 'sandbox_accounts'), where('accountNumber', '==', accountNumber));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sandbox_accounts');
  }
  return null;
};

export { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword };
export type { FirebaseUser };

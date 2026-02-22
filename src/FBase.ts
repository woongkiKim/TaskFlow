import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Firebase 콘솔에서 복사한 설정값으로 교체해주세요.
const firebaseConfig = {
  apiKey: "AIzaSyC2zrQlyapM6qPdAci4O5mW7g5fSCqrQbo",
  authDomain: "taskflow-kr.firebaseapp.com",
  projectId: "taskflow-kr",
  storageBucket: "taskflow-kr.firebasestorage.app",
  messagingSenderId: "72626832405",
  appId: "1:72626832405:web:952a835f3edb4fdd0dfa1c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
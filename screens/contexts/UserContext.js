// /contexts/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getUserProfile, updateUserProfileInDB, checkUsernameUniqueInDB } from '../../firebase';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  async function refreshUserProfile(uid) {
    const profile = await getUserProfile(uid);
    setUser(profile);
  }

  async function updateUserProfile(updates) {
    if (updates.username && !(await checkUsernameUniqueInDB(updates.username, user.uid))) {
      throw new Error('Username taken');
    }
    await updateUserProfileInDB(user.uid, updates);
    await refreshUserProfile(user.uid);
  }

  updateUserProfile.checkUsernameUnique = username =>
    checkUsernameUniqueInDB(username, user?.uid);

  // load user on login with useEffect...
  // e.g. useEffect(() => { if (authUser) refreshUserProfile(authUser.uid); }, [authUser]);
  // Where authUser comes from Firebase Auth

  return (
    <UserContext.Provider value={{ user, refreshUserProfile, updateUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}

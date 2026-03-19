"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface FollowRequest {
  requester_id: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface FollowRequestContextType {
  followRequests: FollowRequest[];
  removeRequest: (requesterId: string) => void;
}

const FollowRequestContext = createContext<FollowRequestContextType>({
  followRequests: [],
  removeRequest: () => {},
});

export function FollowRequestProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/follows/requests")
      .then(r => r.json())
      .then(d => setFollowRequests(d.requests || []));
  }, [isLoaded, user]);

  const removeRequest = useCallback((requesterId: string) => {
    setFollowRequests(prev => prev.filter(r => r.requester_id !== requesterId));
  }, []);

  return (
    <FollowRequestContext.Provider value={{ followRequests, removeRequest }}>
      {children}
    </FollowRequestContext.Provider>
  );
}

export function useFollowRequests() {
  return useContext(FollowRequestContext);
}

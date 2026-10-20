"use client";

import React, { useState, useEffect } from "react";
import { LoginCard } from "./login-card";
import { DashboardView } from "./dashboard-view";
import { Loader2 } from "lucide-react";

export function MoveApiApp() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("admin");

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        setUsername(data.username || "admin");
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: string) => {
    setAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs font-mono">MOVE API Engine...</span>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginCard onSuccess={handleLoginSuccess} />;
  }

  return <DashboardView username={username} onLogout={handleLogout} />;
}

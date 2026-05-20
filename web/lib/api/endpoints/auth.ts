import { api } from "../client";
import type { AuthResponse, HasUsersResponse, MeResponse } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, name: string, password: string) =>
    api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    }),
  hasUsers: () => api<HasUsersResponse>("/auth/has-users"),
  me: (token?: string) => api<MeResponse>("/auth/me", token ? { token } : {}),
};

import { api } from "../client";
import { hasUsersResponseSchema, validated } from "../contracts";
import type { HasUsersResponse } from "../types";

export const authApi = {
  hasUsers: () =>
    api<HasUsersResponse>("/auth/has-users", {}, validated(hasUsersResponseSchema)),
};

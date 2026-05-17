import { api } from "../client";
import type { ConnectionType } from "../types";

export const connectionTypesApi = {
  list: () => api<ConnectionType[]>("/connection-types"),
};

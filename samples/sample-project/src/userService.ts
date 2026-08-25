import { getUser, validateToken } from "./authService";

export function getProfile(token: string, userId: string) {
  if (!validateToken(token)) {
    throw new Error("Unauthorized");
  }
  return getUser(userId);
}

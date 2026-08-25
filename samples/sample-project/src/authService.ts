export function validateToken(token: string): boolean {
  return token === "valid-token";
}

export function getUser(userId: string) {
  return { id: userId, name: "Alice" };
}

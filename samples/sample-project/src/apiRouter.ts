import { getProfile } from "./userService";

export function handleUserRequest(req: any) {
  return getProfile(req.token, req.userId);
}

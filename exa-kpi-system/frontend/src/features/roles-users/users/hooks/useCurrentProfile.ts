import { useUser } from "./useUser";
import { CURRENT_USER_ID } from "../../mocks/roles-users.mock";
export const useCurrentProfile = () => useUser(CURRENT_USER_ID);

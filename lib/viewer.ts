import { redirect } from "next/navigation";
import { accountTier, currentUser } from "./data";

export async function requireViewer() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const tier = await accountTier(user.id);
  return { user, tier };
}

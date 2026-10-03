import { redirect } from "next/navigation";
import { tierFromSubscription } from "./access";
import { currentUser, getSubscription } from "./data";

export async function requireViewer() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const tier = tierFromSubscription(await getSubscription(user.id));
  return { user, tier };
}

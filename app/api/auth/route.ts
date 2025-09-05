import { cookies } from "next/headers";

type UserRecord = { id: string; email: string; username: string; role: "admin" | "user"; password: string };
const memoryDb: { users: UserRecord[] } = { users: [{ id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", username: "admin", role: "admin", password: "admin" }] };

async function setSessionCookie(user: UserRecord | null) {
  const store = await cookies();
  if (!user) {
    store.set("authenticated", "", { path: "/", maxAge: 0 });
    store.set("role", "", { path: "/", maxAge: 0 });
    store.set("email", "", { path: "/", maxAge: 0 });
    store.set("user_id", "", { path: "/", maxAge: 0 });
    return;
  }
  store.set("authenticated", "true", { path: "/" });
  store.set("role", user.role, { path: "/" });
  store.set("email", encodeURIComponent(user.email), { path: "/" });
  store.set("user_id", user.id, { path: "/" });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body as { action: "login" | "logout" | "signup" };
  if (action === "logout") {
    await setSessionCookie(null);
    return Response.json({ ok: true });
  }
  if (action === "login") {
    const { username, password } = body as { username: string; password: string };
    const user = memoryDb.users.find((u) => u.username === username && u.password === password);
    if (!user) return new Response("Invalid credentials", { status: 401 });
    await setSessionCookie(user);
    return Response.json({ id: user.id, email: user.email, role: user.role, username: user.username });
  }
  if (action === "signup") {
    const { email, username, password } = body as { email: string; username: string; password: string };
    if (!email || !username || !password) return new Response("Missing fields", { status: 400 });
    if (memoryDb.users.some((u) => u.username === username || u.email === email)) {
      return new Response("Already exists", { status: 409 });
    }
    const user: UserRecord = { id: crypto.randomUUID(), email, username, role: "user", password };
    memoryDb.users.push(user);
    await setSessionCookie(user);
    return Response.json({ id: user.id, email: user.email, role: user.role, username: user.username });
  }
  return new Response("Bad request", { status: 400 });
}

export async function GET() {
  const store = await cookies();
  const authenticated = store.get("authenticated")?.value === "true";
  const role = (store.get("role")?.value as "admin" | "user" | undefined) || null;
  const email = store.get("email")?.value ? decodeURIComponent(store.get("email")!.value) : null;
  // Be lenient here to avoid redirect loops; user_id is optional for auth state
  if (!authenticated || !role || !email) return Response.json({ isAuthenticated: false });
  const userId = store.get("user_id")?.value || null;
  return Response.json({ isAuthenticated: true, email, role, id: userId });
}



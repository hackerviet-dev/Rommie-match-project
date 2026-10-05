import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api-error";
import { authApi } from "../services/auth-api";
import { useAuthStore } from "../store/auth-store";
import { getLoginDestination } from "../utils/actor-home";

type GoogleSdk = { accounts: { id: {
  initialize: (options: { client_id: string; ux_mode: "popup"; auto_select: boolean; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number; locale: string }) => void;
} } };
let sdkPromise: Promise<GoogleSdk> | undefined;
function loadGoogleSdk() {
  const getSdk = () => {
    const sdk = (window as unknown as { google?: GoogleSdk }).google;
    return sdk?.accounts?.id ? sdk : undefined;
  };
  if (getSdk()) return Promise.resolve(getSdk()!);
  if (!sdkPromise) sdkPromise = new Promise<GoogleSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=vi";
    script.async = true;
    script.onload = () => { const sdk = getSdk(); if (sdk) resolve(sdk); else reject(new Error("Không tải được Google.")); };
    script.onerror = () => { script.remove(); sdkPromise = undefined; reject(new Error("Không tải được Google. Kiểm tra kết nối hoặc trình chặn nội dung.")); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function GoogleSignIn() {
  const config = useQuery({ queryKey: ["auth", "google-config"], queryFn: authApi.googleConfig, retry: false });
  const container = useRef<HTMLDivElement>(null);
  const [sdkError, setSdkError] = useState("");
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useMutation({ mutationFn: authApi.googleLogin, onSuccess: (session) => {
    setCredential(""); setPassword(""); queryClient.clear(); login(session);
    navigate(getLoginDestination(session.user.role, (location.state as {returnTo?: string} | null)?.returnTo), {replace: true});
  } });
  const mutateRef = useRef(signIn.mutate);
  mutateRef.current = signIn.mutate;
  useEffect(() => {
    if (!config.data?.enabled) return;
    let active = true;
    void loadGoogleSdk().then((sdk) => {
      if (!active || !container.current) return;
      sdk.accounts.id.initialize({client_id: config.data.clientId, ux_mode: "popup", auto_select: false,
        callback: (response) => { if (!active) return; setCredential(response.credential); setPassword(""); mutateRef.current({credential: response.credential}); }});
      sdk.accounts.id.renderButton(container.current, {theme:"outline",size:"large",text:"continue_with",shape:"pill",width:Math.min(container.current.clientWidth,400),locale:"vi"});
    }).catch((error: Error) => { if (active) setSdkError(error.message); });
    return () => { active = false; };
  }, [config.data]);
  const needsLink = signIn.error instanceof ApiError && signIn.error.status === 409;
  if (config.data && !config.data.enabled) return null;
  return <section aria-label="Đăng nhập Google" className="mt-6 space-y-3">
    <p className="text-center text-xs text-muted-foreground">Hoặc tiếp tục với Google</p>
    {config.isPending && <p role="status" className="text-center text-xs">Đang kiểm tra Google…</p>}
    <div ref={container} className={signIn.isPending ? "pointer-events-none flex justify-center opacity-60" : "flex justify-center"} />
    {signIn.isPending && <p role="status" className="text-center text-sm">Đang xác minh tài khoản Google…</p>}
    {(config.isError || sdkError || signIn.error) && <p role="alert" className="text-sm text-destructive">{sdkError || signIn.error?.message || "Không kiểm tra được Google. Vui lòng đăng nhập bằng mật khẩu hoặc tải lại trang."}</p>}
    {(needsLink || password) && credential && <div className="space-y-2 rounded-xl border p-3">
      <Label htmlFor="google-link-password">Mật khẩu RoomieMatch hiện tại</Label>
      <Input id="google-link-password" type="password" autoComplete="current-password" maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="button" disabled={!password || signIn.isPending} onClick={() => signIn.mutate({credential,passwordToLink:password})}>Xác nhận liên kết Google</Button>
    </div>}
  </section>;
}

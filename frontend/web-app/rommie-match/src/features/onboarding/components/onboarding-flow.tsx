import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingApi } from "../services/onboarding-api";
import { profileApi } from "@/features/profile";
import { useAuthStore, useSignOut } from "@/features/auth";
import { flushSync } from "react-dom";
import { onboardingDefaults, validateOnboardingStep, profileToOnboarding, isValidOnboardingAge, type OnboardingValues, type OnboardingErrors } from "../schemas/onboarding-schema";
import { useNavigate, useBlocker } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useEffect, useState, type ReactNode, type MouseEventHandler } from "react";
import { Logo } from "@/layouts/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { VN_LOCATIONS } from "@/constants/locations";
import { LocationPicker } from "@/features/location/components/location-picker";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { vietnamToday } from "@/utils/date-rules";


function Pill({ active, onClick, children }: { active: boolean; onClick: MouseEventHandler<HTMLButtonElement>; children: ReactNode }) {
  return <button type="button" onClick={onClick}
    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${active ? "bg-navy text-white border-navy shadow-md" : "bg-card hover:bg-muted"}`}>{children}</button>;
}

function Field({ field, error, children, className = "" }: { field: string; error?: string; children: ReactNode; className?: string }) {
  return <div data-field={field} tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined}
    className={`${className} ${error ? "rounded-xl ring-1 ring-destructive p-2 [&_label]:text-destructive [&_input]:border-destructive [&_select]:border-destructive [&_button]:border-destructive" : ""}`}>
    {children}
    {error && <p id={`error-${field}`} role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>}
  </div>;
}

export function OnboardingFlow() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isLocationPending, setIsLocationPending] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const [orgTouched, setOrgTouched] = useState(false);
  const [bioTouched, setBioTouched] = useState(false);
  const form = useForm<OnboardingValues>({ defaultValues: onboardingDefaults });
  const values = form.watch();
  const userId = useAuthStore(state => state.user?.id);
  const status = useQuery({ queryKey: ["onboarding", userId], queryFn: onboardingApi.getStatus, enabled: Boolean(userId) });
  const [hasSaved, setHasSaved] = useState(false);
  const [isExitRequested, setIsExitRequested] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const signOut = useSignOut();
  const saveOnboarding = useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: async (status) => {
      setHasSaved(true);
      form.reset(form.getValues());
      toast.success("Đã lưu hồ sơ và hoàn thành onboarding.");
      queryClient.setQueryData(["onboarding", userId], status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", "me", userId] }),
        queryClient.invalidateQueries({ queryKey: ["lifestyle", "me", userId] }),
      ]);
      nav("/quiz", { replace: true });
    },
  });
  const profile = useQuery({ queryKey: ["profile", "me", userId], queryFn: profileApi.getMine, enabled: Boolean(userId), retry: false });
  const [isPrefilled, setIsPrefilled] = useState(false);
  const registeredInfo = profile.data ? profileToOnboarding(profile.data) : {};
  const hasValidRegisteredAge = isValidOnboardingAge(registeredInfo.age ?? "");
  useEffect(() => {
    if (!profile.data || isPrefilled) return;
    form.reset({ ...form.getValues(), ...profileToOnboarding(profile.data) });
    const savedAmenities = profile.data.onboarding?.amenities ?? [];
    setSelectedAmenities(savedAmenities);
    setAmenityOptions(current => [...new Set([...current, ...savedAmenities])]);
    setIsPrefilled(true);
  }, [profile.data, isPrefilled, form]);
  // Step 1
  const name = values.name;
  const setName = (value: OnboardingValues["name"]) => form.setValue("name", value, { shouldDirty: true });
  const age = values.age;
  const setAge = (value: OnboardingValues["age"]) => { setAgeTouched(true); form.setValue("age", value, { shouldDirty: true }); };
  const gender = values.gender;
  const setGender = (value: OnboardingValues["gender"]) => form.setValue("gender", value, { shouldDirty: true });
  const employment = values.employment;
  const setEmployment = (value: OnboardingValues["employment"]) => form.setValue("employment", value, { shouldDirty: true });
  const orgName = values.orgName;
  const setOrgName = (value: OnboardingValues["orgName"]) => form.setValue("orgName", value, { shouldDirty: true });
  const hideOrg = values.hideOrg;
  const setHideOrg = (value: OnboardingValues["hideOrg"]) => form.setValue("hideOrg", value, { shouldDirty: true });
  const city = values.city;
  const setCity = (value: OnboardingValues["city"]) => form.setValue("city", value, { shouldDirty: true });
  const bio = values.bio;
  const setBio = (value: OnboardingValues["bio"]) => form.setValue("bio", value, { shouldDirty: true });
  // Step 2
  const sleep = values.sleep;
  const setSleep = (value: OnboardingValues["sleep"]) => form.setValue("sleep", value, { shouldDirty: true });
  const env = values.env;
  const setEnv = (value: OnboardingValues["env"]) => form.setValue("env", value, { shouldDirty: true });
  const yn = values.yn;
  const setYn = (value: OnboardingValues["yn"]) => form.setValue("yn", value, { shouldDirty: true });
  // Step 3
  const hasRoom = values.hasRoom;
  const setHasRoom = (value: OnboardingValues["hasRoom"]) => form.setValue("hasRoom", value, { shouldDirty: true });
  // Step 4 - has room
  const addr = values.addr;
  const setAddr = (value: OnboardingValues["addr"]) => { form.setValue("addr", value, { shouldDirty: true }); form.setValue("latitude", null, { shouldDirty: true }); form.setValue("longitude", null, { shouldDirty: true }); };
  const district = values.district;
  const setDistrict = (value: OnboardingValues["district"]) => { form.setValue("district", value, { shouldDirty: true }); form.setValue("latitude", null, { shouldDirty: true }); form.setValue("longitude", null, { shouldDirty: true }); };
  const bedrooms = values.bedrooms;
  const setBedrooms = (value: OnboardingValues["bedrooms"]) => form.setValue("bedrooms", value, { shouldDirty: true });
  const area = values.area;
  const setArea = (value: OnboardingValues["area"]) => form.setValue("area", value, { shouldDirty: true });
  const rent = values.rent;
  const setRent = (value: OnboardingValues["rent"]) => form.setValue("rent", value, { shouldDirty: true });
  const needed = values.needed;
  const setNeeded = (value: OnboardingValues["needed"]) => form.setValue("needed", value, { shouldDirty: true });
  const moveIn = values.moveIn;
  const setMoveIn = (value: OnboardingValues["moveIn"]) => form.setValue("moveIn", value, { shouldDirty: true });
  const houseType = values.houseType;
  const setHouseType = (value: OnboardingValues["houseType"]) => form.setValue("houseType", value, { shouldDirty: true });
  const DEFAULT_AMENITIES = ["Máy lạnh", "Máy giặt", "Wi-Fi", "Bếp", "Ban công", "Bảo vệ 24/7", "Thang máy", "Chỗ để xe"];
  const [amenityOptions, setAmenityOptions] = useState<string[]>(DEFAULT_AMENITIES);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const hasChanges = form.formState.isDirty || JSON.stringify([...selectedAmenities].sort()) !== JSON.stringify([...(profile.data?.onboarding?.amenities ?? [])].sort());
  const shouldWarn = isPrefilled && !hasSaved && !isExiting && (hasChanges || !status.data?.isComplete);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => shouldWarn && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!shouldWarn) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [shouldWarn]);
  // Step 4 - no room
  const distance = values.distance;
  const setDistance = (value: OnboardingValues["distance"]) => form.setValue("distance", value, { shouldDirty: true });
  const roomType = values.roomType;
  const setRoomType = (value: OnboardingValues["roomType"]) => form.setValue("roomType", value, { shouldDirty: true });
  const moveInDate = values.moveInDate;
  const setMoveInDate = (value: OnboardingValues["moveInDate"]) => form.setValue("moveInDate", value, { shouldDirty: true });

  const nav = useNavigate();
  const total = 4;
  function cancelExit() {
    setIsExitRequested(false);
    if (blocker.state === "blocked") blocker.reset();
  }
  function discardAndSignOut() {
    // Remove the navigation warning before logout redirects and clears the form.
    flushSync(() => { setIsExiting(true); setIsExitRequested(false); });
    if (blocker.state === "blocked") blocker.reset();
    toast.info("Đã bỏ dữ liệu chưa lưu. Lần đăng nhập sau, bạn cần hoàn thiện hồ sơ trước khi sử dụng hệ thống.");
    signOut.mutate(false);
  }

  const orgLabel = employment === "Đang đi học" ? "Trường học" : employment === "Đang đi làm" ? "Nơi làm việc" : employment === "Cả hai" ? "Trường / Nơi làm việc" : "Tổ chức (tuỳ chọn)";
  const orgRequired = employment === "Đang đi học" || employment === "Đang đi làm" || employment === "Cả hai";

  const errors: OnboardingErrors = hasAttempted ? validateOnboardingStep(step, values) : {};
  if (step === 1 && (ageTouched || Boolean(registeredInfo.age) && !hasValidRegisteredAge)) {
    const ageError = validateOnboardingStep(1, values).age;
    if (ageError) errors.age = ageError;
  }
  if (step === 1) {
    const personalErrors = validateOnboardingStep(1, values);
    if (orgTouched && personalErrors.orgName) errors.orgName = personalErrors.orgName;
    if ((bioTouched || bio.length > 500) && personalErrors.bio) errors.bio = personalErrors.bio;
  }
  const hasErrors = Object.keys(errors).length > 0;
  function handleNext() {
    if (step === 4 && hasRoom === "yes" && isLocationPending) return;
    const nextErrors = validateOnboardingStep(step, values);
    if (Object.keys(nextErrors).length) {
      setHasAttempted(true);
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>(`[data-field="${Object.keys(nextErrors)[0]}"]`);
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        (first?.querySelector<HTMLElement>("input, select, button") ?? first)?.focus();
      });
      return;
    }
    setHasAttempted(false);
    if (step < total) setStep(current => current + 1);
    else {
      for (let current = 1; current <= total; current++) {
        if (Object.keys(validateOnboardingStep(current, values)).length) {
          setStep(current);
          setHasAttempted(true);
          return;
        }
      }
      saveOnboarding.mutate({ ...values, roomCity: values.roomCity || values.city, amenities: selectedAmenities });
    }
  }

  const toggleAmenity = (a: string) =>
    setSelectedAmenities(s => s.includes(a) ? s.filter(x => x !== a) : [...s, a]);
  const addAmenity = () => {
    const v = newAmenity.trim();
    if (!v || amenityOptions.includes(v)) return;
    setAmenityOptions(o => [...o, v]);
    setSelectedAmenities(s => [...s, v]);
    setNewAmenity("");
  };
  const removeAmenity = (a: string) => {
    setAmenityOptions(o => o.filter(x => x !== a));
    setSelectedAmenities(s => s.filter(x => x !== a));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-mint/10 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6"><Logo /><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Bước {step}/{total}</span><Button type="button" variant="outline" disabled={saveOnboarding.isPending || signOut.isPending || status.isPending} onClick={() => status.data?.isComplete ? nav("/settings?section=profile") : setIsExitRequested(true)}>Thoát</Button></div></div>
        <Progress value={(step/total)*100} className="h-2 mb-8" />
        <p role="status" className="mb-6 text-sm text-muted-foreground">{status.data?.isComplete ? "Hồ sơ đã lưu trước đó. Bạn đang chỉnh sửa; thay đổi chỉ được lưu sau khi hoàn thành 4 bước và bấm Lưu hồ sơ & tiếp tục." : "Chưa hoàn thành onboarding. Bạn cần hoàn thành 4 bước và bấm Lưu hồ sơ & tiếp tục trước khi sử dụng hệ thống. Bấm Back không lưu dữ liệu."}{hasChanges && " Có thay đổi chưa lưu."}</p>

        <Card className="p-8 sm:p-10 rounded-3xl border-0 shadow-lg">
          {!isPrefilled && (
            <div role="status" className="py-8 text-center">
              {profile.isError ? <><p className="text-destructive">Không tải được thông tin đăng ký. Vui lòng thử lại.</p><Button variant="outline" onClick={() => profile.refetch()} className="mt-4">Thử lại</Button></> : "Đang lấy thông tin đăng ký…"}
            </div>
          )}
          {isPrefilled && step === 1 && (
            <>
              <h2 className="text-2xl font-display font-bold">Bổ sung hồ sơ của bạn</h2>
              <p className="text-muted-foreground text-sm mt-1">Chỉ cần thêm vài thông tin để tìm bạn cùng phòng phù hợp.</p>
              <section aria-label="Thông tin cơ bản" className="mt-6 rounded-2xl border border-teal/20 bg-mint/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <CheckCircle2 className="h-4 w-4 text-teal" aria-hidden="true" />
                  Thông tin cơ bản
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[["Họ và tên", registeredInfo.name], ["Giới tính", registeredInfo.gender], ["Thành phố", registeredInfo.city], ["Tuổi", hasValidRegisteredAge ? registeredInfo.age : ""]].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium text-navy">{value || "Chưa bổ sung"}</dd>
                    </div>
                  ))}
                </dl>
                {(!registeredInfo.gender || !registeredInfo.city || !hasValidRegisteredAge) && <p className="mt-4 text-xs text-muted-foreground">Vui lòng bổ sung các mục còn thiếu bên dưới. Đăng nhập Google không cung cấp tuổi, giới tính và thành phố. Thông tin chỉ được lưu khi hoàn thành đủ 4 bước.</p>}
              </section>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {(!registeredInfo.name || errors.name) && <Field field="name" error={errors.name}><Label>Họ và tên <span className="text-destructive">*</span></Label><Input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Nguyễn Linh" /></Field>}
                {!hasValidRegisteredAge && <Field field="age" error={errors.age}><Label htmlFor="onboarding-age">Tuổi <span className="text-destructive">*</span></Label><Input id="onboarding-age" aria-invalid={Boolean(errors.age)} aria-describedby={errors.age ? "error-age" : "age-hint"} value={age} onChange={e=>setAge(e.target.value)} onBlur={()=>setAgeTouched(true)} type="number" min={18} max={120} step={1} className={`mt-1.5 h-11 rounded-xl ${errors.age ? "border-destructive" : ""}`} placeholder="Nhập tuổi của bạn" /><p id="age-hint" className="mt-1 text-xs text-muted-foreground">Bạn cần từ 18 tuổi để sử dụng RoomieMatch.</p></Field>}
                {(!registeredInfo.gender || errors.gender) && <Field field="gender" error={errors.gender}><Label>Giới tính <span className="text-destructive">*</span></Label><select aria-label="Giới tính" value={gender} onChange={e=>setGender(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"><option value="">Chọn giới tính</option>{["Nam", "Nữ", "Khác", "Không muốn tiết lộ"].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>}
                {(!registeredInfo.city || errors.city) && <Field field="city" error={errors.city}><Label htmlFor="onboarding-city">Thành phố / Tỉnh hiện tại <span className="text-destructive">*</span></Label><Select value={city} onValueChange={setCity}><SelectTrigger id="onboarding-city" aria-invalid={Boolean(errors.city)} className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Chọn thành phố hoặc tỉnh" /></SelectTrigger><SelectContent className="max-h-72">{VN_LOCATIONS.map(location => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent></Select></Field>}
                <Field field="employment" error={errors.employment} className="sm:col-span-2">
                  <Label>Tình trạng hiện tại <span className="text-destructive">*</span></Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Đang đi học","Đang đi làm","Cả hai","Khác"].map(o => <Pill key={o} active={employment===o} onClick={()=>{ setEmployment(o); setOrgName(""); }}>{o}</Pill>)}
                  </div>
                </Field>
                {employment && employment !== "Khác" && (
                  <Field field="orgName" error={errors.orgName} className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="onboarding-org">{orgLabel} {orgRequired && <span className="text-destructive">*</span>}</Label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={hideOrg} onChange={e=>setHideOrg(e.target.checked)} className="h-4 w-4 rounded" />
                        Ẩn khỏi hồ sơ
                      </label>
                    </div>
                    <Input id="onboarding-org" value={orgName} onChange={e=>setOrgName(e.target.value)} onBlur={()=>setOrgTouched(true)} maxLength={160} aria-invalid={Boolean(errors.orgName)} aria-describedby={errors.orgName ? "error-orgName" : undefined} className={`mt-1.5 h-11 rounded-xl ${errors.orgName ? "border-destructive" : ""}`} placeholder={employment === "Đang đi học" ? "VD: RMIT Việt Nam" : "VD: Công ty ABC"} />
                    {hideOrg && <p className="mt-1 text-xs text-muted-foreground">Thông tin này sẽ không hiển thị công khai trên hồ sơ.</p>}
                  </Field>
                )}
                <Field field="bio" error={errors.bio} className="sm:col-span-2">
                  <Label htmlFor="onboarding-bio">Giới thiệu bản thân <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></Label>
                  <textarea
                    id="onboarding-bio"
                    value={bio}
                    onChange={e=>setBio(e.target.value)}
                    onBlur={()=>setBioTouched(true)}
                    maxLength={500}
                    aria-invalid={Boolean(errors.bio)}
                    aria-describedby={errors.bio ? "error-bio" : undefined}
                    className={`mt-1.5 w-full min-h-28 rounded-xl border bg-background p-3 text-sm ${errors.bio ? "border-destructive" : ""}`}
                    placeholder="Một vài dòng giới thiệu về bạn, tính cách, sở thích, kỳ vọng về bạn cùng phòng..."
                  />
                  <div className="text-right text-xs text-muted-foreground mt-1">{bio.length}/500</div>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-display font-bold">Sở thích lối sống</h2>
              <p className="text-muted-foreground text-sm mt-1">Đây là nền tảng cho điểm hợp nhau của bạn.</p>
              <div className="mt-8 space-y-7">
                <Field field="sleep" error={errors.sleep}>
                  <Label>Bạn thường đi ngủ lúc mấy giờ? <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Trước 22h","22h–0h","Sau 0h"].map(o => <Pill key={o} active={sleep===o} onClick={()=>setSleep(o)}>{o}</Pill>)}
                  </div>
                </Field>
                <div>
                  <Label>Bạn sạch sẽ ở mức nào? <span className="text-muted-foreground font-normal">(1 bừa → 5 sạch tinh)</span></Label>
                  <Slider aria-label="Mức độ sạch sẽ" value={[values.cleanliness]} onValueChange={([value]) => form.setValue("cleanliness", value)} max={5} min={1} step={1} className="mt-2" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[["smoke","Có hút thuốc?"],["drink","Có uống rượu bia?"],["pets","Có nuôi thú cưng?"]].map(([k,l]) => (
                    <Field key={k} field={k} error={errors[k as keyof OnboardingErrors]}>
                      <Label>{l} <span className="text-destructive">*</span></Label>
                      <div className="mt-2 flex gap-2">
                        {["Có","Không"].map(v => <Pill key={v} active={yn[k]===v} onClick={()=>setYn({...yn,[k]:v})}>{v}</Pill>)}
                      </div>
                    </Field>
                  ))}
                </div>
                <div>
                  <Label>Hướng nội ←→ Hướng ngoại</Label>
                  <Slider aria-label="Mức độ hướng ngoại" value={[values.extroversion]} onValueChange={([value]) => form.setValue("extroversion", value)} max={100} step={5} className="mt-2" />
                </div>
                <Field field="env" error={errors.env}>
                  <Label>Không gian phòng ưa thích <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Yên tĩnh","Vừa phải","Sôi nổi"].map(o => <Pill key={o} active={env===o} onClick={()=>setEnv(o)}>{o}</Pill>)}
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-display font-bold">Tình trạng chỗ ở</h2>
              <p className="text-muted-foreground text-sm mt-1">Bạn đã có phòng hay đang cần tìm phòng?</p>
              <Field field="hasRoom" error={errors.hasRoom} className="mt-8 grid sm:grid-cols-2 gap-4">
                <button type="button" onClick={()=>setHasRoom("yes")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom==="yes" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}>
                  <div className="text-3xl">🏠</div>
                  <div className="mt-2 font-semibold">Mình đã có phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">Chỉ cần tìm bạn cùng phòng phù hợp.</div>
                </button>
                <button type="button" onClick={()=>setHasRoom("no")}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${hasRoom==="no" ? "border-navy bg-navy/5 shadow-md" : "border-border hover:border-navy/40"}`}>
                  <div className="text-3xl">🔎</div>
                  <div className="mt-2 font-semibold">Mình đang tìm phòng</div>
                  <div className="text-sm text-muted-foreground mt-1">Tìm cả phòng lẫn bạn cùng phòng.</div>
                </button>
              </Field>
            </>
          )}

          {step === 4 && hasRoom === "yes" && (
            <>
              <h2 className="text-2xl font-display font-bold">Thông tin phòng hiện tại</h2>
              <p className="text-muted-foreground text-sm mt-1">Giúp bạn cùng phòng tương lai hiểu rõ về chỗ ở của bạn.</p>
              <div className="mt-8 space-y-6">
                <LocationPicker initialPosition={values.latitude != null && values.longitude != null ? { latitude: values.latitude, longitude: values.longitude } : undefined} onPendingChange={setIsLocationPending} onConfirm={location => {
                  setAddr(location.address); setDistrict(location.district);
                  form.setValue("roomCity", location.city, { shouldDirty: true });
                  form.setValue("latitude", location.latitude, { shouldDirty: true });
                  form.setValue("longitude", location.longitude, { shouldDirty: true });
                }} />
                <div><Label htmlFor="room-city">Thành phố / Tỉnh của phòng</Label><Input id="room-city" value={values.roomCity || values.city} onChange={e => { form.setValue("roomCity", e.target.value, { shouldDirty: true }); form.setValue("latitude", null); form.setValue("longitude", null); }} className="mt-1.5" /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field field="addr" error={errors.addr}><Label>Địa chỉ <span className="text-destructive">*</span></Label><Input value={addr} onChange={e=>setAddr(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="123 Nguyễn Huệ" /></Field>
                  <Field field="district" error={errors.district}><Label>Quận / Khu vực <span className="text-destructive">*</span></Label><Input value={district} onChange={e=>setDistrict(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Quận 1, TP.HCM" /></Field>
                  <Field field="bedrooms" error={errors.bedrooms}><Label>Số phòng ngủ <span className="text-destructive">*</span></Label><Input value={bedrooms} onChange={e=>setBedrooms(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="2" /></Field>
                  <Field field="area" error={errors.area}><Label>Diện tích (m²) <span className="text-destructive">*</span></Label><Input value={area} onChange={e=>setArea(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="45" /></Field>
                  <Field field="rent" error={errors.rent}><Label>Tiền thuê chia mỗi người (VND) <span className="text-destructive">*</span></Label><Input value={rent} onChange={e=>setRent(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="3.500.000" /></Field>
                  <Field field="needed" error={errors.needed}><Label>Số người cần thêm <span className="text-destructive">*</span></Label><Input value={needed} onChange={e=>setNeeded(e.target.value)} type="number" className="mt-1.5 h-11 rounded-xl" placeholder="1" /></Field>
                  <Field field="moveIn" error={errors.moveIn}><Label>Ngày có thể dọn vào <span className="text-destructive">*</span></Label><Input value={moveIn} onChange={e=>setMoveIn(e.target.value)} type="date" min={vietnamToday()} className="mt-1.5 h-11 rounded-xl" /><p className="mt-1 text-xs text-muted-foreground">Chọn từ hôm nay trở đi.</p></Field>
                  <Field field="houseType" error={errors.houseType}>
                    <Label>Loại nhà <span className="text-destructive">*</span></Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Căn hộ","Nhà nguyên căn","Studio","Ký túc xá"].map(o => <Pill key={o} active={houseType===o} onClick={()=>setHouseType(o)}>{o}</Pill>)}
                    </div>
                  </Field>
                </div>
                <div>
                  <Label>Tiện nghi có sẵn <span className="text-muted-foreground font-normal">(chọn hoặc thêm mới)</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {amenityOptions.map(o => {
                      const active = selectedAmenities.includes(o);
                      const isCustom = !DEFAULT_AMENITIES.includes(o);
                      return (
                        <span key={o} className={`group inline-flex items-center gap-1 rounded-xl border text-sm font-medium transition-all ${active ? "bg-navy text-white border-navy shadow-md" : "bg-card hover:bg-muted"}`}>
                          <button type="button" onClick={()=>toggleAmenity(o)} className="px-4 py-2.5">{o}</button>
                          {isCustom && (
                            <button type="button" onClick={()=>removeAmenity(o)} aria-label={`Xoá ${o}`} className={`pr-2 text-xs ${active ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-destructive"}`}>×</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newAmenity}
                      onChange={e=>setNewAmenity(e.target.value)}
                      onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
                      className="h-10 rounded-xl"
                      placeholder="Thêm tiện nghi khác (VD: Hồ bơi)"
                    />
                    <Button type="button" onClick={addAmenity} variant="outline" className="rounded-xl">Thêm</Button>
                  </div>
                </div>
                <div>
                  <Label>Mô tả thêm về phòng</Label>
                  <textarea className="mt-1.5 w-full min-h-24 rounded-xl border bg-background p-3 text-sm" placeholder="Phòng thoáng, gần công viên, khu yên tĩnh..." />
                </div>
              </div>
            </>
          )}

          {step === 4 && hasRoom !== "yes" && (
            <>
              <h2 className="text-2xl font-display font-bold">Ngân sách & phòng mong muốn</h2>
              <p className="text-muted-foreground text-sm mt-1">Bước cuối — gần xong rồi.</p>
              <div className="mt-8 space-y-6">
                <div>
                  <Label>Ngân sách hàng tháng (VND)</Label>
                  <Slider aria-label="Ngân sách hàng tháng" value={[values.budgetMin, values.budgetMax]} onValueChange={([min, max]) => { form.setValue("budgetMin", min); form.setValue("budgetMax", max); }} max={15} min={1} step={1} className="mt-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>{values.budgetMin} triệu</span><span>{values.budgetMax} triệu</span></div>
                </div>
                <Field field="distance" error={errors.distance}>
                  <Label>Khoảng cách mong muốn <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["< 2 km","2–5 km","5–10 km","Bất kỳ đâu trong thành phố"].map(o => <Pill key={o} active={distance===o} onClick={()=>setDistance(o)}>{o}</Pill>)}
                  </div>
                </Field>
                <Field field="roomType" error={errors.roomType}>
                  <Label>Loại phòng <span className="text-destructive">*</span></Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Phòng riêng","Phòng chung","Studio","Cả căn hộ"].map(o => <Pill key={o} active={roomType===o} onClick={()=>setRoomType(o)}>{o}</Pill>)}
                  </div>
                </Field>
                <Field field="moveInDate" error={errors.moveInDate}>
                  <Label>Ngày dọn vào <span className="text-destructive">*</span></Label>
                  <Input value={moveInDate} onChange={e=>setMoveInDate(e.target.value)} type="date" min={vietnamToday()} className="mt-1.5 h-11 rounded-xl" />
                  <p className="mt-1 text-xs text-muted-foreground">Chọn từ hôm nay trở đi.</p>
                </Field>
              </div>
            </>
          )}

          {hasErrors && (
            <p role="alert" className="mt-6 text-sm text-destructive">Vui lòng kiểm tra các mục được đánh dấu đỏ trước khi tiếp tục.</p>
          )}

          {saveOnboarding.isError && <p role="alert" className="mt-4 text-sm text-destructive">{saveOnboarding.error.message} Hồ sơ chưa được lưu, vui lòng thử lại.</p>}
          <fieldset disabled={saveOnboarding.isPending} className="contents">
            <div className="mt-4 flex justify-between gap-3">
              <Button variant="ghost" disabled={step===1} onClick={()=>{ setHasAttempted(false); setStep(s=>s-1); }} className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" /> Quay lại</Button>
              <Button onClick={handleNext} disabled={!isPrefilled || saveOnboarding.isPending || (step === 4 && hasRoom === "yes" && isLocationPending)} className="rounded-xl bg-navy hover:bg-navy/90 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed">
                {saveOnboarding.isPending ? "Đang lưu…" : step < total ? "Tiếp tục" : "Lưu hồ sơ & tiếp tục"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </fieldset>
        </Card>
      </div>
      <AlertDialog open={isExitRequested || blocker.state === "blocked"} onOpenChange={(open) => { if (!open) cancelExit(); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{status.data?.isComplete ? "Thoát khi chưa lưu thay đổi?" : "Thoát và đăng xuất?"}</AlertDialogTitle><AlertDialogDescription>{status.data?.isComplete ? "Dữ liệu thay đổi chưa hoàn thành và chưa lưu sẽ bị bỏ. Hồ sơ đã lưu trước đó vẫn được giữ nguyên." : "Dữ liệu đang nhập sẽ bị bỏ và không được lưu. Bạn sẽ đăng xuất. Lần đăng nhập sau, bạn cần hoàn thiện hồ sơ trước khi sử dụng hệ thống."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={cancelExit}>Tiếp tục chỉnh sửa</AlertDialogCancel>{status.data?.isComplete ? <AlertDialogAction onClick={() => { toast.info("Đã bỏ thay đổi chưa lưu. Hồ sơ đã lưu vẫn được giữ nguyên."); if (blocker.state === "blocked") blocker.proceed(); }}>Bỏ thay đổi và thoát</AlertDialogAction> : <AlertDialogAction disabled={signOut.isPending} onClick={discardAndSignOut}>Thoát và đăng xuất</AlertDialogAction>}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

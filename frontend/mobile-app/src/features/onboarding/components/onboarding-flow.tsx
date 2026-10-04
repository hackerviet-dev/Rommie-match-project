import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { BrandHeader } from "@/components/brand-header";
import { FormScreen } from "@/components/form-screen";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { DateField } from "@/components/ui/date-field";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PendingHint } from "@/components/ui/pending-hint";
import { SelectSheet } from "@/components/ui/select-sheet";
import { SliderField } from "@/components/ui/slider-field";
import { Stepper } from "@/components/ui/stepper";
import { VN_LOCATIONS } from "@/constants/locations";
import { useAuthStore } from "@/features/auth";
import { profileApi } from "@/features/profile";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { vietnamToday } from "@/utils/date-rules";
import {
  isValidOnboardingAge,
  type OnboardingErrors,
  type OnboardingValues,
  onboardingDefaults,
  profileToOnboarding,
  validateOnboardingStep,
} from "../schemas/onboarding-schema";
import { onboardingApi } from "../services/onboarding-api";

const TOTAL_STEPS = 4;
const DEFAULT_AMENITIES = [
  "Máy lạnh",
  "Máy giặt",
  "Wi-Fi",
  "Bếp",
  "Ban công",
  "Bảo vệ 24/7",
  "Thang máy",
  "Chỗ để xe",
];
const options = (values: readonly string[]) => values.map((value) => ({ label: value, value }));

// Bản mobile của OnboardingFlow trên web: cùng 4 bước, cùng schema và payload
// PUT /api/users/me/onboarding.
export function OnboardingFlow() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<OnboardingValues>(onboardingDefaults);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const [orgTouched, setOrgTouched] = useState(false);
  const [amenityOptions, setAmenityOptions] = useState<string[]>(DEFAULT_AMENITIES);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [isPrefilled, setIsPrefilled] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", "me", userId],
    queryFn: profileApi.getMine,
    enabled: Boolean(userId),
    retry: false,
  });
  const registeredInfo = profile.data ? profileToOnboarding(profile.data) : {};
  const hasValidRegisteredAge = isValidOnboardingAge(registeredInfo.age ?? "");

  useEffect(() => {
    if (!profile.data || isPrefilled) return;
    setValues((current) => ({ ...current, ...profileToOnboarding(profile.data) }));
    const savedAmenities = profile.data.onboarding?.amenities ?? [];
    setSelectedAmenities(savedAmenities);
    setAmenityOptions((current) => [...new Set([...current, ...savedAmenities])]);
    setIsPrefilled(true);
  }, [profile.data, isPrefilled]);

  const save = useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: async (status) => {
      // Sang màn quiz trước, rồi mới đánh dấu hoàn tất: guard ở _layout bỏ màn onboarding
      // khỏi stack ngay khi trạng thái đổi.
      router.replace("/quiz");
      queryClient.setQueryData(["onboarding", userId], status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", "me", userId] }),
        queryClient.invalidateQueries({ queryKey: ["lifestyle", "me", userId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
      ]);
    },
  });

  const set = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const errors: OnboardingErrors = hasAttempted ? validateOnboardingStep(step, values) : {};
  if (step === 1) {
    const personalErrors = validateOnboardingStep(1, values);
    if (
      (ageTouched || (Boolean(registeredInfo.age) && !hasValidRegisteredAge)) &&
      personalErrors.age
    )
      errors.age = personalErrors.age;
    if (orgTouched && personalErrors.orgName) errors.orgName = personalErrors.orgName;
    if (values.bio.length > 500 && personalErrors.bio) errors.bio = personalErrors.bio;
  }
  const hasErrors = Object.keys(errors).length > 0;

  function goTo(next: number) {
    setHasAttempted(false);
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function handleNext() {
    if (Object.keys(validateOnboardingStep(step, values)).length) {
      setHasAttempted(true);
      return;
    }
    if (step < TOTAL_STEPS) return goTo(step + 1);
    for (let current = 1; current <= TOTAL_STEPS; current++) {
      if (Object.keys(validateOnboardingStep(current, values)).length) {
        goTo(current);
        setHasAttempted(true);
        return;
      }
    }
    save.mutate({ ...values, amenities: selectedAmenities });
  }

  function addAmenity() {
    const value = newAmenity.trim();
    if (!value || amenityOptions.includes(value)) return;
    setAmenityOptions((current) => [...current, value]);
    setSelectedAmenities((current) => [...current, value]);
    setNewAmenity("");
  }

  const employment = values.employment;
  const orgLabel =
    employment === "Đang đi học"
      ? "Trường học"
      : employment === "Đang đi làm"
        ? "Nơi làm việc"
        : employment === "Cả hai"
          ? "Trường / Nơi làm việc"
          : "Tổ chức (tuỳ chọn)";
  const orgRequired = ["Đang đi học", "Đang đi làm", "Cả hai"].includes(employment);

  return (
    <FormScreen scrollRef={scroll}>
      <View className="flex-row items-center justify-between">
        <BrandHeader />
        <Text className="text-sm text-slate-500">
          Bước {step}/{TOTAL_STEPS}
        </Text>
      </View>
      <View className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <View
          className="h-full rounded-full bg-teal"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </View>
      <Text className="mt-4 text-sm leading-5 text-slate-500">
        Bạn cần hoàn thành 4 bước và lưu hồ sơ trước khi sử dụng các chức năng của RoomieMatch.
      </Text>

      {!isPrefilled ? (
        <View className="mt-10 items-center gap-4">
          {profile.isError ? (
            <>
              <FormError message="Không tải được thông tin đăng ký. Vui lòng thử lại." />
              <Button action="primary" variant="outline" onPress={() => profile.refetch()}>
                <ButtonText>Thử lại</ButtonText>
              </Button>
            </>
          ) : (
            <Text className="text-slate-500">Đang lấy thông tin đăng ký…</Text>
          )}
        </View>
      ) : (
        <View className="mt-6 gap-5">
          {step === 1 ? (
            <>
              <StepTitle
                title="Bổ sung hồ sơ của bạn"
                description="Chỉ cần thêm vài thông tin để tìm bạn cùng phòng phù hợp."
              />
              <View className="rounded-2xl border border-teal/20 bg-mint/20 p-4">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 color={colors.teal} size={16} />
                  <Text className="text-sm font-semibold text-navy">Thông tin đã đăng ký</Text>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-3">
                  {[
                    ["Họ và tên", registeredInfo.name],
                    ["Giới tính", registeredInfo.gender],
                    ["Thành phố", registeredInfo.city],
                    ...(hasValidRegisteredAge ? [["Tuổi", registeredInfo.age]] : []),
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <View key={label}>
                        <Text className="text-xs text-slate-500">{label}</Text>
                        <Text className="mt-0.5 text-sm font-medium text-navy">{value}</Text>
                      </View>
                    ))}
                </View>
              </View>
              {!registeredInfo.name || errors.name ? (
                <FormField label="Họ và tên" required error={errors.name}>
                  <Input
                    value={values.name}
                    onChangeText={(value) => set("name", value)}
                    invalid={Boolean(errors.name)}
                    placeholder="Nguyễn Linh"
                  />
                </FormField>
              ) : null}
              {!hasValidRegisteredAge ? (
                <FormField label="Tuổi" required error={errors.age}>
                  <Input
                    value={values.age}
                    onChangeText={(value) => {
                      setAgeTouched(true);
                      set("age", value.replace(/\D/g, ""));
                    }}
                    invalid={Boolean(errors.age)}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="Nhập tuổi của bạn"
                  />
                  <Text className="text-xs text-slate-500">
                    Bạn cần từ 18 tuổi để sử dụng RoomieMatch.
                  </Text>
                </FormField>
              ) : null}
              {!registeredInfo.gender || errors.gender ? (
                <FormField label="Giới tính" required error={errors.gender}>
                  <ChoiceChips
                    options={options(["Nam", "Nữ", "Khác", "Không muốn tiết lộ"])}
                    value={values.gender}
                    onChange={(value) => set("gender", value)}
                  />
                </FormField>
              ) : null}
              {!registeredInfo.city || errors.city ? (
                <FormField label="Thành phố" required error={errors.city}>
                  <SelectSheet
                    title="Thành phố / Tỉnh"
                    placeholder="Chọn thành phố hoặc tỉnh"
                    options={VN_LOCATIONS}
                    value={values.city}
                    invalid={Boolean(errors.city)}
                    onChange={(value) => set("city", value)}
                  />
                </FormField>
              ) : null}
              <FormField label="Tình trạng hiện tại" required error={errors.employment}>
                <ChoiceChips
                  options={options(["Đang đi học", "Đang đi làm", "Cả hai", "Khác"])}
                  value={employment}
                  onChange={(value) => {
                    set("employment", value);
                    set("orgName", "");
                  }}
                />
              </FormField>
              {employment && employment !== "Khác" ? (
                <FormField label={orgLabel} required={orgRequired} error={errors.orgName}>
                  <Input
                    value={values.orgName}
                    onChangeText={(value) => set("orgName", value)}
                    onBlur={() => setOrgTouched(true)}
                    invalid={Boolean(errors.orgName)}
                    maxLength={160}
                    placeholder={
                      employment === "Đang đi học" ? "VD: RMIT Việt Nam" : "VD: Công ty ABC"
                    }
                  />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-slate-500">Ẩn khỏi hồ sơ</Text>
                    <Switch
                      accessibilityLabel="Ẩn khỏi hồ sơ"
                      value={values.hideOrg}
                      onValueChange={(value) => set("hideOrg", value)}
                      trackColor={{ true: colors.teal, false: "#cbd5e1" }}
                    />
                  </View>
                  {values.hideOrg ? (
                    <Text className="text-xs text-slate-500">
                      Thông tin này sẽ không hiển thị công khai trên hồ sơ.
                    </Text>
                  ) : null}
                </FormField>
              ) : null}
              <FormField label="Giới thiệu bản thân (tuỳ chọn)" error={errors.bio}>
                <Input
                  value={values.bio}
                  onChangeText={(value) => set("bio", value)}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  className="h-28 py-3"
                  placeholder="Một vài dòng giới thiệu về bạn, tính cách, sở thích, kỳ vọng về bạn cùng phòng..."
                />
                <Text className="text-right text-xs text-slate-500">{values.bio.length}/500</Text>
              </FormField>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepTitle
                title="Sở thích lối sống"
                description="Đây là nền tảng cho điểm hợp nhau của bạn."
              />
              <FormField label="Bạn thường đi ngủ lúc mấy giờ?" required error={errors.sleep}>
                <ChoiceChips
                  options={options(["Trước 22h", "22h–0h", "Sau 0h"])}
                  value={values.sleep}
                  onChange={(value) => set("sleep", value)}
                />
              </FormField>
              <FormField label={`Bạn sạch sẽ ở mức nào? ${values.cleanliness}/5`}>
                <SliderField
                  accessibilityLabel="Mức độ sạch sẽ"
                  value={values.cleanliness}
                  onChange={(value) => set("cleanliness", value)}
                  min={1}
                  max={5}
                  leftLabel="1 · Bừa"
                  rightLabel="5 · Sạch tinh"
                />
              </FormField>
              {(
                [
                  ["smoke", "Có hút thuốc?"],
                  ["drink", "Có uống rượu bia?"],
                  ["pets", "Có nuôi thú cưng?"],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label} required error={errors[key]}>
                  <ChoiceChips
                    options={options(["Có", "Không"])}
                    value={values.yn[key]}
                    onChange={(value) => set("yn", { ...values.yn, [key]: value })}
                  />
                </FormField>
              ))}
              <FormField label="Hướng nội ←→ Hướng ngoại">
                <SliderField
                  accessibilityLabel="Mức độ hướng ngoại"
                  value={values.extroversion}
                  onChange={(value) => set("extroversion", value)}
                  min={0}
                  max={100}
                  step={5}
                  leftLabel="Hướng nội"
                  rightLabel="Hướng ngoại"
                />
              </FormField>
              <FormField label="Không gian phòng ưa thích" required error={errors.env}>
                <ChoiceChips
                  options={options(["Yên tĩnh", "Vừa phải", "Sôi nổi"])}
                  value={values.env}
                  onChange={(value) => set("env", value)}
                />
              </FormField>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepTitle
                title="Tình trạng chỗ ở"
                description="Bạn đã có phòng hay đang cần tìm phòng?"
              />
              <FormField label="Chọn một" required error={errors.hasRoom}>
                <View className="gap-3">
                  <RoomChoice
                    active={values.hasRoom === "yes"}
                    emoji="🏠"
                    title="Mình đã có phòng"
                    description="Chỉ cần tìm bạn cùng phòng phù hợp."
                    onPress={() => set("hasRoom", "yes")}
                  />
                  <RoomChoice
                    active={values.hasRoom === "no"}
                    emoji="🔎"
                    title="Mình đang tìm phòng"
                    description="Tìm cả phòng lẫn bạn cùng phòng."
                    onPress={() => set("hasRoom", "no")}
                  />
                </View>
              </FormField>
            </>
          ) : null}

          {step === 4 && values.hasRoom === "yes" ? (
            <>
              <StepTitle
                title="Thông tin phòng hiện tại"
                description="Giúp bạn cùng phòng tương lai hiểu rõ về chỗ ở của bạn."
              />
              <FormField label="Địa chỉ" required error={errors.addr}>
                <Input
                  value={values.addr}
                  onChangeText={(value) => set("addr", value)}
                  invalid={Boolean(errors.addr)}
                  placeholder="123 Nguyễn Huệ"
                />
              </FormField>
              <FormField label="Quận / Khu vực" required error={errors.district}>
                <Input
                  value={values.district}
                  onChangeText={(value) => set("district", value)}
                  invalid={Boolean(errors.district)}
                  placeholder="Quận 1, TP.HCM"
                />
              </FormField>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Số phòng ngủ" required error={errors.bedrooms}>
                    <Input
                      value={values.bedrooms}
                      onChangeText={(value) => set("bedrooms", value)}
                      invalid={Boolean(errors.bedrooms)}
                      keyboardType="number-pad"
                      placeholder="2"
                    />
                  </FormField>
                </View>
                <View className="flex-1">
                  <FormField label="Diện tích (m²)" required error={errors.area}>
                    <Input
                      value={values.area}
                      onChangeText={(value) => set("area", value)}
                      invalid={Boolean(errors.area)}
                      keyboardType="decimal-pad"
                      placeholder="45"
                    />
                  </FormField>
                </View>
              </View>
              <FormField label="Tiền thuê chia mỗi người (VND)" required error={errors.rent}>
                <Input
                  value={values.rent}
                  onChangeText={(value) => set("rent", value)}
                  invalid={Boolean(errors.rent)}
                  keyboardType="number-pad"
                  placeholder="3.500.000"
                />
              </FormField>
              <FormField label="Số người cần thêm" required error={errors.needed}>
                <Input
                  value={values.needed}
                  onChangeText={(value) => set("needed", value)}
                  invalid={Boolean(errors.needed)}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </FormField>
              <FormField label="Ngày có thể dọn vào" required error={errors.moveIn}>
                <DateField
                  value={values.moveIn}
                  onChange={(value) => set("moveIn", value)}
                  minimumDate={vietnamToday()}
                  invalid={Boolean(errors.moveIn)}
                />
                <Text className="text-xs text-slate-500">Chọn từ hôm nay trở đi.</Text>
              </FormField>
              <FormField label="Loại nhà" required error={errors.houseType}>
                <ChoiceChips
                  options={options(["Căn hộ", "Nhà nguyên căn", "Studio", "Ký túc xá"])}
                  value={values.houseType}
                  onChange={(value) => set("houseType", value)}
                />
              </FormField>
              <FormField label="Tiện nghi có sẵn (chọn hoặc thêm mới)">
                <View className="flex-row flex-wrap gap-2">
                  {amenityOptions.map((amenity) => {
                    const active = selectedAmenities.includes(amenity);
                    const custom = !DEFAULT_AMENITIES.includes(amenity);
                    return (
                      <View
                        key={amenity}
                        className={cn(
                          "flex-row items-center rounded-full border",
                          active ? "border-navy bg-navy" : "border-slate-200 bg-white",
                        )}
                      >
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                          onPress={() =>
                            setSelectedAmenities((current) =>
                              current.includes(amenity)
                                ? current.filter((item) => item !== amenity)
                                : [...current, amenity],
                            )
                          }
                          className="px-4 py-2.5"
                        >
                          <Text
                            className={cn(
                              "text-sm font-semibold",
                              active ? "text-white" : "text-ink",
                            )}
                          >
                            {amenity}
                          </Text>
                        </Pressable>
                        {custom ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Xoá ${amenity}`}
                            onPress={() => {
                              setAmenityOptions((current) => current.filter((x) => x !== amenity));
                              setSelectedAmenities((current) =>
                                current.filter((x) => x !== amenity),
                              );
                            }}
                            className="pr-3"
                          >
                            <X color={active ? "#ffffff" : colors.slate500} size={14} />
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row gap-2">
                  <Input
                    className="flex-1"
                    value={newAmenity}
                    onChangeText={setNewAmenity}
                    onSubmitEditing={addAmenity}
                    returnKeyType="done"
                    placeholder="Thêm tiện nghi khác (VD: Hồ bơi)"
                  />
                  <Button action="primary" variant="outline" className="h-12" onPress={addAmenity}>
                    <ButtonText>Thêm</ButtonText>
                  </Button>
                </View>
              </FormField>
            </>
          ) : null}

          {step === 4 && values.hasRoom !== "yes" ? (
            <>
              <StepTitle
                title="Ngân sách & phòng mong muốn"
                description="Bước cuối — gần xong rồi."
              />
              <FormField label="Ngân sách hàng tháng (VND)">
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-slate-500">Từ</Text>
                    <Stepper
                      label="Ngân sách tối thiểu"
                      value={values.budgetMin}
                      min={1}
                      max={values.budgetMax}
                      format={(value) => `${value} triệu`}
                      onChange={(value) => set("budgetMin", value)}
                    />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-slate-500">Đến</Text>
                    <Stepper
                      label="Ngân sách tối đa"
                      value={values.budgetMax}
                      min={values.budgetMin}
                      max={15}
                      format={(value) => `${value} triệu`}
                      onChange={(value) => set("budgetMax", value)}
                    />
                  </View>
                </View>
              </FormField>
              <FormField label="Khoảng cách mong muốn" required error={errors.distance}>
                <ChoiceChips
                  options={options(["< 2 km", "2–5 km", "5–10 km", "Bất kỳ đâu trong thành phố"])}
                  value={values.distance}
                  onChange={(value) => set("distance", value)}
                />
              </FormField>
              <FormField label="Loại phòng" required error={errors.roomType}>
                <ChoiceChips
                  options={options(["Phòng riêng", "Phòng chung", "Studio", "Cả căn hộ"])}
                  value={values.roomType}
                  onChange={(value) => set("roomType", value)}
                />
              </FormField>
              <FormField label="Ngày dọn vào" required error={errors.moveInDate}>
                <DateField
                  value={values.moveInDate}
                  onChange={(value) => set("moveInDate", value)}
                  minimumDate={vietnamToday()}
                  invalid={Boolean(errors.moveInDate)}
                />
                <Text className="text-xs text-slate-500">Chọn từ hôm nay trở đi.</Text>
              </FormField>
            </>
          ) : null}

          {hasErrors ? (
            <FormError message="Vui lòng kiểm tra các mục được đánh dấu đỏ trước khi tiếp tục." />
          ) : null}
          {save.isError ? (
            <FormError message={`${save.error.message} Hồ sơ chưa được lưu, vui lòng thử lại.`} />
          ) : null}
          <View className="flex-row gap-3">
            <Button
              action="muted"
              variant="outline"
              className="h-12"
              disabled={step === 1 || save.isPending}
              onPress={() => goTo(step - 1)}
            >
              <ButtonIcon as={ArrowLeft} />
              <ButtonText>Quay lại</ButtonText>
            </Button>
            <Button
              action="primary"
              className="h-12 flex-1"
              loading={save.isPending}
              onPress={handleNext}
            >
              <ButtonText>
                {save.isPending ? "Đang lưu…" : step < TOTAL_STEPS ? "Tiếp tục" : "Lưu hồ sơ"}
              </ButtonText>
              <ButtonIcon as={ArrowRight} />
            </Button>
          </View>
          <PendingHint active={save.isPending} />
        </View>
      )}
    </FormScreen>
  );
}

function StepTitle({ title, description }: { title: string; description: string }) {
  return (
    <View>
      <Text className="text-2xl font-bold text-ink">{title}</Text>
      <Text className="mt-1 text-sm text-slate-500">{description}</Text>
    </View>
  );
}

function RoomChoice({
  active,
  emoji,
  title,
  description,
  onPress,
}: {
  active: boolean;
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      className={cn(
        "rounded-2xl border-2 bg-white p-5",
        active ? "border-navy bg-navy/5" : "border-slate-200",
      )}
    >
      <Text className="text-3xl">{emoji}</Text>
      <Text className="mt-2 text-base font-semibold text-ink">{title}</Text>
      <Text className="mt-1 text-sm text-slate-500">{description}</Text>
    </Pressable>
  );
}

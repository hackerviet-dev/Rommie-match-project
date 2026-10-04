import { Check, ChevronDown, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { normalizeSearch } from "@/utils/normalize-search";
import { Input } from "./input";

// Thay cho <Select> của web: nút mở một danh sách toàn màn hình có ô tìm kiếm.
export function SelectSheet({
  title,
  placeholder,
  options,
  value,
  onChange,
  invalid,
  searchable = true,
}: {
  title: string;
  placeholder: string;
  /** Chuỗi (nhãn = giá trị) hoặc { label, value } khi cần hiển thị khác giá trị gửi đi. */
  options: readonly (string | { label: string; value: string })[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  invalid?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string" ? { label: option, value: option } : option,
      ),
    [options],
  );
  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    return needle ? items.filter((item) => normalizeSearch(item.label).includes(needle)) : items;
  }, [items, query]);
  const selectedLabel = items.find((item) => item.value === value)?.label;

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setOpen(true)}
        className={cn(
          "h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4",
          invalid && "border-red-400",
        )}
      >
        <Text className={cn("text-base", value ? "text-ink" : "text-slate-400")}>
          {selectedLabel || value || placeholder}
        </Text>
        <ChevronDown color={colors.slate500} size={18} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView className="flex-1 bg-paper">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-bold text-ink">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={close}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          {searchable ? (
            <View className="px-4 pb-2">
              <Input value={query} onChangeText={setQuery} placeholder="Tìm kiếm…" autoFocus />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="py-6 text-center text-slate-500">Không tìm thấy kết quả.</Text>
            }
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  className="flex-row items-center justify-between border-b border-slate-100 py-3.5"
                >
                  <Text className={cn("text-base", selected ? "font-bold text-teal" : "text-ink")}>
                    {item.label}
                  </Text>
                  {selected ? <Check color={colors.teal} size={18} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

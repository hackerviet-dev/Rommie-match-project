import { Send } from "lucide-react-native";
import { Text, View } from "react-native";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button, ButtonGroup, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chats } from "@/mocks/mock-data";

export function ChatListScreen() {
  return (
    <View className="gap-3">
      <Text className="mb-1 text-sm text-slate-500">3 cuộc trò chuyện gần đây</Text>
      {chats.map((chat) => (
        <Card className="p-3" key={chat.name}>
          <View className="flex-row items-center gap-3">
            <Avatar className="bg-mint/30">
              <AvatarFallback className="text-navy">{chat.initials}</AvatarFallback>
            </Avatar>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">{chat.name}</Text>
                <Text className="text-xs text-slate-400">{chat.time}</Text>
              </View>
              <Text className="mt-1 text-sm leading-5 text-slate-500" numberOfLines={2}>
                {chat.last}
              </Text>
            </View>
            {chat.unread ? <View className="h-2.5 w-2.5 rounded-full bg-teal" /> : null}
          </View>
        </Card>
      ))}
      <Card className="mt-1 bg-mint/20">
        <CardHeader>
          <CardTitle className="text-lg">Gợi ý mở lời</CardTitle>
          <CardDescription>Hỏi về giờ giấc và quy tắc ở chung để hiểu nhau hơn.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button action="secondary" className="rounded-2xl">
            <ButtonIcon as={Send} />
            <ButtonText>Soạn tin nhắn</ButtonText>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

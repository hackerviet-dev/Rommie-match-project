import React, { createContext, useContext } from "react";
import { View } from "react-native";

type ColorMode = "light" | "dark";

const GluestackUIContext = createContext<{ colorMode: ColorMode }>({
  colorMode: "light",
});

type GluestackUIProviderProps = {
  children: React.ReactNode;
  colorMode?: ColorMode;
};

export function GluestackUIProvider({ children, colorMode = "light" }: GluestackUIProviderProps) {
  return (
    <GluestackUIContext.Provider value={{ colorMode }}>
      <View className="flex-1 bg-paper">{children}</View>
    </GluestackUIContext.Provider>
  );
}

export function useGluestackUI() {
  return useContext(GluestackUIContext);
}

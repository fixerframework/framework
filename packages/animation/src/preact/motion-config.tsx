import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ReducedMotionSetting, Transition } from "../core/types.ts";

export interface MotionConfigValue {
  reducedMotion: ReducedMotionSetting;
  transition?: Transition;
}

const defaultConfig: MotionConfigValue = {
  reducedMotion: "user",
};

export const MotionConfigContext = createContext<MotionConfigValue>(defaultConfig);

export interface MotionConfigProps {
  children?: ComponentChildren;
  reducedMotion?: ReducedMotionSetting;
  transition?: Transition;
}

export function MotionConfig({
  children,
  reducedMotion = "user",
  transition,
}: MotionConfigProps) {
  const parent = useContext(MotionConfigContext);
  const value: MotionConfigValue = {
    reducedMotion: reducedMotion ?? parent.reducedMotion,
    transition: transition ?? parent.transition,
  };
  return (
    <MotionConfigContext.Provider value={value}>{children}</MotionConfigContext.Provider>
  );
}

export function useMotionConfig(): MotionConfigValue {
  return useContext(MotionConfigContext);
}

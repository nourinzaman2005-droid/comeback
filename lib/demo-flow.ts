export type DemoStep = "home" | "setup" | "test" | "symptoms" | "result";

export const demoSteps: DemoStep[] = [
  "home",
  "setup",
  "test",
  "symptoms",
  "result",
];

export function nextDemoStep(current: DemoStep): DemoStep {
  const index = demoSteps.indexOf(current);
  return demoSteps[Math.min(index + 1, demoSteps.length - 1)];
}

export function previousDemoStep(current: DemoStep): DemoStep {
  const index = demoSteps.indexOf(current);
  return demoSteps[Math.max(index - 1, 0)];
}

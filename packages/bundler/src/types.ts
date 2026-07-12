export type BuildMode = "lib" | "app" | "server";

export type CliOptions = {
  mode: BuildMode;
  cwd: string;
  format: boolean;
  lint: boolean;
  typecheck: boolean;
  test: boolean;
  build: boolean;
  formatCheck: boolean;
  watch: boolean;
  config?: string;
};

export type StepResult = {
  name: string;
  code: number;
};

export type RunCommandOptions = {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
};

export type RunCommandResult = {
  code: number;
};

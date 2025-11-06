import dotenv from "dotenv";
import fs from "fs";
import path from "path";

export type ScriptOptions = {
  dryRun: boolean;
  envPath?: string;
};

const withLabel = (label: string | undefined, message: string) => (label ? `[${label}] ${message}` : message);

export const parseScriptOptions = (argv: string[], scriptLabel?: string): ScriptOptions => {
  const args = [...argv];
  const options: ScriptOptions = { dryRun: false };

  const envIndex = args.indexOf("--env");
  if (envIndex !== -1) {
    const envPath = args[envIndex + 1];
    if (envPath) {
      options.envPath = envPath;
      args.splice(envIndex, 2);
    } else {
      console.warn(withLabel(scriptLabel, "Flag --env provided without a value, defaulting to .env"));
      args.splice(envIndex, 1);
    }
  }

  const dryRunIndex = args.indexOf("--dry-run");
  if (dryRunIndex !== -1) {
    options.dryRun = true;
    args.splice(dryRunIndex, 1);
  }

  if (args.length) {
    console.warn(withLabel(scriptLabel, `Ignoring unexpected arguments: ${args.join(", ")}`));
  }

  return options;
};

const resolveExplicitPath = (envPath: string) => (path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath));

const looksLikeFilePath = (envPath: string) => {
  if (!envPath) {
    return false;
  }
  return envPath.includes(path.sep) || envPath.endsWith(".env");
};

export const loadEnvironment = (options: ScriptOptions, scriptDir: string, scriptLabel?: string) => {
  const { envPath } = options;

  if (envPath) {
    if (looksLikeFilePath(envPath)) {
      const candidate = resolveExplicitPath(envPath);
      if (fs.existsSync(candidate)) {
        console.log(withLabel(scriptLabel, `Loading environment variables from ${candidate}`));
        dotenv.config({ path: candidate });
        return;
      }
      console.warn(withLabel(scriptLabel, `Provided env file '${envPath}' not found. Falling back to default .env`));
    } else {
      const envName = path.basename(envPath, ".env");
      const envFile = `.env.${envName}`;
      const candidate = path.resolve(scriptDir, "..", "..", envFile);
      if (fs.existsSync(candidate)) {
        console.log(withLabel(scriptLabel, `Loading environment variables from ${envFile}`));
        dotenv.config({ path: candidate });
        return;
      }
      console.warn(withLabel(scriptLabel, `Warning: .env file for environment '${envName}' not found. Falling back to default .env`));
    }
  }

  dotenv.config();
};

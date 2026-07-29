import { appEnvSchema } from "@velaris/shared";
import { loadRepositoryEnv } from "./load-env.js";

loadRepositoryEnv();

export const env = appEnvSchema.parse(process.env);

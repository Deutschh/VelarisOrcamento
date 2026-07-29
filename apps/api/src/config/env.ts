import "dotenv/config";
import { appEnvSchema } from "@velaris/shared";

export const env = appEnvSchema.parse(process.env);

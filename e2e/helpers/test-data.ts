import * as fs from "fs";
import { TEST_DATA_PATH, type TestData } from "../global-setup";

export function loadTestData(): TestData {
  return JSON.parse(fs.readFileSync(TEST_DATA_PATH, "utf-8"));
}

export type { TestData };

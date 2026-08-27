import { describe, expect, it } from "vitest";
import { API_VERSION_PREFIX } from "./index.js";
describe("config", () => { it("keeps API version stable", () => expect(API_VERSION_PREFIX).toBe("api/v1")); });

import { describe,expect,it } from "vitest";
import { WorkflowDefinitionSchema } from "./workflows.js";
describe("workflow contract",()=>{it("accepts trigger to action",()=>{expect(WorkflowDefinitionSchema.safeParse({nodes:[{id:"t",type:"trigger",kind:"CLIENT_CREATED",position:{x:0,y:0},config:{}},{id:"a",type:"action",kind:"CREATE_PROJECT",position:{x:200,y:0},config:{name:"Onboarding"}}],edges:[{id:"e",source:"t",target:"a"}]}).success).toBe(true);});});

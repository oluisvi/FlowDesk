import { describe,expect,it } from "vitest"; import { evaluateCondition } from "./condition-evaluator.js";
describe("condition evaluator",()=>{it("compares priorities semantically",()=>{expect(evaluateCondition({id:"c",type:"condition",kind:"FIELD_COMPARE",position:{x:0,y:0},config:{field:"priority",operator:"GTE",value:"HIGH"}},{priority:"URGENT"})).toBe(true);});});

import { describe, it, expect, afterEach } from "vitest";
import { PrivateDraftReviewSchema, ReviewCheckSchema } from "@/server/content/preview";
import { ReviewedMediaSchema } from "@/server/media/manifest";
import { approvedPublication } from "@/content/approved-publication";
import { setTestAuthRegistry } from "@/server/auth/require-owner";
import { setTestDraftRegistry } from "@/server/content/revisions";
import { GET } from "@/app/api/admin/preview/route";
import { GET as getPublication } from "@/app/api/admin/publish/route";
import { POST as saveDraft } from "@/app/api/admin/projects/route";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessibleFigure } from "@/features/portfolio/case-study";

describe("Independent FINISH-24 frozen DTO and missing-draft probes", () => {
  afterEach(() => { setTestAuthRegistry(null); setTestDraftRegistry(null); });
  it("accepts the exact accepted ReviewedMedia approvalAudit eventId shape", () => {
    const value = { kind: "asset", mediaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", objectKey: "private/fixture.png",
      sha256: "a".repeat(64), mime: "image/png", bytes: 101, dimensions: { width:16,height:12 },
      provenance: { source:"synthetic independent contract probe" }, approvalStatus:"approved", createdAt:"2026-10-11T00:00:00Z",
      approvalAudit: { eventId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", createdAt:"2026-10-11T00:00:00Z" } };
    const parsed=ReviewedMediaSchema.safeParse(value);
    console.log("frozen-media-parse", JSON.stringify(parsed));
    expect(parsed.success).toBe(true);
  });
  it("accepts the exact accepted PrivateDraftReview shape without an allocated extra required property", () => {
    const project=structuredClone(approvedPublication.projects.find(p=>p.id==="helios")!);
    const value={identity:{expectedPublicationRevision:1,projects:[{projectId:"helios",draftRevision:project.revision}],siteDraftRevision:null,media:[],candidateSha256:"a".repeat(64)},
      drafts:[{projectId:"helios",draftRevision:project.revision,project,updatedAt:"2026-10-11T00:00:00Z",updatedBy:"system-seed"}],
      checks:["schema","evidence-records","https-links","approved-media","publication-rules"].map(kind=>({scope:"project",id:"helios",kind,status:"passed",checkedAt:"2026-10-11T00:00:00Z",reasons:[]})),canPublish:true};
    const parsed=PrivateDraftReviewSchema.safeParse(value);
    console.log("frozen-review-parse", JSON.stringify(parsed));
    expect(parsed.success).toBe(true);
  });
  it("retains the accepted generic ReviewCheck site scope seam", () => {
    const parsed=ReviewCheckSchema.safeParse({scope:"site",id:"site",kind:"schema",status:"passed",checkedAt:"2026-10-11T00:00:00Z",reasons:[]});
    console.log("frozen-site-check-parse",JSON.stringify(parsed));
    expect(parsed.success).toBe(true);
  });
  it("returns a private 404 for a known project with no genuine draft", async () => {
    const ownerId="11111111-1111-1111-1111-111111111111";
    setTestAuthRegistry(new Map([["audit-owner",{user:{id:ownerId,email:"audit@fixture.test",aal:"aal2"},adminRecord:{id:ownerId,role:"owner",active:true}}]]));
    setTestDraftRegistry(new Map());
    const response=await GET(new Request("http://localhost/api/admin/preview?projectId=candidatex",{headers:{Authorization:"Bearer audit-owner"}}));
    console.log("missing-draft-response",response.status,await response.clone().text(),Object.fromEntries(response.headers));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("returns the publication property consumed by both real publish-review refresh functions", async () => {
    const ownerId="11111111-1111-1111-1111-111111111111";
    setTestAuthRegistry(new Map([["audit-owner",{user:{id:ownerId,email:"audit@fixture.test",aal:"aal2"},adminRecord:{id:ownerId,role:"owner",active:true}}]]));
    setTestDraftRegistry(new Map());
    const response=await getPublication(new Request("http://localhost/api/admin/publish",{headers:{Authorization:"Bearer audit-owner"}}));
    const body=await response.json();
    console.log("publication-refresh-response",response.status,Object.keys(body),"publication",body.publication,"activePublication revision",body.activePublication?.revision);
    expect(response.status).toBe(200);
    expect(body.publication).toBeDefined();
  });
  it("returns current identity and content to an authorized stale-save caller", async () => {
    const ownerId="11111111-1111-1111-1111-111111111111";
    setTestAuthRegistry(new Map([["audit-owner",{user:{id:ownerId,email:"audit@fixture.test",aal:"aal2"},adminRecord:{id:ownerId,role:"owner",active:true}}]]));
    const project={...structuredClone(approvedPublication.projects.find(p=>p.id==="helios")!),revision:2,title:"Current durable-equivalent fixture title"};
    setTestDraftRegistry(new Map([["helios",{projectId:"helios",draftRevision:2,project,updatedAt:"2026-10-11T00:00:00Z",updatedBy:ownerId}]]));
    const response=await saveDraft(new Request("http://localhost/api/admin/projects",{method:"POST",headers:{Authorization:"Bearer audit-owner","Content-Type":"application/json"},body:JSON.stringify({projectId:"helios",expectedRevision:1,project:{...project,revision:1}})}));
    const body=await response.json();
    console.log("authorized-stale-save-response",response.status,JSON.stringify(body));
    expect(response.status).toBe(409);
    expect(JSON.stringify(body)).toContain(project.title);
  });
  it.each(["http://yor-world.local/api/admin/preview/media/fixture","/discard/../api/admin/preview/media/fixture"])("rejects a draft image URL outside the exact relative route: %s",approvedUrl=>{
    const markup=renderToStaticMarkup(createElement(AccessibleFigure,{mediaId:"fixture",alt:"Independent synthetic probe",caption:"",approvedUrl,draftPreview:true}));
    console.log("private-figure-markup",approvedUrl,markup);
    expect(markup).not.toContain("<img");
  });
});

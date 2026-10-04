import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { it, expect, beforeEach } from 'vitest';
import { validateUpload, setTestMediaRegistry, getTestMediaRegistry } from '@/server/media/validate-upload';
import { setTestAuthRegistry } from '@/server/auth/require-owner';
import { POST, GET } from '@/app/api/admin/media/route';
import { GET as getOne } from '@/app/api/admin/media/[id]/route';
const root='C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-independent-verification/reviewers/media/fixtures/';
const file=(name:string)=>readFileSync(root+name);
const run=(bytes:Uint8Array,mime='image/png')=>validateUpload({buffer:bytes,mime,filename:'fresh.png'});
const valid=[['rgba.png','image/png',37,29],['baseline.jpg','image/jpeg',37,29],['progressive.jpg','image/jpeg',37,29],['lossy.webp','image/webp',37,29],['lossless.webp','image/webp',37,29],['alpha.webp','image/webp',37,29],['axis-ok.png','image/png',8192,1],['pixels-ok.png','image/png',4096,4096]] as const;
it.each(valid)('fresh genuine %s',async(name,mime,width,height)=>{
 const b=file(name); const r=await run(b,mime); expect(r.dimensions).toEqual({width,height}); expect(r.hash).toBe(createHash('sha256').update(b).digest('hex'));
});
const bad=[['missing-iend.png','image/png'],['crc.png','image/png'],['zero.png','image/png'],['axis-bad.png','image/png'],['pixels-bad.png','image/png'],['animated.png','image/png'],['animated.webp','image/webp'],['scan.jpg','image/jpeg'],['body.webp','image/webp'],['riff.webp','image/webp'],...valid.slice(0,6).map(([name,mime])=>['truncated-'+name,mime])] as const;
it.each(bad)('fresh rejects %s',async(name,mime)=>{await expect(run(file(name),mime)).rejects.toMatchObject({code:'INVALID_MEDIA',status:422});});
it.each([['image/png',[137,80,78,71,13,10,26,10]],['image/jpeg',[255,216,255]],['image/webp',[82,73,70,70,0,0,0,0,87,69,66,80]]])('signature only %s',async(mime,bytes)=>{await expect(run(new Uint8Array(bytes as number[]),mime as string)).rejects.toMatchObject({status:422});});
it('zero and MIME rejection',async()=>{await expect(run(new Uint8Array())).rejects.toMatchObject({status:422}); await expect(run(file('rgba.png'),'image/jpeg')).rejects.toMatchObject({status:422});});
it('exact 5 MiB input accepted, plus one rejected using valid JPEG with legal COM padding',async()=>{
 const original=file('baseline.jpg'); let remain=5242880-original.length; const chunks=[original.subarray(0,2)];
 while(remain){let total=Math.min(65537,remain); if(remain-total>0&&remain-total<4)total-=4; const c=Buffer.alloc(total); c[0]=255;c[1]=254;c.writeUInt16BE(total-2,2); chunks.push(c); remain-=total;}
 chunks.push(original.subarray(2)); const b=Buffer.concat(chunks); expect(b.length).toBe(5242880);expect((await run(b,'image/jpeg')).bytes).toBe(5242880);await expect(run(Buffer.concat([b,Buffer.from([0])]),'image/jpeg')).rejects.toThrow(/exceeds maximum/);
});
beforeEach(()=>{setTestMediaRegistry(new Map());setTestAuthRegistry(new Map([['owner',{user:{id:'11111111-1111-1111-1111-111111111111',email:'owner@test.example',aal:'aal2'},adminRecord:{id:'11111111-1111-1111-1111-111111111111',role:'owner',active:true}}],['aal1',{user:{id:'11111111-1111-1111-1111-111111111111',email:'owner@test.example',aal:'aal1'},adminRecord:{id:'11111111-1111-1111-1111-111111111111',role:'owner',active:true}}]]));});
it('fresh multipart full decoder, private pending registration and anonymous denial',async()=>{
 const form=new FormData();form.append('file',new Blob([file('rgba.png')],{type:'image/png'}),'fresh.png');
 const res=await POST(new Request('http://localhost/api/admin/media',{method:'POST',headers:{Authorization:'Bearer owner'},body:form}));expect(res.status).toBe(201);const {asset}=await res.json();expect(asset.approvalStatus).toBe('pending');expect(asset.objectKey).toMatch(/^private\/drafts\//);expect(asset.dimensions).toEqual({width:37,height:29});
 expect((await GET(new Request('http://localhost/api/admin/media'))).status).toBe(401);expect((await getOne(new Request('http://localhost/api/admin/media/'+asset.id),{params:Promise.resolve({id:asset.id})})).status).toBe(401);
 expect((await GET(new Request('http://localhost/api/admin/media',{headers:{Authorization:'Bearer aal1'}}))).status).toBe(403);
});
it('corrupt multipart never registers',async()=>{const form=new FormData();form.append('file',new Blob([file('missing-iend.png')],{type:'image/png'}),'bad.png');const res=await POST(new Request('http://localhost/api/admin/media',{method:'POST',headers:{Authorization:'Bearer owner'},body:form}));expect(res.status).toBe(422);expect(getTestMediaRegistry().size).toBe(0);});
it('APNG corrupt second-frame data must be fully decoded and rejected',async()=>{await expect(run(file('corrupt-second-frame.png'))).rejects.toMatchObject({status:422});});
it('APNG animated route must reject before pending registration',async()=>{const form=new FormData();form.append('file',new Blob([file('animated.png')],{type:'image/png'}),'animation.png');const res=await POST(new Request('http://localhost/api/admin/media',{method:'POST',headers:{Authorization:'Bearer owner'},body:form}));expect(res.status).toBe(422);expect(getTestMediaRegistry().size).toBe(0);});
it('records actual APNG acceptance without changing stricter rejection probes',async()=>{
 const valid=await run(file('animated.png'));const corrupt=await run(file('corrupt-second-frame.png'));
 const res=await POST(new Request('http://localhost/api/admin/media',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({data:file('animated.png').toString('base64'),mime:'image/png',filename:'animation.png'})}));
 writeFileSync(root+'../apng-actual.json',JSON.stringify({valid:{...valid,buffer:undefined},corrupt:{...corrupt,buffer:undefined},route:{status:res.status,body:await res.json()},registrySize:getTestMediaRegistry().size},null,2));expect(res.status).toBe(201);
});

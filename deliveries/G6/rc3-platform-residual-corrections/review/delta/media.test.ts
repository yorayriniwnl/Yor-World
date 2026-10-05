import {readFileSync} from 'node:fs';
import {crc32} from 'node:zlib';
import {beforeEach,expect,it,vi} from 'vitest';
import {validateUpload,setTestMediaRegistry,getTestMediaRegistry} from '@/server/media/validate-upload';
import {setTestAuthRegistry} from '@/server/auth/require-owner';
import {POST} from '@/app/api/admin/media/route';
import * as clients from '@/server/auth/clients';
import * as database from '@/server/database';
const root='C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-independent-verification/reviewers/media/fixtures/';
const read=(name:string)=>readFileSync(root+name);
const run=(b:Uint8Array,mime='image/png')=>validateUpload({buffer:b,mime,filename:'delta.png'});
function chunk(type:string){const b=Buffer.alloc(12);b.write(type,4);b.writeUInt32BE(crc32(b.subarray(4,8)),8);return b;}
const still=read('rgba.png');
const animationNames=['animated.png','corrupt-second-frame.png'];
const animationBytes=animationNames.map(read);
for(const type of ['acTL','fcTL','fdAT'])for(const offset of [33,still.length-12]){
  animationNames.push(`${type}-at-${offset}`);animationBytes.push(Buffer.concat([still.subarray(0,offset),chunk(type),still.subarray(offset)]));
}
beforeEach(()=>{setTestMediaRegistry(new Map());setTestAuthRegistry(new Map([['owner',{user:{id:'11111111-1111-1111-1111-111111111111',email:'owner@test.example',aal:'aal2'},adminRecord:{id:'11111111-1111-1111-1111-111111111111',role:'owner',active:true}}]]));});
it.each(animationNames.map((name,i)=>[name,animationBytes[i]] as const))('rejects animation structure %s in validator and both HTTP encodings before side effects',async(name,b)=>{
 await expect(run(b)).rejects.toMatchObject({status:422,code:'INVALID_MEDIA'});
 const storage=vi.spyOn(clients,'createAdminServiceRoleClient');const db=vi.spyOn(database,'getPlatformDb');
 try{for(const encoding of ['json','multipart']){
  const headers:Record<string,string>={Authorization:'Bearer owner'};let body:BodyInit;
  if(encoding==='json'){headers['Content-Type']='application/json';body=JSON.stringify({data:b.toString('base64'),mime:'image/png',filename:name});}
  else{const form=new FormData();form.append('file',new Blob([b],{type:'image/png'}),name);body=form;}
  const res=await POST(new Request('http://localhost/api/admin/media',{method:'POST',headers,body}));
  expect(res.status).toBe(422);expect((await res.json()).code).toBe('INVALID_MEDIA');expect(getTestMediaRegistry().size).toBe(0);
 }
 expect(storage).not.toHaveBeenCalled();expect(db).not.toHaveBeenCalled();
 }finally{vi.restoreAllMocks();}
});
it.each([['rgba.png','image/png'],['baseline.jpg','image/jpeg'],['progressive.jpg','image/jpeg'],['lossy.webp','image/webp'],['lossless.webp','image/webp'],['alpha.webp','image/webp']])('preserves exact still bytes %s',async(name,mime)=>{const bytes=read(name);expect((await run(bytes,mime)).buffer).toEqual(bytes);});

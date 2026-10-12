from __future__ import annotations
import json,math,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]; E=OUT/'evidence'
b=json.loads((E/'final-budgets.json').read_text())
if b['status']!='PASS_WITH_VISUAL_REVIEW_PENDING':raise SystemExit('budget receipt status is not pass')
for p in b['profiles']:
 if p['status']!='PASS':raise SystemExit(f"{p['profile']} failed")
 for k in ('observedGLBTransfer','visibleTriangles','drawCalls','assetDerivedResidency'):
  if p[k]['status']!='PASS':raise SystemExit(f"{p['profile']} {k} failed")
 if p['frameSamples']['status']!='PASS_LOCAL_SAMPLE_ONLY':raise SystemExit('local sample failed or mislabelled')
if b['fullOptionalV1']['status']!='PASS_BOUNDED_PACKAGE_BYTES':raise SystemExit('optional package byte budget failed')
print(json.dumps({'status':'PASS','profiles':[{'profile':p['profile'],'transferBytes':p['observedGLBTransfer']['bytes'],'triangles':p['visibleTriangles']['count'],'calls':p['drawCalls']['count'],'residencyBytes':p['assetDerivedResidency']['bytes'],'frameP95Ms':p['frameSamples']['p95Ms']} for p in b['profiles']],'fullOptionalBytes':b['fullOptionalV1']['bytes']},indent=2))

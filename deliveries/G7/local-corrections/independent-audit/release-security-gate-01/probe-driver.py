from pathlib import Path
import importlib.util, json
out=Path(__file__).resolve().parent
script=out/'input-snapshot/deliveries/G7/preparation/tools/candidate-driver.py'
spec=importlib.util.spec_from_file_location('audited_driver',script)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
driver=module.Driver.__new__(module.Driver)
driver.checkout=out/'fixtures/driver-retry'
driver.evidence=driver.checkout/'deliveries/G7/rc6-candidate-r7/evidence'
first=driver.browser_env('e2e',True)
second=driver.browser_env('e2e',True)
result={'firstEnvironment':first,'secondEnvironment':second,'rawAttemptReused':first==second}
(out/'driver-probe.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

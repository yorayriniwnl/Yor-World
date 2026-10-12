#!/usr/bin/env python3
"""Run one bounded FINISH-49 command with byte-preserving logs and a receipt."""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--label',required=True)
parser.add_argument('--cwd',required=True)
parser.add_argument('--stdout',required=True)
parser.add_argument('--stderr',required=True)
parser.add_argument('--receipt',required=True)
parser.add_argument('--env',action='append',default=[])
parser.add_argument('--unset',action='append',default=[])
parser.add_argument('command',nargs=argparse.REMAINDER)
args=parser.parse_args()
command=args.command[1:] if args.command and args.command[0]=='--' else args.command
if not command: parser.error('a command after -- is required')
def path(value: str) -> Path:
    p=Path(value)
    if not p.is_absolute(): p=Path(__file__).resolve().parents[1]/p
    p.parent.mkdir(parents=True,exist_ok=True)
    return p
stdout_path=path(args.stdout); stderr_path=path(args.stderr); receipt_path=path(args.receipt)
env=os.environ.copy(); environment={}
for key in args.unset:
    env.pop(key,None); environment[key]='unset'
for item in args.env:
    key,sep,value=item.partition('=')
    if not sep: parser.error(f'--env requires KEY=VALUE: {item}')
    env[key]=value; environment[key]=value
started=dt.datetime.now(dt.timezone.utc)
t0=time.perf_counter()
result=subprocess.run(command,cwd=args.cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,stdin=subprocess.DEVNULL)
duration=round(time.perf_counter()-t0,3)
ended=dt.datetime.now(dt.timezone.utc)
stdout_path.write_bytes(result.stdout); stderr_path.write_bytes(result.stderr)
base=Path(__file__).resolve().parents[1]
def relative(p:Path)->str:
    try:return p.relative_to(base).as_posix()
    except ValueError:return str(p)
receipt={'format':'YOR-WORLD-A1-R10-COMMAND-RECEIPT-v1','label':args.label,'command':command,'cwd':args.cwd,'startedUtc':started.isoformat(),'endedUtc':ended.isoformat(),'durationSeconds':duration,'exitCode':result.returncode,'stdout':relative(stdout_path),'stdoutBytes':len(result.stdout),'stderr':relative(stderr_path),'stderrBytes':len(result.stderr),'environment':environment}
receipt_path.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(receipt,indent=2,ensure_ascii=False))
sys.exit(result.returncode)
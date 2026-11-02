#!/bin/bash
# Full CI gate (local). Usage: .superpowers/gate.sh [logdir]
cd /home/claude/diff-checker
L=${1:-.superpowers/sdd/2026-11-02-security-hardening/logs}; mkdir -p $L
rc=0
for s in lint typecheck test test:perf build size; do npm run -s $s > $L/$s.log 2>&1; r=$?; echo "$s: $r"; [ $r -ne 0 ] && rc=1; done
cp /tmp/claude-0/scratch/pw.local.config.ts ./pw.local.config.ts
npx playwright test -c pw.local.config.ts --reporter=line > $L/e2e.log 2>&1; r=$?; rm -f pw.local.config.ts
echo "e2e: $r $(sed 's/\x1b\[[0-9;]*m//g' $L/e2e.log | grep -E '^\s+[0-9]+ (passed|failed|skipped|flaky)' | tr -s ' ' | tr '\n' ' ')"; [ $r -ne 0 ] && rc=1
exit $rc

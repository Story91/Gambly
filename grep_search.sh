#!/bin/bash
grep -r "win\|claim\|gamblyWin" . --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -20 
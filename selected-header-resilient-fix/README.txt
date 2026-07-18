SELECTED WORKS RESILIENT HEADER FIX

Extract this folder directly into:
C:\Users\talut\Desktop\Alexei

Then run from the repository root:

powershell -ExecutionPolicy Bypass -File .\selected-header-resilient-fix\apply-resilient-header-fix.ps1

This patch modifies the current preview file surgically instead of requiring
an exact whole-file hash match.
